from __future__ import print_function
from pyspark.sql import SparkSession
from pyspark.sql.functions import explode
from pyspark.sql.functions import split

import os

os.environ['PYSPARK_SUBMIT_ARGS'] = '--packages org.apache.spark:spark-sql-kafka-0-10_2.11:2.3.1 pyspark-shell'

spark = SparkSession \
    .builder \
    .appName("StructuredKafkaWordCount") \
    .getOrCreate()

# Create DataFrame representing the stream of input lines from connection to localhost:9999
lines1 = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "test1") \
    .load()

# Split the lines into words
words1 = lines1.select(
   explode(
       split(lines1.value, " ")
   ).alias("word")
)

# Generate running word count
wordCounts1 = words1.groupBy("word").count()



lines3 = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "test3") \
    .load()

# Split the lines into words
words3 = lines3.select(
   explode(
       split(lines3.value, " ")
   ).alias("word")
)

# Generate running word count
wordCounts3 = words3.groupBy("word").count()

# Start running the query that prints the running counts to the console
query1 = wordCounts1 \
    .writeStream \
    .outputMode("complete") \
    .format("console") \
    .start()


# Start running the query that prints the running counts to the console
query3 = wordCounts3 \
    .writeStream \
    .outputMode("complete") \
    .format("console") \
    .start()


query1.awaitTermination()
query3.awaitTermination()