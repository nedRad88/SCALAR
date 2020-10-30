---
title: '`SCALAR` - A Platform for Real-time Machine Learning Competitions on Data Streams'
bibliography: references.bib
tags:
  - Python
  - Stream Data Mining
  - Real-time Machine Learning
  - Information Flow Processing
authors:
  - name: Nedeljko Radulovic
    affiliation: 1
  - name: Dihia Boulegane
    affiliation: "1, 2"
  - name: Albert Bifet
    affiliation: "1, 3"
affiliations:
 - name: LTCI, Télécom Paris, IP-Paris, Paris, France
   index: 1
 - name: Orange Labs, Grenoble, France
   index: 2
 - name: University of Waikato, New Zealand
   index: 3
date: 26 August 2020
nocite: '@*'
---

# Summary

`SCALAR` is a new platform for running real-time machine learning competitions on data streams. Following the intent of Kaggle, which serves as a platform for organizing machine learning competitions adapted for batch learning, we propose `SCALAR` as a novel platform designed specifically for stream learning in real-time. `SCALAR` supports both classification and regression problems in the data streaming setting. It has been developed in `Python`, using state of the art open-source solutions: `Apache Kafka`, `Apache Spark`, `gRPC`, `Protobuf`, and `Docker`. 

# Statement of need 

`SCALAR` supports the execution of Machine Learning research experiments, helping researchers to test and improve their methodologies in a real-time machine learning scenario.
As such, `SCALAR` has been used for organizing, a first  Real-time Machine Learning Competition on Data Streams[@boulegane2019real] as part of the [IEEE Big Data 2019 Cup Challenges](http://bigdataieee.org/BigData2019/BigDataCupChallenges.html), where several approaches of data stream mining have been designed, tested, and improved.

`SCALAR` has been inspired by existing competition platforms for batch (offline) setting such as [`Kaggle`](https://www.kaggle.com/) and [`Alibaba Tianchi`](https://tianchi.aliyun.com/).
These platforms, and especially `Kaggle`, have attracted many companies, researchers, and people working in the field of machine learning, to take part in competitions, proposing better 
solutions, and in that way, pushing forward the whole research community. We believe that introducing `SCALAR` will have a significant impact on the AI research community, 
especially regarding the rising interest and need for online stream data mining. Processing data streams is in high demand due to the fast development of IoT and many other 
real-time devices. Data are generated in real-time from a great number of various sources: sensors, IoT devices, social networks, applications, bank and market transactions. 

`SCALAR` supports this data stream machine learning scenario where data are continuously released, in batches, every time interval. 
Predictions for each current batch, that are sent before a defined deadline, are evaluated in real-time, and the results are shown on the live leaderboard. 


# Streaming learning setting

Most of the existing platforms for data science competitions are tailored to offline learning where a static dataset is made available to the participants before the competition starts. This dataset is divided into training and test sets. The training set is used to build and train the model, which is then tested on the test set. 

In online learning, data arrive in a stream of records (instances) and the model needs to be trained incrementally as new instances are released. Since the data arrive at high speed, predictions have to be issued within a short time. Having in mind this specific setup of the data stream mining scenario (Figure \ref{fig:stream_mining}), every model should use a limited 
amount of time and memory, process one instance at a time and inspect it only once and the model must be able to predict at any time [@bifet2010moa].

![Stream data mining scenario\label{fig:stream_mining}](stream_mining.png)

The model is being updated using the labeled instances and then evaluated on new unlabeled instances. This scenario represents the prequential evaluation scenario or "test-then-train" setting.
To make this scenario possible in `SCALAR`, we first assume that the records in the data stream arrive in batches and that each batch can be of size `1` or more. Then, we define two different kinds of batches:

* Initial batch: This batch is used to build and train the initial model. It is aimed to avoid the cold start problem and as such contains both features and targets. The initial batch usually has a large number of instances.

* Regular batch: The regular batch contains new test instances while providing training instances of previous batches that are used to evaluate the quality of the model up to the current time.

![Initial and regular batches in the data stream\label{fig:online_learning}](online_learning.jpg)

# Architecture

To support all the aforementioned requirements for stream data mining, and to be able to organize competitions in such a scenario, a specifically dedicated platform was needed. To the best of our knowledge, there doesn't exist such a platform, thus we propose `SCALAR`. Figure \ref{architecture} highlights the architecture of the platform that includes a web application and a streaming engine following the fundamentals of Information Flow Processing (IFP)[@Cugola:12].

![Architecture of the platform\label{architecture}](Architecture.png)

SCALAR’s components and layers:

* Data sources: `SCALAR` enables competitions by providing data in the form of a `CSV` file which is then used to recreate a continuous stream following predefined competition settings such as the time interval between two releases and the number of instances at a time.
    
* Data layer: represents the persistence node in the system where different kinds of information are stored. `MongoDB` is used for unstructured data (e.g. user’s predictions, records from the stream, evaluation metrics, etc.) and `MySQL` for structured data (competition information, user information).
    
* Streaming Engine: this component is responsible for handling the streams. From the `CSV` files, `Kafka` recreates multiple streams to be sent to multiple users. `SCALAR` provides a secure and independent bi-directional streaming communication between the user and the streaming engine. This allows each user to consume training and test instances and submit the respective predictions according to competition predefined data format. The resource server is the `API` that handles all authenticated requests from the client application whereas the authorization server is is in charge of users' identification. The Online evaluation engine handles both the stream of instances and the streams of participants' predictions in order to compute and update the evaluation metrics online before storing them into the dedicated database.
    
* Application layer: consists of two parts the web application, and client application. The web application represents a user-friendly interface that allows participants to register, subscribe to competitions, and follow leaderboard and model performance online. The client application is provided in order to accommodate participants' code to solve the machine learning problem at hand. It delivers a secure communication channel to receive the stream of training and test instances and send their respective predictions to the server.

# Acknowledgements

We would like to thank Nenad Stojanovic for his contribution to the project and to acknowledge support for this project 
from the EDF (Electricité de France) and OpenML.


# References

