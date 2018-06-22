import imp
from grpc_tools import protoc
import os

#protoc.main(('', '-I.','--python_out=.','--grpc_python_out=.', os.path.join('/home/dihia/Desktop/work/kafka-python-client/provider/my_application/protos/','file.proto'),))
file_pb2 = imp.load_source('esamplestreaming_pb2',  'examplestreaming_pb2.py')
DataStreamerServicer = imp.load_source('examplestreaming_pb2_grpc', 'examplestreaming_pb2_grpc.py')