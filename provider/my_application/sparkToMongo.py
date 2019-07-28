import datetime
from repository import MongoRepository
from kafka import KafkaConsumer, SimpleClient
import json
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
    def __init__(self, kafka_server, topic, competition, config):
        self.consumer = KafkaConsumer(bootstrap_servers=kafka_server, auto_offset_reset='earliest')
        self.consumer.subscribe(topic)
        self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository(_MONGO_HOST)
        self.db_evaluations = self.mongo_repository.client['evaluation_measures']
        self.competition = competition
        self.config = config

    def write(self):

        for msg in self.consumer:
            message = json.loads(msg.value.decode('utf-8'), object_hook=json_util.object_hook)
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

            self.db_evaluations.measures.insert_one(time_series_instance)
