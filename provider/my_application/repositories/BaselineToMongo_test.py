# from kafka import KafkaConsumer, SimpleClient, KafkaProducer
from confluent_kafka import Consumer, Producer
from repository import MongoRepository
import json
from bson import json_util
import datetime
import operator
import orjson
from bson.objectid import ObjectId
import os

with open('config.json') as json_data_file:
    config = json.load(json_data_file)

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


class BaselineToMongo:
    consumer = None
    mongo_repository = None

    def __init__(self, kafka_server, topic, competition, competition_config):
        conf = {'bootstrap.servers': kafka_server, 'group.id': 'baseline',
                'session.timeout.ms': competition.initial_training_time * 10000,
                'auto.offset.reset': 'earliest'}
        self.consumer = Consumer(conf)

        # self.consumer = KafkaConsumer(bootstrap_servers=kafka_server, auto_offset_reset='earliest')
        self.consumer.subscribe([topic])
        # self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository(_MONGO_HOST)
        self.config = competition_config
        self.targets = competition_config.keys()
        self.competition_id = competition.competition_id
        conf_producer = {'bootstrap.servers': kafka_server}
        self.producer = Producer(conf_producer)
        # self.producer = KafkaProducer(bootstrap_servers=kafka_server)
        self.output_topic = competition.name.lower().replace(" ", "") + 'predictions'

    def write(self):
        db = self.mongo_repository.client['data']
        predictions = db['predictions_v2']
        regression_targets = []
        classification_targets = []

        for key, value in self.config.items():
            for item in value:
                if item == 'MAPE':
                    regression_targets.append(key)
                elif item == 'F1':
                    classification_targets.append(key)
        target_dict = {}
        num_records = {}
        sum_values = {}

        for target in classification_targets:
            target_dict[target] = {}
        for target in regression_targets:
            num_records[target] = 0
            sum_values[target] = 0
        while True:
            msg = self.consumer.poll(timeout=0)
            message = orjson.loads(msg.value())
            # message = json.loads(str(message), object_hook=json_util.object_hook)
            prediction_dict = {'prediction_rowID': message['rowID'], 'prediction_competition_id': self.competition_id,
                               'prediction_Valeurs': 55555}

            # prediction_dict, num_records, sum_values = self.regression(message,
            #                                                            prediction_dict, num_records, sum_values)
            # prediction_dict, target_dict = self.classification(message, target_dict, prediction_dict)
            if message['tag'] == 'TEST':
                for i in range(0, 100):
                    prediction_dict['user_id'] = i + 100
                    prediction_dict['prediction_Valeurs'] = prediction_dict['prediction_Valeurs'] + prediction_dict['user_id'] * 10
                    submitted_on = datetime.datetime.now()
                    # prediction_dict['submitted_on'] = submitted_on
                    # prediction_dict['_id'] = ObjectId()
                    # predictions.insert_one(prediction_dict)
                    # del prediction_dict['submitted_on']
                    prediction_dict['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                    self.producer.produce(self.output_topic, orjson.dumps(prediction_dict))
                    self.producer.poll(timeout=0)

    @staticmethod
    def regression(message, prediction_dict, num_records, sum_values):

        if message['tag'] == 'TEST':
            for key, value in sum_values.items():
                prediction_dict['prediction_' + key] = float(sum_values[key]) / int(num_records[key])
        if message['tag'] == 'INIT' or message['tag'] == 'TRAIN':
            for target in sum_values.keys():
                num_records[target] = num_records[target] + 1
                sum_values[target] = sum_values[target] + float(message[target])

        return prediction_dict, num_records, sum_values

    @staticmethod
    def classification(message, target_dict, prediction_dict):

        if message['tag'] == 'TEST':
            for target, value in target_dict.items():
                prediction_dict['prediction_' + target] = max(value.items(), key=operator.itemgetter(1))[0]
        if message['tag'] == 'INIT' or message['tag'] == 'TRAIN':
            for target in target_dict.keys():
                if str(message[target]) in target_dict[target]:
                    target_dict[target][str(message[target])] += 1
                else:
                    target_dict[target][str(message[target])] = 1
        return prediction_dict, target_dict
