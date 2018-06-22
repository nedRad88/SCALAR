from kafka import KafkaConsumer, SimpleClient, KafkaProducer
from repository import MongoRepository
import json
from bson import json_util
import datetime


class BaselineToMongo:
    consumer = None
    mongo_repository = None

    def __init__(self, kafka_server, topic, competition, competition_config):

        self.consumer = KafkaConsumer(bootstrap_servers=kafka_server, auto_offset_reset='earliest')
        self.consumer.subscribe(topic)
        self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository('172.22.0.3')
        self.targets = competition_config.keys()
        self.num_records = {}
        self.sum_values = {}
        # for key in competition_config.keys():
        #    field = str(key).replace(" ", "")
        #    self.targets.append(field)
        self.competition_id = competition.competition_id
        self.producer = KafkaProducer(bootstrap_servers=kafka_server)
        self.output_topic = competition.name.lower().replace(" ", "") + 'spark_predictions'

    def write(self):

        db = self.mongo_repository.client['data']
        predictions = db['predictions_v2']
        for target in self.targets:
            self.num_records[target] = 0
            self.sum_values[target] = 0

        for msg in self.consumer:

            message = json.loads(msg.value.decode('utf-8'), object_hook=json_util.object_hook)
            message = json.loads(str(message), object_hook=json_util.object_hook)

            if message['type'] == "DATA" or message['type'] == "GOLDEN":

                if message['tag'] == 'TEST':
                    prediction_dict = {'rowID': message['rowID'], 'competition_id': self.competition_id, 'user_id': 0}
                    for key, value in self.sum_values.items():
                        prediction_dict[key] = float(self.sum_values[key]) / int(self.num_records[key])
                    submitted_on = datetime.datetime.now()
                    prediction_dict['submitted_on'] = submitted_on
                    predictions.insert_one(prediction_dict)
                    del prediction_dict['submitted_on']
                    prediction_dict['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                    self.producer.send(self.output_topic, json.dumps(prediction_dict,
                                                                     default=json_util.default).encode('utf-8'))
                if message['tag'] == 'INIT' or message['tag'] == 'TRAIN':
                    for target in self.targets:
                        self.num_records[target] = self.num_records[target] + 1
                        self.sum_values[target] = self.sum_values[target] + float(message[target])
