# from __future__ import absolute_import
from kafka import KafkaConsumer, KafkaProducer, SimpleClient
import time
import csv
import grpc
import sys
import os
import datetime
from importlib.machinery import SourceFileLoader
from repository import MongoRepository
import json
import imp
from google.protobuf import json_format
import datetime
from bson import json_util
import json
import bson
import threading
import copy
import itertools
from subscription_auth import decode_subscription_token
from repositories.CompetitionRepository import Subscription, SubscriptionRepository, User, UserRepository, Competition, \
    CompetitionRepository

with open('config.json') as json_data_file:
    config = json.load(json_data_file)

_SQL_HOST = config['SQL_HOST']
_SQL_DBNAME = config['SQL_DBNAME']
_UPLOAD_REPO = config['UPLOAD_REPO']
_COMPETITION_GENERATED_CODE = config['COMPETITION_GENERATED_CODE']

_SUBSCRIPTION_REPO = SubscriptionRepository(_SQL_HOST, _SQL_DBNAME)
_USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)
_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)


def receive_predictions(producer, predictions, competition_id, user_id, output_topic, end_date, kafka_producer,
                        spark_topic):
    # print("Predictions type: ", type(predictions))
    while True:
        # for prediction in predictions:
        # print("Waiting for predictions")
        now = datetime.datetime.now()
        if now > end_date:
            break
        predictions._state.rpc_errors = []
        try:
            prediction = predictions.next()
            # print("Prediction", prediction)
            try:
                # print(prediction)
                # Load msg to json
                document = json.loads(json_format.MessageToJson(prediction), object_hook=json_util.object_hook)
                # add values to submitted_on, type, competition_id, user_id
                submitted_on = datetime.datetime.now()
                document['submitted_on'] = submitted_on
                document['type'] = "PREDICT"
                document['competition_id'] = competition_id
                document['user_id'] = user_id
                # print(document)
                # Send message to output_topic ???
                producer.send(output_topic, json.dumps(document, default=json_util.default))
                del document['submitted_on']
                del document['type']
                document['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                kafka_producer.send(spark_topic, json.dumps(document, default=json_util.default).encode('utf-8'))
                # send to Spark Streaming
            except Exception as e:
                sys.stderr.write(str(e))
                pass
        except Exception as e:
            pass


class ProducerToMongoSink:
    daemon = True
    producer = None

    def __init__(self, kafka_server):
        self.producer = KafkaProducer(bootstrap_servers=kafka_server)
        self.client = SimpleClient(kafka_server)

    # message must be in byte format
    def send(self, topic, prediction):

        try:
            self.producer.send(topic, json.dumps(prediction, default=json_util.default).encode('utf-8'))
        except Exception as e:
            self.client.ensure_topic_exists(topic)
            self.producer.send(topic, json.dumps(prediction, default=json_util.default).encode('utf-8'))


def consume_stream(consumer, producer, competition, output_topic, target, watchers):
    test_batch = []
    train_batch = []

    for message in consumer:
        # print("Consume stream started!")
        target.insert(0, message)
        # print("Message in consumer:", message)
        for watcher in watchers:
            watcher.insert(0, message)
        # read message.value
        values = json.loads(message.value.decode('utf-8'), object_hook=json_util.object_hook)
        # print(values)
        # Create dictionary object_message from values
        object_message = {}
        for key, value in values.items():
            object_message[key.replace(' ', '')] = value
        # add competition_id key-value pair to object_message
        object_message['competition_id'] = competition.competition_id
        # print("Object message: ", object_message)

        # try :
        if 'tag' in object_message:
            if object_message['tag'] == 'INIT':
                # If initial batch add type data
                object_message['type'] = 'DATA'
                # send to output_topic / to mongo collection data ?
                producer.send(output_topic, json.dumps(object_message, default=json_util.default))
                # print("Output topic", output_topic)

            elif object_message['tag'] == 'TEST':
                # If message from test batch - append to test_batch
                # print ('test' , object_message)
                test_batch.append(object_message)

            elif object_message['tag'] == 'TRAIN':
                # If message from train batch - append to train_batch
                train_batch.append(object_message)
                # If batch size has been reached
                if len(train_batch) == competition.batch_size:

                    for test, train in zip(test_batch, train_batch):

                        for key, value in train.items():
                            if key != 'rowID' and key != 'tag':
                                # Everything that has key different from: rowID and tag, add to test
                                test[key] = value
                        # add type = data to test
                        test['type'] = 'DATA'
                        # send to output topic, mongo??
                        producer.send(output_topic, json.dumps(test, default=json_util.default))
                        # print('test', test)
                        train['Deadline'] = test['Deadline']
                        # add type golden to train - has true value
                        train['type'] = 'GOLDEN'
                        # send to output topic, mongo??
                        producer.send(output_topic, json.dumps(train, default=json_util.default))
                        # print('golden', train)

                    train_batch = []
                    test_batch = []
            else:
                print('unknown message tag ')
        else:
            print(object_message)


class DataStreamerServicer:
    daemon = True
    consumer = None
    stream = []

    def __init__(self, server, competition):

        self.consumer = KafkaConsumer(bootstrap_servers=server, auto_offset_reset='earliest')  # 172.22.0.2:9092
        self.producer = ProducerToMongoSink(server)  # 172.22.0.2:9092
        self.kafka_producer = KafkaProducer(bootstrap_servers=server)

        self.repo = MongoRepository('172.22.0.3')
        self.competition = competition

        # Defining three topics: input (competition name), output (competition name + predictions)
        # data (competition name + data)
        self.input_topic = competition.name.lower().replace(" ", "")
        self.output_topic = competition.name.lower().replace(" ", "") + 'predictions'
        self.data_topic = competition.name.lower().replace(" ", "") + 'data'
        self.spark_topic = competition.name.lower().replace(" ", "") + 'spark_predictions'

        self.watchers = []
        self.consumer.subscribe(self.input_topic)

        try:
            # create data_object dictionary with following fields: competition_id, dataset
            data_object = {}
            data_object['competition_id'] = str(self.competition.competition_id)
            data_object['dataset'] = []
            # Insert document in mongo repository with db name: data, collection name: data
            self.repo.insert_document('data', 'data', data_object)
            # self.repo.insert_document('data', 'golden_standard', data_object)
        except Exception as e:
            pass

        # Import the right gRPC module
        # file_path: ../local/data/uploads/competition_generated_code/competition_name -> file_pb2.py
        pb2_file_path = os.path.join(_UPLOAD_REPO, _COMPETITION_GENERATED_CODE, self.competition.name, 'file_pb2.py')
        # grpc file path: ../local/data/uploads/competition_generated_code/competition_name -> file_pb2_grpc.py
        pb2_grpc_file_path = os.path.join(_UPLOAD_REPO, _COMPETITION_GENERATED_CODE, self.competition.name,
                                          'file_pb2_grpc.py')

        # import parent modules
        self.file_pb2 = imp.load_source('file_pb2', pb2_file_path)
        self.file_pb2_grpc = imp.load_source('file_pb2_grpc', pb2_grpc_file_path)

        # import classes
        self.DataStreamer = imp.load_source('file_pb2_grpc.DataStreamerServicer', pb2_grpc_file_path)
        self.Message = imp.load_source('file_pb2.Message', pb2_file_path)
        # print("Datastreamer: Imported: ", self.DataStreamer)

        self.__bases__ = (self.DataStreamer,)  # ??

        t = threading.Thread(target=consume_stream,
                             args=(self.consumer, self.producer, self.competition, self.output_topic,
                                   self.stream, self.watchers))
        t.start()

    def sendData(self, request_iterator, context):
        # print("Send data invoked")
        # print("Version: ", sys.version)
        metadata = context.invocation_metadata()

        metadata = dict(metadata)
        print("Metadata: ", metadata)

        token = metadata['authorization']
        print("Token:", token)

        user_id = metadata['user_id']
        competition_code = metadata['competition_id']
        # token = metadata['secret']

        # print('infos', competition_code, user_id, token)

        user = _USER_REPO.get_user_by_email(user_id)

        competition = _COMPETITION_REPO.get_competition_by_code(competition_code)
        # TODO : for Subscription Data
        subscription = _SUBSCRIPTION_REPO.get_subscription(competition.competition_id, user.user_id)
        if subscription is None:
            print('Wrong subscription')
            # TODO : Should close connection

        # TODO : check secret token
        decoded_token = decode_subscription_token(token)
        print("Decoded Token: ", decoded_token)
        if decoded_token is None:
            print('Wrong token')
            # TODO : should close connection
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details('Please check your authentication credentials, Wrong Token !')
            yield self.file_pb2.Message()

        decoded_token = decoded_token[1]
        # print("Token", decoded_token)

        token_competition_id = decoded_token['competition_id']
        token_user_id = decoded_token['user_id']

        if int(token_competition_id) != int(competition.competition_id) or token_user_id != user_id:
            # TODO : should close channel
            print('using wrong token for this competition')
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details('Please check your authentication token, the secret does not match')
            yield self.file_pb2.Message()

        end_date = self.competition.end_date + 2 * datetime.timedelta(seconds=self.competition.predictions_time_interval)

        try:
            t = threading.Thread(target=receive_predictions,
                                 kwargs={'producer': self.producer, 'predictions': request_iterator,
                                         'competition_id': self.competition.competition_id, 'user_id': user.user_id,
                                         'output_topic': self.output_topic, 'end_date': end_date,
                                         'kafka_producer': self.kafka_producer, 'spark_topic': self.spark_topic})
            # use default name

            t.start()
        except Exception as e:
            print(str(e))

        messages = list(self.stream)
        # print("Messages length: ", len(messages))
        self.watchers.append(messages)

        while True:
            # print("Messages:", messages)
            now = datetime.datetime.now()
            if now > end_date:
                break
            try:
                msg = messages.pop()

                # try:

                values = json.loads(msg.value.decode('utf-8'), object_hook=json_util.object_hook)

                message = self.file_pb2.Message()

                object_message = {}

                for key, value in values.items():
                    object_message[key.replace(' ', '')] = value

                object_message['competition_id'] = str(self.competition.competition_id)
                object_message['user_id'] = str(user_id)

                if 'Deadline' in object_message:
                    object_message['Deadline'] = str(object_message['Deadline'])
                if 'Released' in object_message:
                    object_message['Released'] = str(object_message['Released'])

                json_string = json.dumps(object_message, default=json_util.default)

                final_message = json_format.Parse(json_string, message, ignore_unknown_fields=True)

                # print('Message', message)

                yield message

                """except Exception as e:

                    print(str(e))"""

            except Exception as e:
                if str(e) != 'pop from empty list':
                    print(str(e))
                pass
