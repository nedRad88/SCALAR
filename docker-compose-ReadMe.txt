#####################################################
####						 ####
####            Docker-compose ReadMe            ####  
####						 ####
#####################################################

In docker-compose.yml file, you need to setup usernames, passwords and local volumes according to your host machine.

1. Kafka service:
  In Kafka service definition, replace >>USER<< for "KAFKA_ADVERTISED_LISTENERS" with your local user.
  Set up the environment variable to align the timezone of the container with the timezone of the host.

    environment:
      KAFKA_ADVERTISED_LISTENERS:
        "INTERNAL://kafka:9092,\
	 EXTERNAL://>>USER<<:9094"
      TZ: "Europe/Paris"


2. mongo_db service:
  In MongoDB service replace >>local_path_volume<< with the path on your local machine to mount a volume where the database will be stored. 
  Set up the environment variable to align the timezone of the container with the timezone of the host.

    environment:
      TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/data/db

3. sql_db service:
  In MySQL service set up the database name, user name, user password and the root password. 
  Similar as in the Mongo service, one needs to mount a volume where the database will be stored, for that replace >>local_path_volume<< with the path on your local machine.
  Set up the environment variable to align the timezone of the container with the timezone of the host.

    environment:
       MYSQL_ROOT_PASSWORD: >>mysql_root_password<<
       MYSQL_DATABASE: >>database_name<<
       MYSQL_USER: >>MySQL_USER<<
       MYSQL_PASSWORD: >>mysql_USER_password<<
       TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/var/lib/mysql

4. provider service:
  In Provider service set up the the volume where necessary data about the competitions will be stored.
  Set up the environment variable to align the timezone of the container with the timezone of the host.

    environment:
      TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/local/data

5. spark-master and worker service:
  In Spark-master and worker set up the environment variable to align the timezone of the container with the timezone of the host.

    environment:
      TZ: "Europe/Paris"


