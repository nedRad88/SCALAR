Instructions for client using Python

You should have Python installed on your computer.
You can first install pip:
sudo apt-get install python-pip (if you are using Python2.x)
or
sudo apt-get install python3-pip(if you are using Python3.x)

then:

pip install grpcio
pip install grpcio-tools


Use client.py script and edit loop_messages() method in order to build model and predict.



********* IMPORTANT ********
Download the .proto file from the competition page and copy it in this folder.
Compile the .proto file using protoc command with output parameter set for Python.

protoc example:
python -m grpc_tools.protoc -I=. --python_out=. --grpc_python_out=. file.proto 

