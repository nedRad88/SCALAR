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

Download the code locally and then adjust the [config.json](my_application/config.json) file. More details in [config-ReadMe.txt](provider/config-ReadMe.txt).

Once the [config.json](my_application/config.json) is adjusted, the platform can be run by:

```
docker-compose up
```

This command will pull all necessary containers and run them.
When all services are up, web application will be available on [localhost:80](http://localhost:80)

Register to the platform and confirm your account following the link sent in the registration e-mail.

To register as an ADMIN user, to be able to create the competition, you will have to change your User type in SQL database.

To get to know around the platform use the tutorial provided in [Starter Pack](https://bigmine.github.io/real-time-ML-competition/Starter_pack.zip).

## Authors

* **Nedeljko Radulovic**
* **Dihia Boulegane**
* **Albert Bifet**

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

Open source Docker containers were used:
* [Mongo-Express](https://hub.docker.com/_/mongo-express)
* [MongoDB](https://hub.docker.com/_/mongo)
* [Spark Docker container by GettyImages](https://hub.docker.com/r/gettyimages/spark)
* [MySQL](https://hub.docker.com/_/mysql)
* [phpMyAdmin](https://hub.docker.com/r/phpmyadmin/phpmyadmin)
* [Kafka by Wurstmeister](https://hub.docker.com/r/wurstmeister/kafka)
* [Zookeeper by Wurstmeister](https://hub.docker.com/r/wurstmeister/zookeeper)
