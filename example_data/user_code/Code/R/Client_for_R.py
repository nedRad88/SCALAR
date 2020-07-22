from __future__ import print_function
import grpc
from google.protobuf import json_format
import file_pb2
import file_pb2_grpc
from threading import Thread
import json
from collections import Iterator
import itertools
from json.encoder import JSONEncoder
import ast
from multiprocessing import Queue
try:
    import queue
except ImportError:
    import Queue as queue


class Client:
    """ gRPC Client class for streaming competition platform"""
    channel = None
    stub = None

    def __init__(self, batch_size, server_port, user_email, token, competition_code, first_prediction):
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
        self.messages = Queue()
        self.server_port = server_port
        self.channel = grpc.insecure_channel(server_port)
        self.stub = file_pb2_grpc.DataStreamerStub(self.channel)
        self.user_email = user_email
        self.competition_code = competition_code
        self.token = token
        self.predictions_to_send = [first_prediction]
        self.metadata = self.create_metadata(user_id=user_email, code=competition_code, token=token)

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
                pred = self.predictions_to_send.pop()
                prediction_as_dict = ast.literal_eval(pred)
                new_dict = {}
                for key, value in prediction_as_dict.items():
                    if isinstance(value, list) and len(value) == 1:
                        new_dict[key] = value[0]
                    else:
                        new_dict[key] = value
                prediction = file_pb2.Prediction(**new_dict)
                # print("Prediction: ", prediction)
                yield prediction
                if self.stop_thread and not self.predictions_to_send:
                    break
            except Exception as e:
                pass

    def loop_messages(self):
        """
        Getting messages (data instances) from the stream.

        :return:
        """
        messages = self.stub.sendData(self.generate_predictions(), metadata=self.metadata)
        try:
            for message in messages:
                message = json.loads(json_format.MessageToJson(message))
                encoder = JSONEncoder()
                mes = encoder.encode(message)
                mes = mes.replace(" ", "")
                self.messages.put(mes)
        except Exception as e:
            print(str(e))
            pass

    def retrieve_messages(self):
        try:
            queue_record = self.messages.get(block=True, timeout=60)
        except queue.Empty:
            queue_record = None
            pass
        if queue_record is None:
            self.stop_thread = True
            return "Stop"
        else:
            return queue_record

    def run(self):
        """
        Start thread.
        """
        print("Start")
        t1 = Thread(target=self.loop_messages)
        t1.start()

