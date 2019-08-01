from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import os
from functools import reduce
# from skmultiflow.metrics import ConfusionMatrix
# TODO deal with skmultiflow

# bin/pyspark --packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 # in container
# os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 pyspark-shell'
# spark = SparkSession.builder.appName("Kafka_structured_streaming").getOrCreate()


class SparkEvaluator:
    def __init__(self, spark_context, kafka_server, competition, competition_config, classes, regression_measures,
                 classification_measures):
        self.sc = spark_context
        self.broker = kafka_server  # 172.22.0.2:9092
        self.competition = competition
        self.config = competition_config
        self.regression = False
        self.classes = classes
        self.regression_measures = regression_measures
        self.classification_measures = classification_measures
        # os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 pyspark-shell'

    def main(self, window_duration, prediction_window_duration, train_schema, prediction_schema,
             prediction_target_columns, measure_columns, target_columns, sum_columns,
             columns_to_sum, checkpoints, targets, confusion_matrix):
        # Reading stream of records from Kafka
        golden = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_train') \
            .option("kafkaConsumer.pollTimeoutMs", self.competition.predictions_time_interval * 1000) \
            .load()\
            .selectExpr("cast (value as string) as json")\
            .select(from_json("json", train_schema).alias("data"))\
            .select("data.*") \
            .withColumn("timestamp_deadline",
                        unix_timestamp('Deadline', "yyyy-MM-dd HH:mm:ss").cast(TimestampType())) \
            .withColumn("timestamp_released",
                        unix_timestamp('Released', "yyyy-MM-dd HH:mm:ss").cast(TimestampType())) \
            .drop("Deadline") \
            .drop("Released") \
            .withWatermark("timestamp_deadline", window_duration)

        # Reading stream of predictions from Kafka
        prediction_stream = self.sc \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("subscribe", self.competition.name.lower().replace(" ", "") + 'spark_predictions') \
            .option("kafkaConsumer.pollTimeoutMs", self.competition.predictions_time_interval * 1000)\
            .load()\
            .selectExpr("cast (value as string) as json") \
            .select(from_json("json", prediction_schema).alias("data")) \
            .select("data.*") \
            .withColumn("timestamp_submitted", unix_timestamp('submitted_on',
                                                              "yyyy-MM-dd HH:mm:ss").cast(TimestampType())) \
            .drop("submitted_on") \
            .withColumnRenamed("rowID", "prediction_rowID")\
            .withColumnRenamed("competition_id", "prediction_competition_id")\
            .dropDuplicates(["rowID", "competition_id", "user_id"])

        predictions = reduce(lambda data, idx: data.withColumnRenamed(target_columns[idx],
                                                                      prediction_target_columns[idx]),
                             range(len(target_columns)), prediction_stream)
        predictions = predictions \
            .withWatermark("timestamp_submitted", prediction_window_duration)

        # Joining two streams
        join_result = predictions.join(
           golden,
           expr("""
           rowID = prediction_rowID AND
           timestamp_deadline >= timestamp_submitted AND
           timestamp_submitted >= timestamp_deadline - interval {}
           """.format(prediction_window_duration)), "leftOuter")\
            .drop("prediction_rowID")\
            .drop("prediction_competition_id")\
            .drop("competition_id") \
            .withColumn("total_num", lit(1)) \
            .withColumn("num_submissions",
                        when(col("timestamp_submitted") <= col("timestamp_deadline"), 1).otherwise(0)) \
            .withColumn("penalized", abs(col("num_submissions") - lit(1))) \
            .withColumn("latency", when(col("num_submissions") == 0, self.competition.predictions_time_interval)
                        .otherwise(unix_timestamp(col("timestamp_submitted")) - unix_timestamp(col("timestamp_released")))) \
            .drop("rowID") \
            .drop("timestamp_released")

        # Creating columns for:
        # number of submissions: this column has value 1 if the submission was before deadline, otherwise 0
        # latency: this column represents the difference between submission time and publishing time (released)
        # penalized: if submission was after the deadline then penalized column has value 1, otherwise 0

        # Calculation on measures for individual predictions

        join_table = reduce(lambda data, idx: data.withColumn(prediction_target_columns[idx],
                                                              when(data["timestamp_submitted"] >
                                                                   data["timestamp_deadline"], 0)
                                                              .otherwise(data[prediction_target_columns[idx]])),
                            range(len(prediction_target_columns)), join_result)
        """
        join_table = reduce(lambda data, idx: data.withColumnRenamed(prediction_target_columns[idx] + '_tmp',
                                                                     prediction_target_columns[idx]),
                            range(len(prediction_target_columns)), join_table1)
                            """

        for target in targets:
            prediction_target_col = "prediction_" + target.replace(" ", "")
            for measure in self.config[target]:
                if measure == "MAPE":
                    join_table = join_table.withColumn("MAPE" + "_" + target,
                                                       when(join_table[target].isNotNull(),
                                                            abs((join_table[target] - join_table[
                                                                prediction_target_col]))
                                                            / abs(join_table[target])).otherwise(1)) \
                        .drop(target) \
                        .drop(prediction_target_col)

                if measure == "MSE":
                    join_table = join_table.withColumn("MSE" + "_" + target,
                                                       when(join_table[target].isNotNull(),
                                                            (join_table[target] - join_table[prediction_target_col]) *
                                                            (join_table[target] - join_table[prediction_target_col]))
                                                       .otherwise(1))\
                        .drop(target)\
                        .drop(prediction_target_col)

                if measure == "MAE":
                    join_table = join_table.withColumn("MAE" + "_" + target,
                                                       when(join_table[target].isNotNull(),
                                                            abs(join_table[target] - join_table[prediction_target_col]))
                                                       .otherwise(1)) \
                        .drop(target)\
                        .drop(prediction_target_col)

                if measure == "ACC":
                    join_table = join_table.withColumn("ACC" + "_" + target,
                                                       when(join_table[target] == join_table[prediction_target_col],
                                                            1).otherwise(0)) \
                        .drop(target) \
                        .drop(prediction_target_col)
            """
            if measure == "kappa":
                kappa = {}
                for row in join_table:
                    true_label_idx = self.classes[str(targets[0])].index(row[str(targets[0])])
                    predicted_label_idx = self.classes[str(targets[0])].index(row["prediction_" + str(targets[0])])
                    if row["user_id"] not in confusion_matrix:
                        confusion_matrix[row["user_id"]] = ConfusionMatrix(n_targets=len(self.classes[str(targets[0])]))
                        confusion_matrix[row["user_id"]].update(i=true_label_idx, j=predicted_label_idx)
                    else:
                        confusion_matrix[row["user_id"]].update(i=true_label_idx, j=predicted_label_idx)
    
                for key, value in confusion_matrix.items():
                    kappa[key] = value.get_kappa()
                    
                    
            """

        # Dropping unnecessary columns

        exprs = {x: "sum" for x in columns_to_sum}
        # Grouping by user_id and aggregation
        results = join_table\
            .drop("timestamp_deadline")\
            .drop("timestamp_submitted")\
            .groupBy("user_id")\
            .agg(exprs)\
            .withColumn("competition_id", lit(self.competition.competition_id))
        # Calculating batch measures

        for target in targets:
            for measure in self.config[target]:
                if measure == "MAPE":
                    results_final = results.withColumn("MAPE" + "_" + target,
                                                       100 * results["sum(MAPE" + "_" + target + ")"] /
                                                       results["sum(total_num)"])\
                                           .drop("sum(MAPE" + "_" + target + ")")

                if measure == "MSE":
                    results_final = results.withColumn("MSE" + "_" + target,
                                                       results["sum(MSE" + "_" + target + ")"] /
                                                       results["sum(total_num)"])\
                                           .drop("sum(MSE" + "_" + target + ")")

                if measure == "MAE":
                    results_final = results.withColumn("MAE" + "_" + target,
                                                       results["sum(MAE" + "_" + target + ")"] /
                                                       results["sum(total_num)"])\
                                           .drop("sum(MAE" + "_" + target + ")")

                if measure == "ACC":
                    results_final = results.withColumn("ACC" + "_" + target,
                                                       results["sum(ACC" + "_" + target + ")"] /
                                                       results["sum(total_num)"])\
                                           .drop("sum(ACC" + "_" + target + ")")

        # Preparing to send to Kafka
        # Renaming and dropping columns

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
        # .selectExpr("to_json(struct(*)) AS value") \
        pred = predictions \
            .selectExpr("to_json(struct(*)) AS value") \
            .writeStream \
            .queryName(self.competition.name.lower().replace(" ", "") + 'prediction_stream') \
            .trigger(processingTime=prediction_window_duration) \
            .format("kafka")\
            .option("kafka.bootstrap.servers", self.broker) \
            .option("topic", self.competition.name.lower().replace(" ", "") + 'dead_end') \
            .option("checkpointLocation", checkpoints[0]) \
            .outputMode("append") \
            .start()

        gold = golden \
            .selectExpr("to_json(struct(*)) AS value") \
            .writeStream \
            .queryName(self.competition.name.lower().replace(" ", "") + 'training_stream') \
            .trigger(processingTime=prediction_window_duration) \
            .format("kafka")\
            .option("kafka.bootstrap.servers", self.broker) \
            .option("topic", self.competition.name.lower().replace(" ", "") + 'dead_end2') \
            .option("checkpointLocation", checkpoints[1]) \
            .outputMode("append") \
            .start()

        output_stream = results_final \
            .withColumn("latency", results_final["sum(latency)"] / (
                    results_final["sum(total_num)"])) \
            .withColumnRenamed("sum(penalized)", "penalized") \
            .withColumnRenamed("sum(num_submissions)", "num_submissions") \
            .drop("sum(latency)") \
            .drop("sum(total_num)") \
            .selectExpr("to_json(struct(*)) AS value") \
            .writeStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.broker) \
            .option("topic", self.competition.name.lower().replace(" ", "") + 'spark_measures') \
            .option("checkpointLocation", checkpoints[2]) \
            .outputMode("update") \
            .start()

        pred.awaitTermination()
        gold.awaitTermination()
        # output_stream.awaitTermination()

    def run(self):

        targets = []

        for key in self.config.keys():
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
            .add("competition_id", IntegerType(), False) \
            .add("user_id", IntegerType(), False)

        for target in targets:
            # Decide weather it is regression or classification
            for measure in self.config[target.replace(" ", "")]:
                if measure in self.regression_measures:
                    self.regression = True
                    if target not in train_schema.fieldNames():
                        train_schema.add(target, StringType(), False)
                    if target not in prediction_schema.fieldNames():
                        prediction_schema.add(target, FloatType(), False)
                elif measure in self.classification_measures:
                    self.regression = False
                    if target not in train_schema.fieldNames():
                        train_schema.add(target, StringType(), False)
                    if target not in prediction_schema.fieldNames():
                        prediction_schema.add(target, StringType(), False)

        # return train_schema, prediction_schema, targets  # , test_schema, init_schema
        # Time window duration for watermarking
        window_duration = str(2 * self.competition.predictions_time_interval) + " " + "seconds"
        prediction_window_duration = str(self.competition.predictions_time_interval) + " " + "seconds"

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
            for measure in self.config[target.replace(" ", "")]:
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

        checkpoint_locations = ["/tmp/" + self.competition.name.lower().replace(" ", "") + "prediction_checkpoint",
                                "/tmp/" + self.competition.name.lower().replace(" ", "") + "training_checkpoint",
                                "/tmp/" + self.competition.name.lower().replace(" ", "") + "measure_checkpoint"]

        confusion_matrix_dict = {}

        self.main(window_duration=window_duration,
                  prediction_window_duration=prediction_window_duration,
                  train_schema=train_schema,
                  prediction_schema=prediction_schema,
                  prediction_target_columns=prediction_target_columns,
                  target_columns=target_columns,
                  sum_columns=sum_columns,
                  measure_columns=measure_columns,
                  columns_to_sum=columns_to_sum,
                  checkpoints=checkpoint_locations,
                  targets=targets,
                  confusion_matrix=confusion_matrix_dict)
