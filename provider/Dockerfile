############################################################
# Dockerfile to build Python WSGI Application Containers
# Based on Ubuntu
############################################################

# Set the base image to Ubuntu
FROM nedeljkoradulovic88/base1604:v5

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
RUN pip3 uninstall -y pyspark
RUN pip3 install -U pyspark==2.4.0
RUN pip3 install -U confluent-kafka
RUN pip3 install -U orjson
RUN pip3 install -U .
RUN pip3 uninstall -y grpcio==1.13.0
RUN pip3 install grpcio==1.13.0 --no-binary grpcio

WORKDIR /my_application

ENV WAIT_VERSION 2.7.3
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/$WAIT_VERSION/wait /wait
RUN chmod +x /wait


ENTRYPOINT ["python3"]
CMD ["views.py"]
