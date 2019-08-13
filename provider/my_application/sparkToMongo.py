import datetime
from repository import MongoRepository
# from kafka import KafkaConsumer, SimpleClient
from confluent_kafka import Consumer
import json
import orjson
from bson import json_util
# import logging
# logging.basicConfig(level='DEBUG')

import os

with open('config.json') as json_data_file:
    config = json.load(json_data_file)

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


class SparkToMongo:
    def __init__(self, kafka_server, prediction_topic, golden_topic, measures_topic, competition, configuration):
        self.consumer = Consumer({'group.id': 'spark_measures', 'bootstrap.servers': kafka_server,
                                  'session.timeout.ms': competition.initial_training_time * 10000,
                                  'auto.offset.reset': 'earliest'})
        self.consumer.subscribe([prediction_topic, golden_topic, measures_topic])
        # self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository(_MONGO_HOST)
        self.db_evaluations = self.mongo_repository.client['evaluation_measures']
        self.competition = competition
        self.config = configuration
        self.prediction_topic = prediction_topic
        self.golden_topic = golden_topic
        self.measures_topic = measures_topic
        self.db_data = self.mongo_repository.client['data']

    def process_measures(self, mess):

        db = self.mongo_repository.client['evaluation_measures']
        measures_coll = db['measures']
        message = orjson.loads(mess.value())
        # message = json.loads(str(message), object_hook=json_util.object_hook)
        now = datetime.datetime.now()
        # logging.debug("here4: {}".format(message))

        time_series_instance = {'nb_submissions': message['num_submissions'], 'user_id': int(message['user_id']),
                                'competition_id': message['competition_id'], 'end_date': now,
                                'latency': message['latency'], 'penalized': message['penalized'], 'measures': {},
                                'batch_measures': {},
                                'start_date':
                                    now - datetime.timedelta(seconds=self.competition.predictions_time_interval)}

        fields_to_skip = ['user_id', 'competition_id', 'num_submissions', 'start_date', 'latency', 'penalized']

        for key, value in message.items():

            if key not in fields_to_skip:
                measures = {}
                batch_measures = {}
                new_fields = str(key).replace(" ", "").split("_")
                time_series_instance['measures'][new_fields[1]] = measures
                time_series_instance['batch_measures'][new_fields[1]] = batch_measures
                time_series_instance['measures'][new_fields[1]][new_fields[0]] = message[key]
                time_series_instance['batch_measures'][new_fields[1]][new_fields[0]] = message[key]

        measures_coll.insert_one(time_series_instance)

    def process_predictions(self, mess):
        predictions = self.db_data['predictions_v2']

        prediction = orjson.loads(mess.value())
        # print(type(message), message)
        # message = json.loads(str(message), object_hook=json_util.object_hook)
        predictions.insert_one(prediction)

    def process_golden(self, mess):
        golden = self.db_data['golden_standard']
        message = orjson.loads(mess.value())
        golden.insert_one(message)

    def run(self):
        while True:
            msg = self.consumer.poll(timeout=0)
            if msg is None:
                continue
            if msg.topic() == self.measures_topic:
                self.process_measures(msg)
            elif msg.topic() == self.golden_topic:
                self.process_golden(msg)
            elif msg.topic() == self.prediction_topic:
                self.process_predictions(msg)
            elif msg.error():
                continue
