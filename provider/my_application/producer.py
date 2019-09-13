import threading
import datetime
import time
from confluent_kafka import Producer
import csv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from repositories.CompetitionRepository import CompetitionRepository, Competition, Datastream, DatastreamRepository
from repositories.KafkaToMongo import ConsumerToMongo
from repositories.BaselineToMongo import BaselineToMongo
import sparkEvaluator
# from evaluator import Evaluator
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
# os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.4.0 pyspark-shell'
spark_master = "spark://" + os.environ['SPARK_HOST'] + ":7077"

spark = SparkSession\
    .builder\
    .appName("Kafka_structured_streaming")\
    .master(spark_master)\
    .config('spark.jars.packages', 'org.apache.spark:spark-sql-kafka-0-10_2.11:2.4.0')\
    .config('spark.driver.host', os.environ['SPARK_DRIVER_HOST'])\
    .config('spark.driver.port', os.environ['SPARK_DRIVER_PORT'])\
    .config('spark.blockManager.port', os.environ['SPARK_BLOCKMANAGER_PORT'])\
    .config('spark.executor.memory', '18g')\
    .config('spark.network.timeout', 800)\
    .config('spark.cleaner.referenceTracking.cleanCheckpoints', "true")\
    .config('spark.shuffle.compress', 'true')\
    .config('spark.checkpoint.compress', 'true')\
    .config('spark.sql.shuffle.partitions', 60)\
    .getOrCreate()

# from apscheduler.schedulders.background.BackgroundScheduler import remove_job

_ONE_DAY_IN_SECONDS = 60 * 60 * 24

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
    SERVER_HOST = config['KAFKA_HOST']  # 172.22.0.2:9092

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']

try:
    SPARK_DRIVER_HOST = os.environ['SPARK_DRIVER_HOST']
except Exception:
    SPARK_DRIVER_HOST = config['SPARK_DRIVER_HOST']

_UPLOAD_REPO = config['UPLOAD_REPO']
_STREAM_REPO = config['STREAM_DATA_FILE']

_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)
_DATASTREAM_REPO = DatastreamRepository(_SQL_HOST, _SQL_DBNAME)

_gRPC_SERVER = StreamServer()


def _create_competition(competition, competition_config):
    items, predictions, initial_batch, classes = read_csv_file(competition, competition_config)
    Process(target=_create_competition_thread, args=(competition, items, predictions, initial_batch)).start()
    threading.Thread(target=_create_consumer, args=(competition, competition_config,)).start()
    # Process(target=_create_mongo_sink_consumer,
      #       args=(competition.name.lower().replace(" ", "") + 'data', competition,)).start()
    Process(target=_create_baseline, args=(competition, competition_config)).start()
    time.sleep(2)
    Process(target=_create_evaluation_spark, args=(spark, SERVER_HOST, competition, competition_config,)).start()
    Process(target=_create_mongo_sink_evaluation, args=(SERVER_HOST, competition, competition_config)).start()
    """
    threading.Thread(target=_create_competition_thread, args=(competition, items, predictions, initial_batch)).start()
    threading.Thread(target=_create_consumer, args=(competition,)).start()
    threading.Thread(target=_create_mongo_sink_consumer,
                     args=(competition.name.lower().replace(" ", "") + 'predictions', competition,)).start()
    threading.Thread(target=_create_baseline, args=(competition, competition_config)).start()
    time.sleep(2)
    threading.Thread(target=_create_evaluation_spark, args=(spark, SERVER_HOST, competition, competition_config, classes)).start()
    threading.Thread(target=_create_mongo_sink_evaluation, args=(SERVER_HOST, competition, competition_config)).start()
    """


def read_csv_file(competition, competition_config, data_format='csv'):
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
                rowID = 1
                # Process initial batch
                for row in range(1, initial_batch_size + 1):
                    # If the row is not empty ???
                    if not all(item == "" for item in data[row]):

                        values = {'tag': 'INIT', 'rowID': rowID}
                        rowID = rowID + 1
                        for i in range(0, len(data[row])):
                            field = header[i].replace(" ", "")
                            values[field] = data[row][i]

                        initial_batch.append(values)
                # After the initial batch
                for row in range(initial_batch_size + 1, nb_rows - 1):
                    # If row is not empty ???
                    if not all(item == "" for item in data[row]):
                        # Create a dictionaries: values = {'rowID': rowID}
                        # prediction = {'rowID': rowID}
                        try:
                            values = {}
                            values['rowID'] = rowID
                            prediction = {}
                            prediction['rowID'] = rowID
                            rowID = rowID + 1
                            # print("Competition config: ", competition_config)
                            # For every field in row
                            for i in range(0, len(data[row])):
                                # keys in competition_config  ??? targets?
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


def _create_evaluation_spark(spark_context, kafka_server, competition, competition_config):
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
        .add("prediction_rowID", IntegerType(), False) \
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

    # return train_schema, prediction_schema, targets  # , test_schema, init_schema
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

    sparkEvaluator.evaluate(spark_context=spark_context, broker=kafka_server, competition=competition,
                            competition_config=competition_config, window_duration=window_duration,
                            prediction_window_duration=prediction_window_duration, train_schema=train_schema,
                            prediction_schema=prediction_schema, columns_to_sum=columns_to_sum,
                            checkpoints=checkpoint_locations, targets=targets)

    #spark_evaluator = SparkEvaluator(spark_context, kafka_server, competition, competition_config, classes,
                                    # regression_measures, classification_measures)
    #spark_evaluator.run()


