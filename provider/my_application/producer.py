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

import datetime
import time
import pause
from confluent_kafka import Producer
import csv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from repositories.CompetitionRepository import CompetitionRepository, DatastreamRepository
from repositories.KafkaToMongo import ConsumerToMongo
from repositories.BaselineToMongo import BaselineToMongo
import sparkEvaluator
from bson import json_util
import json
import orjson
from consumer import DataStreamerServicer
from stream_server import StreamServer
import os
from pyspark.sql import SparkSession
from sparkToMongo import SparkToMongo
from repository import MongoRepository
from multiprocessing import Process
from pyspark.sql.types import *
import logging
logging.basicConfig(level='DEBUG')

spark_master = "spark://" + os.environ['SPARK_HOST'] + ":7077"
_ONE_DAY_IN_SECONDS = 60 * 60 * 24

"""
Read the environment variables or the config file to define the services:
SQL_HOST: The address of MySQL server
SQL_DBNAME: The name of the MySQL Database
KAFKA_HOST: The address of Kafka Server
MONGO_HOST: The address of MongoDB server
SPARK_DRIVER_HOST: The address of Spark Driver
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
    SERVER_HOST = os.environ['KAFKA_HOST']
except Exception:
    SERVER_HOST = config['KAFKA_HOST']
try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']
try:
    SPARK_DRIVER_HOST = os.environ['SPARK_DRIVER_HOST']
except Exception:
    SPARK_DRIVER_HOST = config['SPARK_DRIVER_HOST']
try:
    SPARK_DRIVER_PORT = os.environ['SPARK_DRIVER_PORT']
except Exception:
    SPARK_DRIVER_PORT = config['SPARK_DRIVER_PORT']
try:
    SPARK_BLOCKMANAGER_PORT = os.environ['SPARK_BLOCKMANAGER_PORT']
except Exception:
    SPARK_BLOCKMANAGER_PORT = config['SPARK_BLOCKMANAGER_PORT']

_UPLOAD_REPO = config['UPLOAD_REPO']
_STREAM_REPO = config['STREAM_DATA_FILE']

_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)
_DATASTREAM_REPO = DatastreamRepository(_SQL_HOST, _SQL_DBNAME)
_COMPETITION_GENERATED_CODE = config['COMPETITION_GENERATED_CODE']


def _create_competition(competition, competition_config):
    """
    Starts the processes needed to run the competition.
    Reads the .csv file, initiates Kafka to start generating the stream.
    Starts the Spark online evaluation and writing of the results in MongoDB.

    :param competition: The competition object
    :param competition_config: Competition configuration dictionary
    :return: None
    """
    items, predictions, initial_batch, classes = read_csv_file(competition, competition_config)
    processes = []
    producer_process = Process(target=_start_competition, args=(competition, items, predictions, initial_batch))
    producer_process.start()
    processes.append(producer_process)
    try:
        consumer_process = Process(target=_create_consumer, args=(competition, competition_config))
        consumer_process.start()
    except Exception as e:
        print(e)
        logging.debug("Consumer process exception: {}".format(e))
    baseline_process = Process(target=_create_baseline, args=(competition, competition_config))
    baseline_process.start()
    processes.append(baseline_process)
    time.sleep(2)
    spark_process = Process(target=_create_evaluation_spark, args=(SERVER_HOST, competition, competition_config))
    spark_process.start()
    mongo_sink_process = Process(target=_create_spark2mongo_sink, args=(SERVER_HOST, competition, competition_config))
    mongo_sink_process.start()
    processes.append(mongo_sink_process)

    p6 = Process(target=_end_competition, args=(competition, processes))
    p6.start()


def read_csv_file(competition, competition_config, data_format='csv'):
    """

    :param competition:
    :param competition_config:
    :param data_format:
    :return:
    """
    initial_batch = []
    items = []
    predictions = []
    classes = {}
    initial_batch_size = competition.initial_batch_size

    datastream = _DATASTREAM_REPO.get_datastream_by_id(competition.datastream_id)
    file_path = datastream.file_path
    # Creating file path: ../local/data/uploads/stream_data_file
    file_path = os.path.join(_UPLOAD_REPO, _STREAM_REPO, file_path)

    # _UPLOAD_REPO+ file_path
    # Read csv file
    count_classes = False
    for key in competition_config.keys():
        for value in competition_config[key]:
            if value in ["kappa", "f1", "precision", "recall"]:
                count_classes = True
                classes[key] = []

    if data_format == 'csv':
        try:
            with open(file_path, 'r') as csvfile:
                datareader = csv.reader(csvfile, delimiter=',', quotechar='|')
                data = list(datareader)
                nb_rows = len(data)
                header = data[0]
                row_id = 1
                # Process initial batch
                for row in range(1, initial_batch_size + 1):
                    if not all(item == "" for item in data[row]):
                        values = {'tag': 'INIT', 'rowID': row_id}
                        row_id = row_id + 1
                        for i in range(0, len(data[row])):
                            field = header[i].replace(" ", "")
                            values[field] = data[row][i]
                        initial_batch.append(values)
                # After the initial batch
                for row in range(initial_batch_size + 1, nb_rows - 1):
                    if not all(item == "" for item in data[row]):
                        try:
                            values = {'rowID': row_id}
                            prediction = {'rowID': row_id}
                            row_id = row_id + 1
                            for i in range(0, len(data[row])):
                                for key in competition_config.keys():
                                    x = header[i].lower().replace(' ', '')  # Field name
                                    y = str(key.lower().replace(' ', ''))  # Key
                                    # If field name == target = > prediction
                                    field = header[i].replace(" ", "")
                                    if x == y:
                                        prediction[field] = data[row][i]
                                        if count_classes:
                                            if str(data[row][i]) not in classes[field]:
                                                classes[field].append(str(data[row][i]))
                                    # If field name != target = > values
                                    else:
                                        values[field] = data[row][i]
                            # add values to items list and prediction to predictions list
                            items.append(values)
                            predictions.append(prediction)
                        except Exception as e:
                            print('error')

        except IOError as e:
            print("could not open file" + file_path)

    return items, predictions, initial_batch, classes


def _create_evaluation_spark(kafka_server, competition, competition_config):
    # Create Spark Session for online evaluation job
    spark_context = SparkSession \
        .builder \
        .appName("Kafka_structured_streaming") \
        .master(spark_master) \
        .config('spark.jars.packages', 'org.apache.spark:spark-sql-kafka-0-10_2.11:2.4.0') \
        .config('spark.driver.host', SPARK_DRIVER_HOST) \
        .config('spark.driver.port', SPARK_DRIVER_PORT) \
        .config('spark.blockManager.port', SPARK_BLOCKMANAGER_PORT) \
        .config('spark.executor.memory', '2g') \
        .config('spark.network.timeout', 800) \
        .config('spark.cleaner.referenceTracking.cleanCheckpoints', "true") \
        .config('spark.shuffle.compress', 'true') \
        .config('spark.checkpoint.compress', 'true') \
        .config('spark.sql.shuffle.partitions', 60) \
        .getOrCreate()

    mongo = MongoRepository(_MONGO_HOST)

    db = mongo.client['evaluation_measures']
    collection = db['standard_measures']
    measures = collection.find({})
    regression_measures = []
    classification_measures = []
    for m in measures:
        if m['type'] == 'regression':
            regression_measures.append(m['name'])
        if m['type'] == 'classification':
            classification_measures.append(m['name'])

    targets = []

    for key in competition_config.keys():
        y = str(key).replace(' ', '')  # Key
        targets.append(y)

    # Fields for published message
    train_schema = StructType() \
        .add("Deadline", StringType(), False) \
        .add("Released", StringType(), False) \
        .add("competition_id", IntegerType(), False) \
        .add("rowID", IntegerType(), False)
    # Fields for prediction
    prediction_schema = StructType() \
        .add("rowID", IntegerType(), False) \
        .add("submitted_on", StringType(), False) \
        .add("prediction_competition_id", IntegerType(), False) \
        .add("user_id", IntegerType(), False)

    for target in targets:
        # Decide weather it is regression or classification
        for measure in competition_config[target.replace(" ", "")]:
            if measure in regression_measures:
                regression = True
                if target not in train_schema.fieldNames():
                    train_schema.add(target, StringType(), False)
                if target not in prediction_schema.fieldNames():
                    prediction_schema.add("prediction_" + target, FloatType(), False)
            elif measure in classification_measures:
                regression = False
                if target not in train_schema.fieldNames():
                    train_schema.add(target, StringType(), False)
                if target not in prediction_schema.fieldNames():
                    prediction_schema.add("prediction_" + target, StringType(), False)

    # Time window duration for watermarking
    window_duration = str(competition.predictions_time_interval) + " " + "seconds"
    prediction_window_duration = str(12 * competition.predictions_time_interval) + " " + "seconds"

    # Creating lists of column names which wiil be used later during calculations and transformations
    target_columns = []  # Target column names
    prediction_target_columns = []  # target column names in prediction messages, they have prefix "prediction_"
    measure_columns = []  # Measure column names, for every target
    sum_columns = []  # Column names after aggregation, automatically they will be named "sum(*)"
    columns_to_sum = ["latency", "num_submissions", "penalized", "total_num"]  # Column names on which we should
    # apply aggregations

    for target in targets:
        target_col = target
        prediction_target_col = "prediction_" + target.replace(" ", "")
        for measure in competition_config[target.replace(" ", "")]:
            # measure column example: "MAPE_Valeurs"
            measure_col = str(measure) + "_" + target.replace(" ", "")
            # sum column example: "sum(MAPE_Valeurs)"
            sum_col = "sum(" + str(measure) + "_" + target.replace(" ", "") + ")"
            measure_columns.append(measure_col)
            sum_columns.append(sum_col)
            if measure_col not in columns_to_sum:
                columns_to_sum.append(measure_col)
                # columns_to sum = ["latency", "num_submissions", "penalized", "MAPE_Valeurs"]

        target_columns.append(target_col)
        prediction_target_columns.append(prediction_target_col)

    checkpoint_locations = ["/tmp/" + competition.name.lower().replace(" ", "") + "prediction_checkpoint",
                            "/tmp/" + competition.name.lower().replace(" ", "") + "training_checkpoint",
                            "/tmp/" + competition.name.lower().replace(" ", "") + "measure_checkpoint"]

    sparkEvaluator.evaluate(spark_context=spark_context, kafka_broker=kafka_server, competition=competition,
                            competition_config=competition_config, window_duration=window_duration,
                            prediction_window_duration=prediction_window_duration, train_schema=train_schema,
                            prediction_schema=prediction_schema, columns_to_sum=columns_to_sum,
                            checkpoints=checkpoint_locations, targets=targets)

    spark_context.stop()


def _create_spark2mongo_sink(kafka_server, competition, competition_config):
    spark_to_mongo = SparkToMongo(kafka_server, competition.name.lower().replace(" ", "") + 'spark_predictions',
                                  competition.name.lower().replace(" ", "") + 'spark_golden',
                                  competition.name.lower().replace(" ", "") + 'spark_measures', competition,
                                  competition_config)
    spark_to_mongo.run()


def _start_competition(competition, items, predictions, initial_batch):
    '''Starts Kafka producer to publish the stream.'''
    producer = CompetitionProducer(SERVER_HOST)
    producer.create_competition(competition, items, predictions, initial_batch)


def _create_consumer(competition, competition_config):
    ''' Starts the consumer for streams of predictions sent by users.'''
    logging.debug("Creating consumer")
    options = (('grpc.so_reuseport', 1),)
    grpc_server = StreamServer('0.0.0.0:50051', options=options)
    try:
        streamer = DataStreamerServicer(SERVER_HOST, competition, competition_config)
        grpc_server.add_server(streamer, competition)
        grpc_server.start_server()
        grpc_server._wait_forever()
    except Exception as e:
        logging.debug("Inside consumer process: {}".format(e))


def _create_mongo_sink_consumer(topic, competition):
    '''Starts writing the data published in Kafka to MongoDB.'''
    mongo_writer = ConsumerToMongo(SERVER_HOST, topic, competition)
    mongo_writer.write()


def _create_baseline(competition, competition_config):
    '''Starts the Baseline prediction model.'''
    topic = competition.name.lower().replace(" ", "")
    baseline = BaselineToMongo(SERVER_HOST, topic, competition, competition_config)
    baseline.write()


def _end_competition(competition, processes):
    pause.until(competition.end_date + datetime.timedelta(seconds=62))
    if datetime.datetime.now() > competition.end_date + datetime.timedelta(seconds=60):
        terminate(processes)


def terminate(processes):
    for process in processes:
        process.terminate()


class CompetitionProducer:
    daemon = True
    producer = None

    def __init__(self, server):
        conf = {'bootstrap.servers': server}
        self.producer = Producer(conf)  # Create producer

    # message must be in byte format
    def send(self, topic, message):
        self.producer.produce(topic, message)  # Sending messages to a certain topic
        self.producer.poll(timeout=0)

    def main(self, topic, initial_batch, items, predictions, initial_training_time, batch_size, time_interval,
             predictions_time_interval, spark_topic, competition_id):

        for item in initial_batch:
            try:
                # Send row by row from initial batch as json
                self.send(topic, orjson.dumps(item))
            except Exception as e:
                # Check if topic exists, if not, create it and then send
                print(e)

        # After sending initial batch, sleep for initial training time
        time.sleep(int(initial_training_time))
        # Creating lists of batch size, one for test items with just values and second with predictions for training
        test_groups = list(self.chunker(items, batch_size))
        train_groups = list(self.chunker(predictions, batch_size))

        i = -1

        # Accessing each group in the list test_groups
        for group in test_groups:
            # In parallel accessing the predictions
            # Adding tag, deadline and released at to every item in train group / prediction
            released_at = datetime.datetime.now()
            # for item in test group add tag, deadline and released
            for item in group:
                item['tag'] = 'TEST'
                item['Deadline'] = str(released_at + datetime.timedelta(seconds=int(predictions_time_interval)))
                item['Released'] = str(released_at)
                item['competition_id'] = str(competition_id)
                # Sending testing items
                try:
                    self.send(topic, orjson.dumps(item))

                except Exception as e:
                    print(e)

            i = i + 1
            train_group = train_groups[i]
            for item in train_group:
                deadline = released_at + datetime.timedelta(seconds=int(predictions_time_interval))
                item['Deadline'] = deadline.strftime("%Y-%m-%d %H:%M:%S")
                item['Released'] = released_at.strftime("%Y-%m-%d %H:%M:%S")
                item['competition_id'] = competition_id
                try:
                    self.send(spark_topic, orjson.dumps(item))
                except Exception as e:
                    print(e)

            time.sleep(time_interval)

            for item in train_group:
                item['tag'] = 'TRAIN'
                item['Deadline'] = released_at + datetime.timedelta(seconds=int(predictions_time_interval))
                item['Released'] = released_at
                try:
                    self.send(topic, orjson.dumps(item, default=json_util.default))
                except Exception as e:
                    print(e)

        time.sleep(time_interval)

        self.producer.flush()

    # Creating chunks of batch size
    def chunker(self, seq, size):
        return (seq[pos:pos + size] for pos in range(0, len(seq), size))

    def is_not_empty(self, row):  # is_empty
        return all(item == "" for item in row)

    # Creating competition, competition_config
    def create_competition(self, competition, items, predictions, initial_batch):
        self.main(
            topic=competition.name.lower().replace(" ", ""),
            initial_training_time=competition.initial_training_time,
            initial_batch=initial_batch,
            items=items,
            predictions=predictions,
            batch_size=competition.batch_size,
            time_interval=competition.time_interval,
            predictions_time_interval=competition.predictions_time_interval,
            spark_topic=competition.name.lower().replace(" ", "") + 'spark_train',
            competition_id=competition.competition_id)


class Scheduler:

    def __init__(self):
        jobstores = {
            'default': MongoDBJobStore(database='apscheduler', collection='jobs', host=_MONGO_HOST, port=27017)}
        self.scheduler = BackgroundScheduler(jobstores=jobstores)
        # print("Version: ", sys.version)

    def schedule_competition(self, competition, competition_config):
        competition_job_id = str(competition.name)
        start_date = competition.start_date
        end_date = competition.end_date
        year = start_date.year
        month = start_date.month
        day = start_date.day
        hour = start_date.hour
        minute = start_date.minute
        second = start_date.second

        publish_job = self.scheduler.add_job(_create_competition, trigger='cron', year=year, month=month, day=day, hour=hour,
                                             minute=minute, second=second, start_date=start_date, end_date=end_date,
                                             args=[competition, competition_config], id=competition.name)

        job_id_to_remove = publish_job.id

    def start(self):
        self.scheduler.start()

    def _stop_competition(self, job_id, end_date):
        """
        def _delete_job(job_id):
            print('stop',self.scheduler.get_jobs())
            for job in self.scheduler.get_jobs():
                print(job.id, job_id)
                if job.id == job_id:
                    self.schedulder.remove_job(job)
                    print ("No more " + job_id)"""
        self.scheduler.add_job(self.scheduler.remove_job, 'date', run_date=end_date, args=[job_id])





