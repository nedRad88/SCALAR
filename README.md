# SCALAR - Streaming ChALlenge plAtfoRm

SCALAR is the first of its kind, platform to organize Machine Learning competitions on Data Streams.
It was used to organize a real-time ML competition on IEEE Big Data Cup Challenges 2019.

## Getting Started

The project is done in Python and organized in Docker containers.
Each service is a separate Docker container.

### Prerequisites

To run the platform locally, Docker is needed:

[Install Docker](https://docs.docker.com/get-docker/)

Also, Docker compose should be installed:

[Install Docker compose](https://docs.docker.com/compose/install/)

### Running

Running is done using Docker-compose.

 - Download the code locally and then adjust the [config.json](provider/my_application/config.json) and [docker-compose.yml](./docker-compose.yml) files. More details in [config-ReadMe.txt](provider/config-ReadMe.txt) and in [docker-compose-ReadMe.txt](./docker-compose-ReadMe.txt).

 - Set up an email account which will be used to send the registration confirmation message and authentication token.
For that, you will need to set up your email account to allow the access of less secure apps.
For a quick start, update only email information in [config.json](provider/my_application/config.json).

 - In [docker-compose.yml](./docker-compose.yml) update only the local paths to mount a persistent volumes, following the [docker-compose-ReadMe.txt](./docker-compose-ReadMe.txt).

 - To run the SCALAR application using Docker-compose, first create the Docker bridge network on your local machine:
```
docker network create --driver=bridge --subnet=172.22.0.0/16 --ip-range=172.22.0.0/24 --gateway=172.22.0.1 provider-network

```
You can choose the IP ranges according to your preferences.

 - Once the [config.json](provider/my_application/config.json) and [docker-compose.yml](./docker-compose.yml) have been set up and Docker network has been created,
  the platform can be run by:

```
docker-compose up
```

This command will pull all necessary containers and run them.
When all services are up, web application will be available on [localhost:80](http://localhost:80)

Register to the platform and confirm your account following the link sent in the registration e-mail.

To register as an ADMIN user, to be able to create the competition, you will have to change your User type ADMIN in MySQL database.

From terminal, connect to the MySQL database. Fetch the ip-address of the 'sql_db' container:
```
docker inspect sql_db
```
Then connect to the database `sample`, and in the table `USERS`, change your role to `ADMIN` instead of `USER`:
```
mysql -u mysql -pmysql -h sql_db_IP_address sample
```
After this change, restart the platform.

To get to know around the platform use the tutorial provided in [Starter Pack](https://bigmine.github.io/real-time-ML-competition/Starter_pack.zip).

## Authors

* **Nedeljko Radulovic**
* **Dihia Boulegane**
* **Albert Bifet**


## Acknowledgments

Open source Docker containers were used:
* [MongoDB](https://hub.docker.com/_/mongo)
* [Spark Docker container by GettyImages](https://hub.docker.com/r/gettyimages/spark)
* [MySQL](https://hub.docker.com/_/mysql)
* [Kafka by Wurstmeister](https://hub.docker.com/r/wurstmeister/kafka)
* [Zookeeper by Wurstmeister](https://hub.docker.com/r/wurstmeister/zookeeper)

## References

* [Boulegane, Dihia, et al. "Real-Time Machine Learning Competition on Data Streams at the IEEE Big Data 2019." 2019 IEEE International Conference on Big Data (Big Data). IEEE, 2019.](https://ieeexplore.ieee.org/abstract/document/9006357?casa_token=f0mJeR8-WfYAAAAA:yEt_Mix9dumrPpo64uPBbI0XI4Kvfim4Pkg5xNVVzXqK4AGToX0XcJPKgETkE1hs86Pcc0u5xYc)
