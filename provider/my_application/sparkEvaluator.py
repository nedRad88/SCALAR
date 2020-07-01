from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.sql import functions as F


def evaluate(spark_context, kafka_broker, competition, competition_config, window_duration, prediction_window_duration,
             train_schema, prediction_schema, columns_to_sum, checkpoints, targets):
    """
    The function for online evaluation of the incremental predicting models.

    :param spark_context:
    :param kafka_broker: Address of kafka server
    :param competition: Competition object
    :param competition_config: Competition configuration dictionary
    :param window_duration: Time (in seconds) to keep the test batches in the memory when performing a join
    :param prediction_window_duration: Time (in seconds) to keep the predictions in the memory when performing a join
    :param train_schema: Column names and types in the training batch
    :param prediction_schema: Column names and types in the prediction batch
    :param columns_to_sum: Columns to aggregate for evaluation
    :param checkpoints: Checkpoint locations for Spark jobs
    :param targets: target column names
    :return: Writes to MongoDB: instances of the stream, predictions by users and evaluation measures for each user
    """
    golden = spark_context\
        .readStream\
        .format("kafka")\
        .option("kafka.bootstrap.servers", kafka_broker)\
        .option("subscribe", competition.name.lower().replace(" ", "") + 'spark_train')\
        .option("kafkaConsumer.pollTimeoutMs", 5000)\
        .option("failOnDataLoss", "false")\
        .load()\
        .selectExpr("cast (value as string) as json")\
        .select(from_json("json", train_schema).alias("data"))\
        .select("data.*")\
        .withColumn("timestamp_deadline",
                    unix_timestamp('Deadline', "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
        .withColumn("timestamp_released",
                    unix_timestamp('Released', "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
        .drop("Deadline", "Released")\
        .withWatermark("timestamp_released", window_duration)

    # Reading stream of predictions from Kafka
    prediction_stream = spark_context\
        .readStream\
        .format("kafka")\
        .option("kafka.bootstrap.servers", kafka_broker)\
        .option("subscribe", competition.name.lower().replace(" ", "") + 'predictions')\
        .option("kafkaConsumer.pollTimeoutMs", 1000) \
        .option("failOnDataLoss", "false") \
        .load()\
        .selectExpr("cast (value as string) as json")\
        .select(from_json("json", prediction_schema).alias("data"))\
        .select("data.*")\
        .withColumn("timestamp_submitted", unix_timestamp('submitted_on',
                                                          "yyyy-MM-dd HH:mm:ss").cast(TimestampType()))\
        .drop("submitted_on")\
        .withColumnRenamed("rowID", "prediction_rowID")\
        .withWatermark("timestamp_submitted", prediction_window_duration)\
        .dropDuplicates(["user_id", "prediction_competition_id", "prediction_rowID"])

    # Joining two streams, new conditions
    join_result = prediction_stream\
        .join(golden, expr("""rowID = prediction_rowID AND timestamp_submitted >= timestamp_released AND timestamp_submitted <= timestamp_released + interval {}""".format(window_duration)), "leftOuter")\
        .withColumn("total_num", F.lit(1))\
        .withColumn("num_submissions", when(F.col("timestamp_submitted") <= F.col("timestamp_deadline"), 1).otherwise(0))\
        .withColumn("penalized", abs(F.col("num_submissions") - F.lit(1)))\
        .withColumn("latency", when(F.col("num_submissions") == 0, competition.predictions_time_interval).otherwise(unix_timestamp(F.col("timestamp_submitted")) - unix_timestamp(F.col("timestamp_released"))))\
        .drop("timestamp_released", "competition_id", "prediction_competition_id", "prediction_rowID")

    for target in targets:
        prediction_target_col = "prediction_" + target.replace(" ", "")
        for measure in competition_config[target]:
            if measure == "MAPE":
                join_result = join_result\
                    .withColumn("MAPE" + "_" + target, when(join_result[target].isNotNull(), abs((join_result[target] - join_result[prediction_target_col])) / abs(join_result[target])).otherwise(1))\
                    .drop(target, prediction_target_col)

            if measure == "MSE":
                join_result = join_result\
                    .withColumn("MSE" + "_" + target, when(join_result[target].isNotNull(), (join_result[target] - join_result[prediction_target_col]) * (join_result[target] - join_result[prediction_target_col])).otherwise(0))\
                    .drop(target, prediction_target_col)

            if measure == "MAE":
                join_result = join_result\
                    .withColumn("MAE" + "_" + target, when(join_result[target].isNotNull(), abs(join_result[target] - join_result[prediction_target_col])).otherwise(0))\
                    .drop(target, prediction_target_col)

            if measure == "ACC":
                join_result = join_result\
                    .withColumn("ACC" + "_" + target, when(join_result[target] == join_result[prediction_target_col], 1).otherwise(0)) \
                    .drop(target, prediction_target_col)

            #TODO Kappa characteristic

# Dropping unnecessary columns

    # exprs = {x: "sum" for x in columns_to_sum}
    agg_exp = [F.expr('sum(`{0}`)'.format(col)) for col in columns_to_sum] + [F.expr('max(rowID) as max_rowID')]
    # Grouping by user_id and aggregation
    agg_results = join_result\
        .drop("timestamp_deadline", "timestamp_submitted")\
        .groupBy("user_id")\
        .agg(*agg_exp)\
        .withColumn("competition_id", F.lit(competition.competition_id))\
        .withColumn("total_number_of_messages", F.col("max_rowID") - F.lit(competition.initial_batch_size))\
        .drop("max_rowID")

    agg_results = agg_results\
        .withColumn("total_number_of_messages", when(agg_results["total_number_of_messages"].isNotNull(), agg_results["total_number_of_messages"]).otherwise(agg_results["sum(total_num)"]))

    # Calculating batch measures

    for target in targets:
        for measure in competition_config[target]:
            if measure == "MAPE":
                batch_measures = agg_results\
                    .withColumn("MAPE" + "_" + target, 100 * ((agg_results["sum(MAPE" + "_" + target + ")"] + (agg_results["total_number_of_messages"] - agg_results["sum(total_num)"])) / agg_results["total_number_of_messages"])) \
                    .drop("sum(MAPE" + "_" + target + ")")

            if measure == "MSE":
                batch_measures = agg_results\
                    .withColumn("MSE" + "_" + target, agg_results["sum(MSE" + "_" + target + ")"] / agg_results["total_number_of_messages"] + (agg_results["total_number_of_messages"] - agg_results["sum(num_submissions)"])) \
                    .drop("sum(MSE" + "_" + target + ")")

            if measure == "MAE":
                batch_measures = agg_results\
                    .withColumn("MAE" + "_" + target, agg_results["sum(MAE" + "_" + target + ")"] / agg_results["total_number_of_messages"] + (agg_results["total_number_of_messages"] - agg_results["sum(num_submissions)"])) \
                    .drop("sum(MAE" + "_" + target + ")")

            if measure == "ACC":
                batch_measures = agg_results\
                    .withColumn("ACC" + "_" + target, agg_results["sum(ACC" + "_" + target + ")"] / agg_results["total_number_of_messages"]) \
                    .drop("sum(ACC" + "_" + target + ")")

    pred = prediction_stream \
        .selectExpr("to_json(struct(*)) AS value") \
        .writeStream \
        .queryName(competition.name.lower().replace(" ", "") + 'prediction_stream') \
        .trigger(processingTime='30 seconds') \
        .format("kafka") \
        .option("kafka.bootstrap.servers", kafka_broker) \
        .option("topic", competition.name.lower().replace(" ", "") + 'spark_predictions') \
        .option("checkpointLocation", checkpoints[0]) \
        .outputMode("append") \
        .start()

    gold = golden \
        .selectExpr("to_json(struct(*)) AS value") \
        .writeStream \
        .queryName(competition.name.lower().replace(" ", "") + 'training_stream') \
        .format("kafka") \
        .option("kafka.bootstrap.servers", kafka_broker) \
        .option("topic", competition.name.lower().replace(" ", "") + 'spark_golden') \
        .option("checkpointLocation", checkpoints[1]) \
        .outputMode("append") \
        .start()

    output_stream = batch_measures \
        .withColumn("latency", batch_measures["sum(latency)"] / (batch_measures["sum(total_num)"])) \
        .withColumnRenamed("sum(penalized)", "penalized") \
        .withColumnRenamed("sum(num_submissions)", "num_submissions") \
        .drop("sum(latency)", "sum(total_num)") \
        .selectExpr("to_json(struct(*)) AS value") \
        .writeStream \
        .queryName(competition.name.lower().replace(" ", "") + 'measure_stream') \
        .trigger(processingTime='30 seconds') \
        .format("kafka") \
        .option("kafka.bootstrap.servers", kafka_broker) \
        .option("topic", competition.name.lower().replace(" ", "") + 'spark_measures') \
        .option("checkpointLocation", checkpoints[2]) \
        .outputMode("update") \
        .start()

    spark_context.streams.awaitAnyTermination()
