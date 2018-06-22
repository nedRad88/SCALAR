from pyspark import SparkContext
from pyspark.streaming import StreamingContext
from pyspark.streaming.kafka import KafkaUtils
from pyspark.sql import SparkSession
import json


class SparkEvaluator:
    def __init__(self, kafka_server, competition, predictions_input_address, predictions_port):
        self.kafkaServer = kafka_server # 172.22.0.2
        self.competition = competition
        self.socket_input = predictions_input_address
        self.socket_port = predictions_port # 6066
        self.topic = competition.name.lower().replace

    def main(self):
        sc = SparkContext("local[*]", "StreamingEvaluation")
        ssc = StreamingContext(sc, self.competition.prediction_time_interval)
        kafkaStream = KafkaUtils.createStream(ssc, "172.22.0.2:9092", "spark-stream-consumer",
                                              {self.competition.name.lower().replace(" ", ""): 1})
        prediction_stream = ssc.socketTextStream("localhost", self.socket_port)
        records = kafkaStream.map(lambda message: json.loads(message[1]))
        predictions = prediction_stream.map(lambda prediction: json.loads(prediction[1]))






        ssc.start()
        ssc.awaitTermination()

