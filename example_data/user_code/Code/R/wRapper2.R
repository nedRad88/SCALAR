# This is R wrapper for using gRPC protocol for bidirectional streaming.
# It uses reticulate library in order to import Python classes for gRPC bidirectional streaming.
# 
# importing Python script for gRPC class
import_from_path("Client_for_R", ".")
client <- import("Client_for_R")

# Creating gRPC client:
# TopicTitle: Competition name 
# batchSize: Batch size
# port: Server address and port ('52.143.141.81:50051')
# e_mail: User e-mail
# user_token: Token, available after subscription
# comp_code: Competition code, available after subscription to a competition
# first_message: Message to initialize communication, field information available in file.proto of the competition
create_client <- function(batchSize, port, e_mail, user_token, comp_code, first_message){
  cl <- client$Client(batch_size = batchSize, server_port = port, user_email = e_mail, 
                      token = user_token, competition_code = comp_code, first_prediction = first_message)
  return(cl)
}

# Run client: Starts a thread from Python
run_client <- function(cl) {
  cl$run()
}

# Get message from stream
get_messages <- function(cl){
    mess <- cl$retrieve_messages()
  return(mess)
}

# Send prediction for data instances from the stream
send_predictions <- function(cl, predictions){
  for (prediction in predictions) {
    cl$predictions_to_send = append(cl$predictions_to_send, prediction)
  }
}
