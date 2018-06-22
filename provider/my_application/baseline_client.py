from __future__ import print_function
import grpc
from google.protobuf import json_format
import file_pb2
import file_pb2_grpc
from threading import Thread
import json
from multiprocessing import Queue
try:
    import queue
except ImportError:
    import Queue as queue


class baselineClient:
    """ gRPC Client class for streaming competition platform"""
    channel = None
    stub = None

    def __init__(self, batch_size, user, target):
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
        self.user_email = str(user['email'])
        self.competition_code = str(user['competition_code'])
        self.token = str(user['user_secret_key'])
        self.targets = target
        self.predictions_to_send.put(file_pb2.Prediction(rowID=1000, Valeurs=333))
        self.metadata = self.create_metadata(user_id=self.user_email, code=self.competition_code, token=self.token)

    @staticmethod
    def create_first_prediction(targets):

        prediction_dict = {'rowID': 1000}
        new_dict = {}
        for t in targets:
            prediction_dict[str(t)] = None
        for key, value in prediction_dict.items():
            new_dict[key] = value
        return file_pb2.Prediction(**new_dict)

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
        sum_values = {}
        num_records = {}
        messages = self.stub.sendData(self.generate_predictions(), metadata=self.metadata)
        try:
            for message in messages:
                message = json.loads(json_format.MessageToJson(message))
                print(message)
                if message['tag'] == 'TEST':
                    prediction_dict = {'rowID': message['rowID']}
                    for key, value in sum_values.items():
                        prediction_dict[key] = sum_values[key]/num_records[key]
                    prediction = file_pb2.Prediction(**prediction_dict)
                    self.predictions_to_send.put(prediction)
                if message['tag'] == 'INIT':
                    for target in self.targets:
                        if not num_records[target]:
                            num_records[target] = 1
                        else:
                            num_records[target] += 1

                        if not sum_values[target]:
                            sum_values[target] = message[target]
                        else:
                            sum_values[target] += message[target]
                if message['tag'] == 'TRAIN':
                    for target in self.targets:
                        num_records[target] += 1
                        sum_values[target] += message[target]
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
