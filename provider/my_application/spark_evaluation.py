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
        # Time window duration for validity of records and predictions
        window_duration = str(2 * self.competition.predictions_time_interval) + " " + "seconds"
        prediction_window_duration = str(self.competition.predictions_time_interval) + " " + "seconds"

        # Column names in predictions stream
        fields = self.prediction_schema.fieldNames()
        # Reading stream of records from Kafka
        golden = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_train') \
            .load()\
            .selectExpr("cast (value as string) as json")\
            .select(from_json("json", self.train_schema).alias("data"))\
            .select("data.*")
        # Reading stream of predictions from Kafka
        prediction_stream = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_predictions') \
            .load()\
            .selectExpr("cast (value as string) as json") \
            .select(from_json("json", self.prediction_schema).alias("data")) \
            .select("data.*")
        # Casting timestamps to TimestampType
        records = golden\
            .withColumn("timestamp_deadline",
                        unix_timestamp(golden['Deadline'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .withColumn("timestamp_released",
                        unix_timestamp(golden['Released'], "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .drop("Deadline")\
            .drop("Released")

        # Renaming the fields to perform a join
        new_fields = []
        for field in fields:
            new_field = 'prediction_' + field
            new_fields.append(new_field)
        for idx in range(len(fields)):
            prediction_stream = prediction_stream.withColumnRenamed(fields[idx], new_fields[idx])
        # Casting timestamps to TimestampType
        predictions = prediction_stream\
            .withColumn("timestamp_submitted", unix_timestamp(prediction_stream['prediction_submitted_on'],
                                                              "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
            .drop("prediction_submitted_on")

        # Putting watermarks on both streams
        records_with_watermark = records\
            .withWatermark("timestamp_deadline", window_duration)

        predictions_with_watermark = predictions\
            .withWatermark("timestamp_submitted", prediction_window_duration)
        # Joining two streams
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
        # Creating columns for:
        # number of submissions: this column has value 1 if the submission was before deadline, otherwise 0
        # latency: this column represents the difference between submission time and publishing time (released)
        # penalized: if submission was after the deadline then penalized column has value 1, otherwise 0
        join_table = join_result \
            .withColumn("num_submissions",
                        when(join_result["timestamp_submitted"] <= join_result["timestamp_deadline"], 1).otherwise(0)) \
            .withColumn("latency", unix_timestamp(join_result["timestamp_submitted"]) -
                        unix_timestamp(join_result["timestamp_released"])) \
            .drop("timestamp_released")

        join_table = join_table\
            .withColumn("penalized", abs(join_table["num_submissions"] - lit(1)))\
            .withColumn("latency", when(join_table["num_submissions"] == 0, self.competition.predictions_time_interval)
                        .otherwise(join_table["latency"]))\
            .drop("rowID")

        columns_to_sum = ["latency", "num_submissions", "penalized"]
        # Calculation on measures for individual predictions
        for target in self.targets:
            message_col = target
            prediction_col = "prediction_" + target.replace(" ", "")
            for measure in self.config[target.replace(" ", "")]:
                measure_col = str(measure) + "_" + target.replace(" ", "")
                join_table = join_table \
                    .withColumn(prediction_col,
                                when(join_table["timestamp_submitted"] > join_table["timestamp_deadline"], 0)
                                .otherwise(join_table[prediction_col]))
                join_table = join_table \
                    .withColumn(measure_col, when(join_table[message_col].isNotNull(),
                                                  abs((join_table[message_col] - join_table[prediction_col])
                                                      / join_table[message_col])).otherwise(1)) \
                    .drop(join_table[message_col])\
                    .drop(join_table[prediction_col])
                if measure_col not in columns_to_sum:
                    columns_to_sum.append(measure_col)
        # Dropping unnecessary columns
        join_table = join_table\
            .drop("timestamp_deadline")\
            .drop("timestamp_submitted")

        exprs = {x: "sum" for x in columns_to_sum}
        # Grouping by user_id and aggregation
        results = join_table.groupBy("prediction_user_id")\
            .agg(exprs)\
            .withColumn("competition_id", lit(self.competition.competition_id))
        # Calculating batch measures
        for target in self.targets:
            for measure in self.config[target.replace(" ", "")]:
                batch_measure_col = str(measure) + "_" + target.replace(" ", "")
                measure_col = "sum(" + str(measure) + "_" + target.replace(" ", "") + ")"
                results = results\
                    .withColumn(batch_measure_col, 100 * results[measure_col] / (results["sum(num_submissions)"] + results["sum(penalized)"]))\
                    .drop(measure_col)
        # Preparing to send to Kafka
        # Renaming and dropping columns
        results = results\
            .withColumn("latency", results["sum(latency)"] / results["sum(num_submissions)"])\
            .withColumnRenamed("sum(penalized)", "penalized")\
            .withColumnRenamed("sum(num_submissions)", "num_submissions")\
            .withColumnRenamed("prediction_user_id", "user_id")\
            .drop("sum(latency)") \
            .writeStream \
            .format("console") \
            .outputMode("update") \
            .start()
        # Sending stream to Kafka
       #  output_stream = results \
        #     .selectExpr("to_json(struct(*)) AS value")\

        """
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("topic", self.competition.name.lower().replace(" ", "") + 'spark_measures') \
            .option("checkpointLocation", "/tmp/checkpoint") \
            .outputMode("update") \
            .start()
        """

        pred = predictions_with_watermark.writeStream.format("console").start()
        rec = records_with_watermark.writeStream.format("console").start()
