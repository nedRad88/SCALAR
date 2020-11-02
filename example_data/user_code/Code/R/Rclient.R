#!/usr/bin/env Rscript
library(reticulate)

# provide path to python
use_python("~/anaconda3/envs/python372/bin/python")
source("wRapper2.R")
library(jsonlite)
#######################
#     User data:      #
#######################

# E-mail:
e_mail <- "admin"
# Token: Obtain token when subscribing to a competition
user_token <- "eyJhbGciOiJIUzIJ1c2VyX2lkIjoibmVkZWxqaUyFV5fkUjIfjKt4i0Vl8"
# Competition code: Obtain competition code when subscribing to a competition
comp_code <- "oj"
# Batch size: Check competition configuration
batch_Size <- 5
# set first message to initialize communication
first_message <- toJSON(list(rowID = as.integer(2000), Target = as.integer(3333)))
# Set up server and port of the web application
port <- 'localhost:50051'
# Creating gRPC client using wRapper2.R
gRPC_client <- create_client(batchSize = batch_Size, port = port, user_token = user_token, 
                             e_mail = e_mail, comp_code = comp_code, first_message = first_message)
# Starting the client
run_client(gRPC_client)

# In while (true) loop User should call get_messages(client) and send_predctions(client, predictions) functions
# get_messages(client) returns one data instance from the stream
# information about the fields User can see in file.proto of the competition
# After obtaining the instance, user will do initialization, training or testing depending on the tag of the instance
# if the tag is testing, user will generate prediction in JSON format, information about fields required is also available in the file.proto
# of the competition
# prediction is appended to a list which is then send using send_predictions(client, predictions) function.
while (TRUE){
  message = get_messages(cl = gRPC_client)
  if (message == "Stop"){
    break
  }
  predictions = list()
  try({
    message_dict <- fromJSON(message)
    row_id <- message_dict[['rowID']]
    tag <- message_dict[['tag']]
    if (tag == 'TRAIN') {
      # Train your model here
    
    }
    if (tag == 'TEST') {
      # Predict here
      value <- 543
      result <- list(rowID=row_id, Target=value)
      mess <- toJSON(result)
      print(mess)
      predictions = append(predictions, mess)
    }
    if (tag == 'INIT') {
      i <- 1
    }
    send_predictions(cl = gRPC_client, predictions = predictions)
  })
}

