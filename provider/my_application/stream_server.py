
# Copyright 2020 Nedeljko Radulovic, Dihia Boulegane, Albert Bifet
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import time
import grpc
from concurrent import futures
import json
import os
from importlib.machinery import SourceFileLoader

_ONE_DAY_IN_SECONDS = 60 * 60 * 24

with open('config.json') as json_data_file:
    config = json.load(json_data_file)


_UPLOAD_REPO = config['UPLOAD_REPO']
_COMPETITION_GENERATED_CODE = config['COMPETITION_GENERATED_CODE']


class StreamServer:
    """
    StreamServer class. It handles the communication through gRPC/Protobuf.
    """
    server = None

    def __init__(self, server_port, options):
        """
        Start gRPC server to be able to communicate with multiple users.
        :param server_port:
        :param options:
        """
        if self.server is None:
            self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=100), options=options)
            self.port = server_port

    def add_server(self, streamer, competition):
        """
        Define the communication protocol, e.g. import the methods and data structures that define protocol, from the
        files that are generated after compiling .proto file.
        :param streamer:
        :param competition:
        :return:
        """
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
