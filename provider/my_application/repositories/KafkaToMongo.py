from repository import MongoRepository
import orjson
import json
from confluent_kafka import Consumer
import os

with open('./config.json') as json_data_file:
    config = json.load(json_data_file)

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


class ConsumerToMongo:
    consumer = None
    mongo_repository = None

    def __init__(self, kafka_server, topic, competition):
        conf = {'bootstrap.servers': kafka_server, 'group.id': 'data',
                'session.timeout.ms': competition.initial_training_time * 10000,
                'auto.offset.reset': 'earliest'}
        self.consumer = Consumer(conf)
        self.consumer.subscribe([topic])
        self.mongo_repository = MongoRepository(_MONGO_HOST)

    # message must be in byte format
    def write(self):

        db = self.mongo_repository.client['data']
        data = db['data']
        data.create_index([("competition_id", 1)], unique=True)

        while True:
            try:
                msg = self.consumer.poll(timeout=0)
            except Exception as e:
                continue
            if msg is not None:
                message = orjson.loads(msg.value())
                if message['type'] == "DATA":
                    # print('TODO : write to data collection')
                    competition_id = message['competition_id']
                    del message['competition_id']
                    del message['type']
                    del message['tag']
                    data.update({'competition_id': str(competition_id)}, {'$addToSet': {'dataset': message}})
