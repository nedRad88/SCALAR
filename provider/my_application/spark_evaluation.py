from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import os


# bin/pyspark --packages org.apache.spark:spark-streaming-kafka_2.10:1.5.2 # in container
#os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 pyspark-shell'
#spark = SparkSession.builder.appName("Kafka_structured_streaming").getOrCreate()


class SparkEvaluator:
    def __init__(self, spark_context, kafka_server, competition,
                 train_schema, prediction_schema):
        self.sc = spark_context
        self.broker = kafka_server  # 172.22.0.2:9092
        self.competition = competition
        self.train_schema = train_schema
        self.prediction_schema = prediction_schema

    def main(self):

        golden = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_train') \
            .load()

        messages = golden.selectExpr("cast (value as string) as json")\
            .select(from_json("json", self.train_schema).alias("data"))\
            .select("data.*")

        prediction_stream = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_predictions') \
            .load()

        predictions = prediction_stream.selectExpr("cast (value as string) as json") \
            .select(from_json("json", self.prediction_schema).alias("data")) \
            .select("data.*")

        query_mess = messages.writeStream.format("console").start()
        query_pred = predictions.writeStream.format("console").start()

        # messages.awaitTermination()
        # messages.stop()

        # TODO now topic is competition.name.lower().replace(" ", "") + 'predictions'
        # TODO  change it for the input and for the output put it with predictions

