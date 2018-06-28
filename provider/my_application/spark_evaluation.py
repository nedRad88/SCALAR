from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import os

# bin/pyspark --packages org.apache.spark:spark-streaming-kafka_2.10:1.5.2 # in container
# os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 pyspark-shell'
# spark = SparkSession.builder.appName("Kafka_structured_streaming").getOrCreate()


class SparkEvaluator:
    def __init__(self, spark_context, kafka_server, competition,
                 train_schema, prediction_schema, targets, competition_config):
        self.sc = spark_context
        self.broker = kafka_server  # 172.22.0.2:9092
        self.competition = competition
        self.train_schema = train_schema
        self.prediction_schema = prediction_schema
        self.targets = targets
        self.config = competition_config

    def main(self):

        watermark_delay = str(self.competition.time_interval) + " " + "seconds"
        windowDuration = str(self.competition.predictions_time_interval) + " " + "seconds"
        message_win = "10 seconds"

        fields = self.prediction_schema.fieldNames()

        golden = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_train') \
            .load()

        messages = golden.selectExpr("cast (value as string) as json")\
            .select(from_json("json", self.train_schema).alias("data"))\
            .select("data.*")

        messages2 = messages.withColumn("timestamp_deadline", unix_timestamp(messages['Deadline'],
                                                                             "yyyy-MM-dd HH:mm:ss")
                                        .cast(TimestampType()))

        messages3 = messages2.withColumn("timestamp_released", unix_timestamp(
            messages['Released'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))

        messages3.writeStream.format("console").start()

        prediction_stream = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_predictions') \
            .load()

        predictions = prediction_stream.selectExpr("cast (value as string) as json") \
            .select(from_json("json", self.prediction_schema).alias("data")) \
            .select("data.*")

        newFields = []
        for field in fields:
            newField = 'prediction_' + field
            newFields.append(newField)

        for idx in range(len(fields)):
            predictions = predictions.withColumnRenamed(fields[idx], newFields[idx])

        predictions2 = predictions.withColumn("timestamp_submitted",
                                              unix_timestamp(predictions['prediction_submitted_on'],
                                                             "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))

        window_mess = messages3.withWatermark("timestamp_released", watermark_delay).drop("Released").drop("Deadline")

        prediction_window = predictions2.withWatermark("timestamp_submitted", watermark_delay).\
            drop("prediction_submitted_on")

        predictionsquery = prediction_window.writeStream.queryName("prediction_table")\
            .format("memory")\
            .start()

        messagequery = window_mess.writeStream.queryName("message_table").format("memory").outputMode("append").start()

        from time import sleep
        while messagequery.isActive:
            join_table = self.sc.sql("select * from message_table, prediction_table "
                                     "where message_table.rowID = prediction_table.prediction_rowID AND "
                                     "message_table.competition_id = prediction_table.prediction_competition_id AND "
                                     "message_table.timestamp_deadline >= prediction_table.timestamp_submitted AND "
                                     "message_table.timestamp_deadline >= current_timestamp")\
                .drop("prediction_rowID").drop("prediction_competition_id")
            join_table = join_table\
                .withColumn("num_submissions", when(join_table["timestamp_submitted"] <= join_table["timestamp_deadline"], 1).otherwise(0))\
                .withColumn("latency", unix_timestamp(join_table["timestamp_submitted"]) - unix_timestamp(join_table["timestamp_released"]))

            for target in self.targets:
                message_col = target
                prediction_col = "prediction_" + target.replace(" ", "")
                for measure in self.config[target.replace(" ", "")]:
                    measure_col = str(measure) + "_" + target.replace(" ", "")
                    join_table = join_table\
                        .withColumn(measure_col, abs((join_table[message_col] - join_table[prediction_col])/join_table[message_col]))

            join_table.show()
            sleep(1)

        predictionsquery.awaitTermination()
        messagequery.awaitTermination()

        # TODO now topic is competition.name.lower().replace(" ", "") + 'predictions'
        # TODO  change it for the input and for the output put it with predictions

