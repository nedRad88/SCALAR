from kafka import KafkaConsumer, SimpleClient, KafkaProducer
from repository import MongoRepository
import json
from bson import json_util
import datetime
import operator


class BaselineToMongo:
    consumer = None
    mongo_repository = None

    def __init__(self, kafka_server, topic, competition, competition_config):

        self.consumer = KafkaConsumer(bootstrap_servers=kafka_server, auto_offset_reset='earliest')
        self.consumer.subscribe(topic)
        self.client = SimpleClient(kafka_server)
        self.mongo_repository = MongoRepository('172.22.0.3')
        self.config = competition_config
        self.targets = competition_config.keys()
        self.competition_id = competition.competition_id
        self.producer = KafkaProducer(bootstrap_servers=kafka_server)
        self.output_topic = competition.name.lower().replace(" ", "") + 'spark_predictions'

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

        for msg in self.consumer:
            message = json.loads(msg.value.decode('utf-8'), object_hook=json_util.object_hook)
            # message = json.loads(str(message), object_hook=json_util.object_hook)
            prediction_dict = {'rowID': message['rowID'], 'competition_id': self.competition_id, 'user_id': 0}

            prediction_dict, num_records, sum_values = self.regression(message,
                                                                       prediction_dict, num_records, sum_values)
            prediction_dict, target_dict = self.classification(message, target_dict, prediction_dict)

            if message['tag'] == 'TEST':
                submitted_on = datetime.datetime.now()
                prediction_dict['submitted_on'] = submitted_on
                predictions.insert_one(prediction_dict)
                del prediction_dict['submitted_on']
                prediction_dict['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                self.producer.send(self.output_topic, json.dumps(prediction_dict,
                                                                 default=json_util.default).encode('utf-8'))

    @staticmethod
    def regression(message, prediction_dict, num_records, sum_values):

        if message['tag'] == 'TEST':
            for key, value in sum_values.items():
                prediction_dict[key] = float(sum_values[key]) / int(num_records[key])
        if message['tag'] == 'INIT' or message['tag'] == 'TRAIN':
            for target in sum_values.keys():
                num_records[target] = num_records[target] + 1
                sum_values[target] = sum_values[target] + float(message[target])

        return prediction_dict, num_records, sum_values

    @staticmethod
    def classification(message, target_dict, prediction_dict):

        if message['tag'] == 'TEST':
            for target, value in target_dict.items():
                prediction_dict[target] = max(value.items(), key=operator.itemgetter(1))[0]
        if message['tag'] == 'INIT' or message['tag'] == 'TRAIN':
            for target in target_dict.keys():
                if str(message[target]) in target_dict[target]:
                    target_dict[target][str(message[target])] += 1
                else:
                    target_dict[target][str(message[target])] = 1
        return prediction_dict, target_dict
