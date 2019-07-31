import time
import grpc
from concurrent import futures
import json
import os
from importlib.machinery import SourceFileLoader
import sys

_ONE_DAY_IN_SECONDS = 60 * 60 * 24

with open('config.json') as json_data_file:
    config = json.load(json_data_file)


_UPLOAD_REPO = config['UPLOAD_REPO']
_COMPETITION_GENERATED_CODE = config['COMPETITION_GENERATED_CODE']


class StreamServer:
    server = None

    def __init__(self):

        if self.server is None:
            self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=100))
            # print("Initializing stream server: 1")
            # self.server.add_insecure_port('http://streamigchallenge.cloudapp.net:50051')
            # self.server.add_insecure_port('http://streamingcompetition.francecentral.cloudapp.azure.com:50051')
            # print("***********Adding server***********")
            self.server.add_insecure_port('0.0.0.0:50051')
            # print("added port to stream server: 2")
            # self.server.add_insecure_port('172.22.0.5:50051')
            self.server.start()
            # print("started stream server: ")

    def add_server(self, streamer, competition):

        pb2_grpc_file_path = os.path.join(_UPLOAD_REPO, _COMPETITION_GENERATED_CODE, competition.name,
                                          'file_pb2_grpc.py')
        file_pb2_grpc = SourceFileLoader('file_pb2_grpc', pb2_grpc_file_path).load_module()

        file_pb2_grpc.add_DataStreamerServicer_to_server(streamer, self.server)


if __name__ == "__main__":

    try:
        while True:
            time.sleep(_ONE_DAY_IN_SECONDS)
    except KeyboardInterrupt:
        server.stop(0)  # ???
