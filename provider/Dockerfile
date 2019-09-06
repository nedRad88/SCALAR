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

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 10

RUN apt-get -y update
    
# Expose ports
EXPOSE 50051
EXPOSE 9092
EXPOSE 27017
EXPOSE 5005
# EXPOSE 8000

# Set the default directory where CMD will execute
WORKDIR /my_application/Multiflow/scikit-multiflow-master
RUN pip3 install --upgrade pip
RUN pip3 install -U numpy
RUN pip3 uninstall -y kafka-python
RUN pip3 install -U kafka-python
RUN pip3 uninstall -y pyspark
RUN pip3 install -U pyspark==2.4.0
RUN pip3 install -U confluent-kafka
RUN pip3 install -U orjson
RUN pip3 install -U .
RUN pip3 install flask gunicorn


WORKDIR /my_application

# Set the default command to execute    
# when creating a new container
# i.e. using CherryPy to serve the application

# CMD ["gunicorn", "--bind", "0.0.0.0:8000" , "--limit-request-line", "0", "--log-level", "DEBUG", "wsgi"]


#COPY nginx.conf /etc/nginx
#RUN chmod +x ./start.sh
#CMD ["./start.sh"]

#CMD python producer.py 
ENTRYPOINT ["python3"]
CMD ["views.py"]
