from __future__ import print_function
import grpc
from google.protobuf import json_format
import file_pb2
import file_pb2_grpc
from threading import Thread
import json
from collections.abc import Iterator
import itertools
from json.encoder import JSONEncoder
import ast
from multiprocessing import Queue
import time
try:
    import queue
except ImportError:
    import Queue as queue


class Client:
    """ gRPC Client class for streaming competition platform"""
    channel = None
    stub = None

    def __init__(self, batch_size):
        """

        :param batch_size: Integer value, defined by the competition and available at competition page
        :param server_port: Connection string ('IP:port')
        :param user_email: String, e-mail used for registering to competition
        :param token: String, received after subscription to a competition
        :param competition_code: String, received after subscription to a competition
        :param first_prediction: Prediction, class generated from .proto file. Used to initiate communication with the
        server. Not influencing the results. Should contain appropriate fields from .proto file.
        """

        self.batch_size = batch_size
        self.stop_thread = False
        self.predictions_to_send = Queue()
        self.channel = grpc.insecure_channel('localhost:50051')
        self.stub = file_pb2_grpc.DataStreamerStub(self.channel)
        self.user_email = 'admin'
        self.competition_code = 'XW'
        self.token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJjb21wZXRpdGlvbl9pZCI6MzF9.vlzKwaGcNvc9mZUjKNayNezZSnkP2cUEuUU4cj5aT0U'
        # self.predictions_to_send.put(file_pb2.Prediction(rowID=1000, target=333))
        self.metadata = self.create_metadata(user_id=self.user_email, code=self.competition_code, token=self.token)

    @staticmethod
    def create_metadata(user_id, code, token):
        """

        :param user_id:
        :param code:
        :param token:
        :return:
        """
        metadata = [(b'authorization', bytes(token, 'utf-8')), (b'user_id', bytes(user_id, 'utf-8')),
                    (b'competition_id', bytes(code, 'utf-8'))]
        return metadata

    def generate_predictions(self):
        """
        Sending predictions

        :return: Prediction
        """
        while True:
            try:
                prediction = self.predictions_to_send.get(block=True, timeout=60)
                print("Prediction: ", prediction)
                yield prediction
            except queue.Empty:
                self.stop_thread = True
                break

    def loop_messages(self):
        """
        Getting messages (data instances) from the stream.

        :return:
        """
        messages = self.stub.sendData(self.generate_predictions(), metadata=self.metadata)
        try:
            for message in messages:
                message = json.loads(json_format.MessageToJson(message))
                if message['tag'] == 'TEST':
                    # v = message['target'] + 10
                    v = 543
                    prediction = file_pb2.Prediction(rowID=message['rowID'], target=v)
                    self.predictions_to_send.put(prediction)
                if message['tag'] == 'INIT':
                    i = 1
                if message['tag'] == 'TRAIN':
                    i = 1
                if self.stop_thread:
                    break
        except Exception as e:
            print(str(e))
            pass

    def run(self):
        """
        Start thread.
        """
        print("Start")
        t1 = Thread(target=self.loop_messages)
        t1.start()


if __name__ == "__main__":
    client_1 = Client(batch_size=5)
    client_1.run()

