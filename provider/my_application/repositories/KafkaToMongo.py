from kafka import KafkaConsumer, KafkaProducer, SimpleClient
import repository
from repository import MongoRepository
import json
import bson
from bson import json_util
import os
with open('config.json') as json_data_file:
    config = json.load(json_data_file)

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


class ConsumerToMongo:
    consumer = None
    mongo_repository = None

    def __init__(self, kafka_server, topic):

        self.consumer = KafkaConsumer(bootstrap_servers=kafka_server, auto_offset_reset='earliest')
        self.consumer.subscribe(topic)
        self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository(_MONGO_HOST)
        # print (topic)

    # message must be in byte format
    def write(self, dbname):

        db = self.mongo_repository.client['data']
        predictions = db['predictions_v2']
        data = db['data']
        golden_standard = db['golden_standard']

        # predictions.create_index( [("competition_id", 1), ("user_id", 1)], unique=True)
        data.create_index([("competition_id", 1)], unique=True)

        for msg in self.consumer:

            # print(msg)
            # print(type(msg.value))
            message = json.loads(msg.value.decode('utf-8'), object_hook=json_util.object_hook)
            message = json.loads(str(message), object_hook=json_util.object_hook)
            # print(type(message))
            # print(type(message) , message)
            # print('\n\n')

            if message['type'] == "PREDICT":

                # print('PREDICT' , message)
                try:
                    del message['type']

                    # predictions.update({ '$and': [ { 'competition_id':str(competition_id)}, { 'user_id': str(user_id) } ] }, {'$addToSet': {'predictions': message}})
                    predictions.insert_one(message)
                except Exception as e:
                    print(str(e))
                    print('\n')

            elif message['type'] == "DATA":
                # self.mongo_repository.insert_document(dbname, 'data', message)
                # print('TODO : write to data collection')

                competition_id = message['competition_id']

                del message['competition_id']
                del message['type']
                del message['tag']

                # print(message)
                data.update({'competition_id': str(competition_id)}, {'$addToSet': {'dataset': message}})

            # It's golden standard
            elif message['type'] == 'GOLDEN':

                del message['type']
                del message['tag']
                golden_standard.insert_one(message)

            else:
                print('Error unknown message type')
