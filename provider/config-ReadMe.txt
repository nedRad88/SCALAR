
########################################
config.json ReadMe file
########################################


    "MAIL_SERVER" : mail server (e.g. smtp.gmail.com),

    "MAIL_PORT" : port for connecting to mail server (e.g. 465),

    "MAIL_USERNAME" : email address,

    "MAIL_PASSWORD" : password for email address above,

    "MAIL_USE_TLS" : encryption protocol (True/False),

    "MAIL_USE_SSL" : encryption protocol (True/False),

    "SECRET_KEY" : flask session secret key,

    "SECURITY_PASSWORD_SALT": flask app secret cryptographic key,

    "WEB_ADDRESS" : website address (to run it locally set to 'localhost'),

    "SERVER_HOST" : address and port of kafka server (e.g. if Kafka server is Docker container named kafka then host is kafka:9092),

    "SQL_HOST" : address of mysql server (e.g. if MySQL server is Docker container named sql_db then the host is: mysql+pymysql://mysql:mysql@sql_db/),

    "SQL_DBNAME" : SQL database name,

    "UPLOAD_REPO": local path to store uploads (datastream files, proto files...),

    "COMPETITION_PROTO_REPO": folder in UPLOAD_REPO path for competition proto files,

    "COMPETITION_GENERATED_CODE" : folder in UPLOAD_REPO path for protobuf generated files for communication,

    "STREAM_DATA_FILE": folder in UPLOAD_REPO path for datastream file,

    "MONGO_HOST" : address MongoDB server (e.g. if MongoDB server is Docker container named mongo_db then host is just name of the container mongo_db),

    "SPARK_DRIVER_HOST": Main container in our application - provider,

    "SPARK_DRIVER_PORT": Spark Driver port (e.g. 5005)

    "SPARK_BLOCKMANAGER_PORT": Blockmanager port

########################################
