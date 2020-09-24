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
import json
import orjson
import datetime
import operator
import os
from confluent_kafka import Consumer, Producer

"""
This module provides the Baseline classifier class for a given problem.
Depending of the nature of the problem regression/classification it creates a baseline model 
average value/ majority class voting.
It serves as first line comparison of performance with user's model.
"""

with open('./config.json') as json_data_file:
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
        self.consumer.subscribe([topic])
        self.config = competition_config
        self.targets = competition_config.keys()
        self.competition_id = competition.competition_id
        conf_producer = {'bootstrap.servers': kafka_server}
        self.producer = Producer(conf_producer)
        self.output_topic = competition.name.lower().replace(" ", "") + 'predictions'

    def write(self):
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
            try:
                msg = self.consumer.poll(timeout=0)
                message = orjson.loads(msg.value())
                prediction_dict = {'rowID': message['rowID'],
                                   'prediction_competition_id': self.competition_id, 'user_id': 0}

                prediction_dict, num_records, sum_values = self.regression(message, prediction_dict, num_records,
                                                                           sum_values)
                prediction_dict, target_dict = self.classification(message, target_dict, prediction_dict)
                if message['tag'] == 'TEST':
                    submitted_on = datetime.datetime.now()
                    prediction_dict['submitted_on'] = submitted_on.strftime("%Y-%m-%d %H:%M:%S")
                    self.producer.produce(self.output_topic, orjson.dumps(prediction_dict))
                    self.producer.poll(timeout=0)
            except Exception as e:
                continue

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