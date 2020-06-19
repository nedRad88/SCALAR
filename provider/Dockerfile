############################################################
# Dockerfile to build Python WSGI Application Containers
# Based on Ubuntu
############################################################

# Set the base image to Ubuntu
FROM nedeljkoradulovic88/base_debian:latest

# File Author / Maintainer
LABEL MAINTEINER="Nedeljko Radulovic"

# Copy directory
WORKDIR /my_application
ADD my_application /my_application

# Expose ports
EXPOSE 50051
EXPOSE 9092
EXPOSE 27017
EXPOSE 5005

# Set the default directory where CMD will execute
WORKDIR /my_application/Multiflow/scikit-multiflow-master
RUN pip3 install --upgrade pip
RUN pip3 install -U numpy
RUN pip3 install -U pyspark==2.4.0
RUN pip3 install -U confluent-kafka
RUN pip3 install -U orjson
RUN pip3 install -U .
RUN pip3 uninstall -y grpcio==1.13.0
RUN pip3 uninstall -y grpcio-tools
RUN pip3 install grpcio-tools==1.13.0
RUN pip3 install grpcio==1.13.0 --no-binary grpcio

WORKDIR /my_application

# Set the default command to execute    
# when creating a new container
# i.e. using CherryPy to serve the application

#CMD python producer.py 
ENTRYPOINT ["python3"]
CMD ["views.py"]
