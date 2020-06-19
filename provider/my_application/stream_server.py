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

    def __init__(self, server_port, options):

        if self.server is None:
            self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=100), options=options)
            self.port = server_port

    def add_server(self, streamer, competition):

        pb2_grpc_file_path = os.path.join(_UPLOAD_REPO, _COMPETITION_GENERATED_CODE, competition.name,
                                          'file_pb2_grpc.py')
        file_pb2_grpc = SourceFileLoader('file_pb2_grpc', pb2_grpc_file_path).load_module()

        file_pb2_grpc.add_DataStreamerServicer_to_server(streamer, self.server)

    def start_server(self):
        self.server.add_insecure_port(self.port)
        self.server.start()

    def _wait_forever(self):
        try:
            while True:
                time.sleep(_ONE_DAY_IN_SECONDS)
        except KeyboardInterrupt:
            self.server.stop(None)


if __name__ == "__main__":

    try:
        while True:
            time.sleep(_ONE_DAY_IN_SECONDS)
    except KeyboardInterrupt:
        server.stop(0)  # ???
