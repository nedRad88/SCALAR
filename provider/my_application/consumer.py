"""
Copyright 2020 Nedeljko Radulovic, Dihia Boulegane, Albert Bifet

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""


from __future__ import absolute_import
from confluent_kafka import Consumer, Producer
import grpc
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
import logging

logging.basicConfig(level='DEBUG')

"""
Read the environment variables or the config file to define the services:
SQL_HOST: The address of MySQL server
SQL_DBNAME: The name of the MySQL Database
MONGO_HOST: The address of MongoDB server
"""

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


def receive_predictions(predictions, competition_id, user_id, end_date, kafka_producer,
                        spark_topic, targets, stop):

    last_sent_message = datetime.datetime.now()
    while True:
        predictions._state.rpc_errors = []
        try:
            prediction = predictions.next()
            document = orjson.loads(json_format.MessageToJson(prediction))
            submitted_on = datetime.datetime.now()
            document['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
            document['prediction_competition_id'] = competition_id
            document['user_id'] = user_id
            for target in targets:
                document['prediction_' + target] = document[target]
                del document[target]
            kafka_producer.produce(spark_topic, orjson.dumps(document))
            kafka_producer.poll(timeout=0)
            last_sent_message = datetime.datetime.now()
        except Exception as e:
            pass

        seconds_since_last_prediction = (datetime.datetime.now() - last_sent_message).total_seconds()
        if seconds_since_last_prediction > 30:
            logging.debug("Stop receiving")
            break

        if stop():
            logging.debug("Kill Thread")
            break

        now = datetime.datetime.now()
        if now > end_date:
            break


class ProducerToMongoSink:
    daemon = True
    producer = None

    def __init__(self, kafka_server):
        conf = {'bootstrap.servers': kafka_server}
        self.producer = Producer(conf)

    # message must be in byte format
    def send(self, topic, prediction):
        try:
            self.producer.produce(topic, orjson.dumps(prediction))
            self.producer.poll(0)
        except Exception as e:
            print(e)


class DataStreamerServicer:

    def __init__(self, server, competition, competition_config):
        self.server = server
        self.producer = ProducerToMongoSink(server)
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

        self.targets = []

        for key in competition_config.keys():
            y = str(key).replace(' ', '')  # Key
            self.targets.append(y)

        self.__bases__ = (self.DataStreamer,)  # ??

    def sendData(self, request_iterator, context):
        _SUBSCRIPTION_REPO = SubscriptionRepository(_SQL_HOST, _SQL_DBNAME)
        _USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)
        _COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)
        metadata = context.invocation_metadata()
        metadata = dict(metadata)
        token = metadata['authorization']

        user_id = metadata['user_id']
        competition_code = metadata['competition_id']

        user = _USER_REPO.get_user_by_email(user_id)
        if user is None:
            context.set_code(grpc.StatusCode.PERMISSION_DENIED)
            context.set_details('You are not registered, please register on the website')
            return self.file_pb2.Message()

        competition = _COMPETITION_REPO.get_competition_by_code(competition_code)
        if competition is None:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details('Unknown competition, please refer to the website')
            return self.file_pb2.Message()

        # TODO : for Subscription Data
        subscription = _SUBSCRIPTION_REPO.get_subscription(competition.competition_id, user.user_id)
        if subscription is None:
            # TODO : Should close connection
            context.set_code(grpc.StatusCode.PERMISSION_DENIED)
            context.set_details('You are not allowed to participate, please subscribe to the competition on website')
            return self.file_pb2.Message()

        # TODO : check secret token
        decoded_token = decode_subscription_token(token)
        if decoded_token is None:
            print('Wrong token')
            # TODO : should close connection
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details('Please check your authentication credentials, Wrong Token!')
            return self.file_pb2.Message()

        decoded_token = decoded_token[1]

        token_competition_id = decoded_token['competition_id']
        token_user_id = decoded_token['user_id']

        if int(token_competition_id) != int(competition.competition_id) or token_user_id != user_id:
            # TODO : should close channel
            print('Using wrong token for this competition')
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details('Please check your authentication token, the secret key does not match')
            return self.file_pb2.Message()

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
            stop_thread = False
            t = threading.Thread(target=receive_predictions,
                                 kwargs={'predictions': request_iterator,
                                         'competition_id': self.competition.competition_id, 'user_id': user.user_id,
                                         'end_date': end_date, 'kafka_producer': self.kafka_producer,
                                         'spark_topic': self.spark_topic, 'targets': self.targets,
                                         'stop': lambda: stop_thread})
            # use default name
            t.start()
        except Exception as e:
            print(str(e))

        _USER_REPO.cleanup()
        _COMPETITION_REPO.cleanup()
        _SUBSCRIPTION_REPO.cleanup()

        while context.is_active():
            message = consumer.poll(timeout=0)
            if message is None:
                continue
            else:
                try:
                    values = orjson.loads(message.value())
                    json_string = json.dumps(values, default=json_util.default)
                    message = self.file_pb2.Message()
                    final_message = json_format.Parse(json_string, message, ignore_unknown_fields=True)
                    time.sleep(0.01)
                    if context.is_active():
                        yield message
                    else:
                        break
                except Exception as e:
                    pass

            if datetime.datetime.now() > end_date:
                break
        logging.debug("disconnect")
        stop_thread = True
        t.join()
