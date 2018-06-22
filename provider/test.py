from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.streaming import StreamingContext
import os

spark = SparkSession.builder.appName("Kafka_structured_streaming").getOrCreate()
# from baseline_client import baselineClient
# from apscheduler.schedulders.background.BackgroundScheduler import remove_job
os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-streaming-kafka-0-8_2.11:2.3.1 pyspark-shell'


# bin/pyspark --packages org.apache.spark:spark-streaming-kafka_2.10:1.5.2 # in container


class SparkEvaluator:
    def __init__(self, spark_context, kafka_server):
        self.sc = spark_context
        self.broker = kafka_server  # 172.22.0.2:9092

    def main(self):

        ssc = StreamingContext(self.sc, 5)

        kafkaStream = self.sc.readStream.format("kafka").option("kafka.bootstrap.servers", self.broker)\
            .option("subscribePattern", 'test').load()
        messages_str = kafkaStream.selectExpr("CAST(value AS STRING)").writeStream.outputMode("append")\
            .format("console").start()

        ssc.start()
        ssc.awaitTermination()


evaluator = SparkEvaluator(spark, "localhost:9092")
evaluator.main()