def _create_mongo_sink_evaluation(kafka_server, competition, competition_config):
    spark_to_mongo = SparkToMongo(kafka_server, competition.name.lower().replace(" ", "") + 'spark_predictions',
                                  competition.name.lower().replace(" ", "") + 'spark_golden',
                                  competition.name.lower().replace(" ", "") + 'spark_measures', competition,
                                  competition_config)
    spark_to_mongo.run()


"""
def _create_evaluation_engine(competition_id, config, evaluation_time_interval):
    threading.Thread(target=_create_evaluation_job, args=(competition_id, config, evaluation_time_interval)).start()
"""


def _create_competition_thread(competition, items, predictions, initial_batch):
    # print(competition, datetime.datetime.now())
    print("usao u create competition tred")
    producer = CompetitionProducer(SERVER_HOST)  # 172.22.0.2:9092

    producer.create_competition(competition, items, predictions, initial_batch)
    # producer.producer.flush()


def _create_consumer(competition, competition_config):
    streamer = DataStreamerServicer(SERVER_HOST, competition, competition_config)  # 172.22.0.2:9092
    _gRPC_SERVER.add_server(streamer, competition)


def _create_mongo_sink_consumer(topic, competition):
    mongo_writer = ConsumerToMongo(SERVER_HOST, topic, competition)
    mongo_writer.write()


def _create_baseline(competition, competition_config):
    topic = competition.name.lower().replace(" ", "")
    baseline = BaselineToMongo(SERVER_HOST, topic, competition, competition_config)
    baseline.write()


"""
def _create_evaluation_job(competition_id, config, evaluation_time_interval):
    # print(competition_id, datetime.datetime.now())
    # print("Started evaluation", threading.active_count())
    Evaluator.evaluate(competition_id, config, evaluation_time_interval)
"""


class CompetitionProducer:
    daemon = True
    producer = None

    def __init__(self, server):
        conf = {'bootstrap.servers': server}
        self.producer = Producer(conf)  # Create producer
        # self.client = SimpleClient(SERVER_HOST)  # Create client

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
                # print("Init item:", item)
            except Exception as e:
                # Check if topic exists, if not, create it and then send
                # self.client.ensure_topic_exists(topic)
                print(e)
                # self.producer.produce(topic, json.dumps(item, default=json_util.default).encode('utf-8'))
                # self.producer.poll(timeout=0)
                # print("Init item:", item)
        # After sending initial batch, sleep for initial training time
        time.sleep(int(initial_training_time))
        # Creating lists of batch size, one for test items with just values and second with predictions for training
        test_groups = list(self.chunker(items, batch_size))
        train_groups = list(self.chunker(predictions, batch_size))

        # print(len(items))

        i = -1

        # deadline = datetime.datetime.now()
        # Test then train  ???
        # deadline = deadline + datetime.timedelta(seconds=initial_training_time)

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
                    # print("Test item:", item)
                except Exception as e:
                    print(e)
                    # self.client.ensure_topic_exists(topic)
                    # self.producer.produce(topic, json.dumps(item, default=json_util.default).encode('utf-8'))
                    # self.producer.poll(timeout=0)
                    # print("Test item:", item)
            i = i + 1

            train_group = train_groups[i]
            for item in train_group:
                # deadline = deadline + datetime.timedelta(seconds=int(predictions_time_interval) * i+1)
                deadline = released_at + datetime.timedelta(seconds=int(predictions_time_interval))
                item['Deadline'] = deadline.strftime("%Y-%m-%d %H:%M:%S")
                item['Released'] = released_at.strftime("%Y-%m-%d %H:%M:%S")
                item['competition_id'] = competition_id
                try:
                    self.send(spark_topic, orjson.dumps(item))
                except Exception as e:
                    print(e)
                    # self.client.ensure_topic_exists(spark_topic)
                    # self.send(spark_topic, json.dumps(item, default=json_util.default).encode('utf-8'))

            time.sleep(time_interval)

            train_released_at = datetime.datetime.now()

            for item in train_group:
                item['tag'] = 'TRAIN'
                # deadline = deadline + datetime.timedelta(seconds=int(predictions_time_interval) * i+1)
                item['Deadline'] = train_released_at + datetime.timedelta(seconds=int(predictions_time_interval))
                item['Released'] = train_released_at
                # item
                try:
                    self.send(topic, orjson.dumps(item, default=json_util.default))
                    # print("Train item:", item)
                except Exception as e:
                    print(e)
                    # self.client.ensure_topic_exists(topic)
                    # self.producer.produce(topic, json.dumps(item, default=json_util.default).encode('utf-8'))
                    # self.producer.poll(timeout=0)
                    # print("Train item:", item)

        time.sleep(time_interval)

        self.producer.flush()

    # Creating chunks of batch size
    def chunker(self, seq, size):
        return (seq[pos:pos + size] for pos in range(0, len(seq), size))

    # Check if the row is empty ??
    def is_not_empty(self, row):  # is_empty
        return all(item == "" for item in row)

    # Creating competition, competition_config ???
    def create_competition(self, competition, items, predictions, initial_batch):
        print("Came here, create competition: ", competition.name)
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
        # print("Scheduler started!")
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





