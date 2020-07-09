#####################################################
####						 ####
####            Docker-compose ReadMe            ####  
####						 ####
#####################################################

In docker-compose.yml file, you need to setup usernames, passwords and local volumes according to your host machine.

1. Kafka service:
  In Kafka service definition, replace >>USER<< for "KAFKA_ADVERTISED_LISTENERS" with your local user.
  Force the timezone of the container to align with the host's timezone.

    environment:
      KAFKA_ADVERTISED_LISTENERS:
        "INTERNAL://kafka:9092,\
	 EXTERNAL://>>USER<<:9094"
      TZ: "Europe/Paris"
    volumes:
      - /etc/localtime:/etc/localtime:ro

2. mongo_db service:
  In MongoDB service replace >>local_path_volume<< with the path on your local machine to mount a volume where the database will be stored.
  Force the timezone of the container to align with the host's timezone.

    environment:
      TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/data/db
      - /etc/localtime:/etc/localtime:ro

3. sql_db service:
  In MySQL service set up the database name, user name, user password and the root password. Similar as in the Mongo service, one needs to mount a volume where the database will be stored, for that replace
 >>local_path_volume<< with the path on your local machine.

    environment:
       MYSQL_ROOT_PASSWORD: >>mysql_root_password<<
       MYSQL_DATABASE: >>database_name<<
       MYSQL_USER: >>MySQL_USER<<
       MYSQL_PASSWORD: >>mysql_USER_password<<
       TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/var/lib/mysql

4. provider service:
  In Provider service set up the the volume where necessary data about the competitions will be stored:

    environment:
      TZ: "Europe/Paris"
    volumes:
      - >>local_path_volume<<:/local/data

5. spark-master service:
  In Spark-master service force the timezone of the container to align with the host's timezone.

    environment:
      TZ: "Europe/Paris"
    volumes:
      - /etc/localtime:/etc/localtime:ro

