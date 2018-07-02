from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import os
from time import sleep

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
        # watermark_delay = str(self.competition.time_interval) + " " + "seconds"
        windowDuration = str(2 * self.competition.predictions_time_interval) + " " + "seconds"
        prediction_window_duration = str(self.competition.predictions_time_interval) + " " + "seconds"
        # message_win = "10 seconds"

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

        records = messages\
            .withColumn("timestamp_deadline",
                        unix_timestamp(messages['Deadline'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .withColumn("timestamp_released",
                        unix_timestamp(messages['Released'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .drop("Deadline")\
            .drop("Released")

        prediction_stream = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_predictions') \
            .load()

        prediction_stream_parsed = prediction_stream.selectExpr("cast (value as string) as json") \
            .select(from_json("json", self.prediction_schema).alias("data")) \
            .select("data.*")

        newFields = []
        for field in fields:
            newField = 'prediction_' + field
            newFields.append(newField)

        for idx in range(len(fields)):
            prediction_stream_parsed = prediction_stream_parsed.withColumnRenamed(fields[idx], newFields[idx])

        predictions = prediction_stream_parsed\
            .withColumn("timestamp_submitted",
                        unix_timestamp(prediction_stream_parsed['prediction_submitted_on'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .drop("prediction_submitted_on")

        records_with_watermark = records\
            .withWatermark("timestamp_deadline", windowDuration)

        predictions_with_watermark = predictions\
            .withWatermark("timestamp_submitted", prediction_window_duration)

        join_result = predictions_with_watermark.join(
           records_with_watermark,
           expr("""
           rowID = prediction_rowID AND
           timestamp_deadline >= timestamp_submitted AND
           timestamp_submitted >= timestamp_deadline - interval {}
           """.format(prediction_window_duration)), "leftOuter")\
            .drop("prediction_rowID")\
            .drop("prediction_competition_id")\
            .drop("competition_id")

        join_table = join_result \
            .withColumn("num_submissions",
                        when(join_result["timestamp_submitted"] <= join_result["timestamp_deadline"], 1).otherwise(0)) \
            .withColumn("latency", unix_timestamp(join_result["timestamp_submitted"]) -
                        unix_timestamp(join_result["timestamp_released"]))\
            .withColumn("penalized", when(join_result["timestamp_submitted"] > join_result["timestamp_deadline"], 1)
                        .otherwise(0))\
            .drop("rowID")\
            .drop("timestamp_submitted")\
            .drop("timestamp_released")\
            .drop("timestamp_deadline")
        columns_to_sum = ["latency", "num_submissions", "penalized"]
        for target in self.targets:
            message_col = target
            prediction_col = "prediction_" + target.replace(" ", "")
            for measure in self.config[target.replace(" ", "")]:
                measure_col = str(measure) + "_" + target.replace(" ", "")
                join_table = join_table \
                    .withColumn(measure_col,
                                abs((join_table[message_col] - join_table[prediction_col]) / join_table[message_col])) \
                    .drop(join_table[message_col]).drop(join_table[prediction_col])
                if measure_col not in columns_to_sum:
                    columns_to_sum.append(measure_col)
        exprs = {x: "sum" for x in columns_to_sum}
        results = join_table.groupBy("prediction_user_id")\
            .agg(exprs)\
            .withColumn("competition_id", lit(self.competition.competition_id))

        for target in self.targets:
            for measure in self.config[target.replace(" ", "")]:
                batch_measure_col = str(measure) + "_" + target.replace(" ", "")
                measure_col = "sum(" + str(measure) + "_" + target.replace(" ", "") + ")"
                results = results\
                    .withColumn(batch_measure_col, 100 * results[measure_col] / results["sum(num_submissions)"])\
                    .drop(measure_col)

        results = results\
            .withColumn("latency", results["sum(latency)"] / results["sum(num_submissions)"])\
            .withColumnRenamed("sum(penalized)", "penalized")\
            .withColumnRenamed("sum(num_submissions)", "num_submissions")\
            .drop("sum(latency)")\
            .writeStream\
            .format("console")\
            .outputMode("update")\
            .start()

        pred = predictions_with_watermark.writeStream\
            .format("console")\
            .start()

        mess = records_with_watermark.writeStream\
            .format("console")\
            .start()

        """
        messages_window = messages3\
            .groupBy(window("timestamp_released", windowDuration=windowDuration))\
            .createTempView("message_batch")

        predictions_window = predictions2\
            .groupBy(window("timestamp_submitted", windowDuration=prediction_window_duration))\
            .createTempView("prediction_batch")
        """

        """
        messagequery = records\
            .writeStream\
            .queryName("message_table")\
            .format("memory")\
            .outputMode("append")\
            .start()

        join_table = spark.sql("select * from message_table, prediction_table "
                                 "where message_table.rowID = prediction_table.prediction_rowID AND "
                                 "message_table.competition_id = prediction_table.prediction_competition_id AND "
                                 "message_table.timestamp_deadline >= prediction_table.timestamp_submitted") \
            .drop("prediction_rowID").drop("prediction_competition_id")\
            .writeStream\
            .format("console")\
            .start()
            """
        """
        while messagequery.isActive:
            join_table = self.sc.sql("select * from message_table, prediction_table "
                                     "where message_table.rowID = prediction_table.prediction_rowID AND "
                                     "message_table.competition_id = prediction_table.prediction_competition_id AND "
                                     "message_table.timestamp_deadline >= prediction_table.timestamp_submitted")\
                .drop("prediction_rowID").drop("prediction_competition_id")
            
            join_table = join_table\
                .withColumn("num_submissions", when(join_table["timestamp_submitted"] <= join_table["timestamp_deadline"], 1).otherwise(0))\
                .withColumn("latency", unix_timestamp(join_table["timestamp_submitted"]) - unix_timestamp(join_table["timestamp_released"]))
            columns_to_sum = ["latency", "num_submissions"]
            for target in self.targets:
                message_col = target
                prediction_col = "prediction_" + target.replace(" ", "")
                for measure in self.config[target.replace(" ", "")]:
                    measure_col = str(measure) + "_" + target.replace(" ", "")
                    join_table = join_table\
                        .withColumn(measure_col, abs((join_table[message_col] - join_table[prediction_col])/join_table[message_col]))\
                        .drop(join_table[message_col]).drop(join_table[prediction_col])
                    if measure_col not in columns_to_sum:
                        columns_to_sum.append(measure_col)
            
            join_table = join_table\
                .drop("rowID")\
                .drop("timestamp_submitted")\
                .drop("timestamp_released")\
                .drop("competition_id")\
                .drop("timestamp_deadline")\

            results = join_table.groupBy("prediction_user_id")\
                .agg(expr("sum(num_submissions)"), expr("sum(latency)"))\
                .writeStream.format("console").outputMode("update").start()

        # sleep(self.competition.predictions_time_interval)
        """
        # messagequery.awaitTermination()
        # join_table.awaitTermination()
        mess.awaitTermination()
        pred.awaitTermination()

        # TODO now topic is competition.name.lower().replace(" ", "") + 'predictions'
        # TODO  change it for the input and for the output put it with predictions

