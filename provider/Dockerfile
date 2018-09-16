############################################################
# Dockerfile to build Python WSGI Application Containers
# Based on Ubuntu
############################################################

# Set the base image to Ubuntu
FROM nedeljkoradulovic88/base1604:v5
# File Author / Maintainer
MAINTAINER Nedeljko Radulovic

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
RUN pip3 install -U numpy
RUN pip3 install -U .

WORKDIR /my_application

# Set the default command to execute    
# when creating a new container
# i.e. using CherryPy to serve the application

#CMD python producer.py 
ENTRYPOINT ["python3"]
CMD ["views.py"]
