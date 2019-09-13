from __future__ import absolute_import
from confluent_kafka import Consumer, Producer
import grpc
import sys
import os
import orjson
from repository import MongoRepository
import imp
from google.protobuf import json_format
import datetime
import time
from bson import json_util
import json
import threading
from subscription_auth import decode_subscription_token
from repositories.CompetitionRepository import SubscriptionRepository, UserRepository, CompetitionRepository

with open('config.json') as json_data_file:
    config = json.load(json_data_file)
try:
    _SQL_HOST = os.environ['SQL_HOST']
except Exception:
    _SQL_HOST = config['SQL_HOST']

try:
    _SQL_DBNAME = os.environ['SQL_DBNAME']
except Exception:
    _SQL_DBNAME = config['SQL_DBNAME']
try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


_UPLOAD_REPO = config['UPLOAD_REPO']
_COMPETITION_GENERATED_CODE = config['COMPETITION_GENERATED_CODE']

_SUBSCRIPTION_REPO = SubscriptionRepository(_SQL_HOST, _SQL_DBNAME)
_USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)
_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)


def receive_predictions(predictions, competition_id, user_id, end_date, kafka_producer,
                        spark_topic, targets):
    while True:
        # print("Waiting for predictions")
        now = datetime.datetime.now()
        if now > end_date:
            break
        predictions._state.rpc_errors = []
        try:
            prediction = predictions.next()
            try:
                # Load msg to json
                # print("2. Posle ciscenja greske:", datetime.datetime.now())
                document = orjson.loads(json_format.MessageToJson(prediction))
                # add values to submitted_on, type, competition_id, user_id
                # print("3. Posle citanja poruke:", datetime.datetime.now())
                submitted_on = datetime.datetime.now()
                document['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                document['prediction_competition_id'] = competition_id
                document['user_id'] = user_id
                document['prediction_rowID'] = document['rowID']
                del document['rowID']
                for target in targets:
                    document['prediction_' + target] = document[target]
                    del document[target]
                # Send message to output_topic ???
                # print("4. Posle tagovanja:", datetime.datetime.now())
                kafka_producer.produce(spark_topic, orjson.dumps(document))
                kafka_producer.poll(timeout=0)
                # print("5. Posle slanja u spark:", datetime.datetime.now())
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
        conf = {'bootstrap.servers': kafka_server}
        self.producer = Producer(conf)
        # self.client = SimpleClient(kafka_server)

    # message must be in byte format
    def send(self, topic, prediction):

        try:
            self.producer.produce(topic, orjson.dumps(prediction))
            self.producer.poll(0)
        except Exception as e:
            print(e)
            # self.client.ensure_topic_exists(topic)
            # self.producer.send(topic, orjson.dumps(prediction, default=json_util.default).encode('utf-8'))


class DataStreamerServicer:

    def __init__(self, server, competition, competition_config):
        self.server = server
        self.producer = ProducerToMongoSink(server)  # 172.22.0.2:9092
        self.predictions_producer = ProducerToMongoSink(server)
        conf_producer = {'bootstrap.servers': server}
        self.kafka_producer = Producer(conf_producer)
        self.consumers_dict = {}

        self.repo = MongoRepository(_MONGO_HOST)
        self.competition = competition

        # Defining three topics: input (competition name), output (competition name + predictions)
        # data (competition name + data)
        self.input_topic = competition.name.lower().replace(" ", "")
        self.output_topic = competition.name.lower().replace(" ", "") + 'data'
        self.spark_topic = competition.name.lower().replace(" ", "") + 'predictions'

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

        self.targets = []

        for key in competition_config.keys():
            y = str(key).replace(' ', '')  # Key
            self.targets.append(y)

        self.__bases__ = (self.DataStreamer,)  # ??

    def sendData(self, request_iterator, context):
        # print("Send data invoked")
        # print("Version: ", sys.version)
        metadata = context.invocation_metadata()

        metadata = dict(metadata)
        # print("Metadata: ", metadata)

        token = metadata['authorization']
        # print("Token:", token)

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
        # print("Decoded Token: ", decoded_token)
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

        end_date = self.competition.end_date + 5 * datetime.timedelta(seconds=self.competition.predictions_time_interval)

        if user_id in self.consumers_dict:
            consumer = self.consumers_dict[user_id]
        else:
            consumer = Consumer({'group.id': user_id, 'bootstrap.servers': self.server,
                                 'session.timeout.ms': competition.initial_training_time * 10000,
                                 'auto.offset.reset': 'latest'})  # 172.22.0.2:9092
            consumer.subscribe([self.input_topic])
            self.consumers_dict[user_id] = consumer

        try:
            t = threading.Thread(target=receive_predictions,
                                 kwargs={'predictions': request_iterator,
                                         'competition_id': self.competition.competition_id, 'user_id': user.user_id,
                                         'end_date': end_date, 'kafka_producer': self.kafka_producer,
                                         'spark_topic': self.spark_topic, 'targets': self.targets})
            # use default name
            t.start()
        except Exception as e:
            print(str(e))

        while True:
            message = consumer.poll(timeout=0)
            if message is None:
                continue
            else:
                try:
                    values = orjson.loads(message.value())
                    json_string = json.dumps(values, default=json_util.default)
                    message = self.file_pb2.Message()
                    final_message = json_format.Parse(json_string, message, ignore_unknown_fields=True)

                    yield message
                except Exception as e:
                    pass

            if datetime.datetime.now() > end_date:
                break
