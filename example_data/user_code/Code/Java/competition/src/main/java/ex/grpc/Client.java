package ex.grpc;

import ex.grpc.File.Prediction;
import ex.grpc.File.Message;
import io.grpc.*;
import io.grpc.stub.MetadataUtils;
import io.grpc.stub.StreamObserver;

import java.util.ArrayList;

public class Client implements Runnable {
    /**
     * gRPC client class for Streaming competition.
     * Bi-directional streaming.
     */
    private String topicTitle;
    private ManagedChannel channel;
    private Integer batch_size;
    private File.Prediction first_prediction = Prediction.newBuilder().setRowID(1000).setTarget(3333).build();
    private ArrayList<Prediction> predictions = new ArrayList<>();
    private DataStreamerGrpc.DataStreamerStub stub;
    private String userID, compCode, token;
    private Metadata metadata;
    private StreamObserver<Prediction> requestObserver;

    Client(String topic, String server, Integer port, Integer batch_size, String user, String code, String user_token) {
        /**
         * Client class Constructor
         */
        this.topicTitle = topic;
        this.batch_size = batch_size;
        this.channel = ManagedChannelBuilder.forAddress(server, port).usePlaintext().build();
        this.stub = DataStreamerGrpc.newStub(channel);
        this.predictions.add(first_prediction);
        this.userID = user;
        this.compCode = code;
        this.token = user_token;
        this.metadata = CreateMetadata(this.userID, this.token, this.compCode);
        this.stub = MetadataUtils.attachHeaders(this.stub, this.metadata);
    }

    public Metadata CreateMetadata(String userID, String token, String CompetitionCode){
        /**
         * Creating Metadata for authetincation
         */
        Metadata met = new Metadata();
        Metadata.Key<String> auth = Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
        met.put(auth, token);
        Metadata.Key<String> user = Metadata.Key.of("user_id", Metadata.ASCII_STRING_MARSHALLER);
        met.put(user, userID);
        Metadata.Key<String> code = Metadata.Key.of("competition_id", Metadata.ASCII_STRING_MARSHALLER);
        met.put(code, CompetitionCode);
        return met;
    }

    public void predict(Message message){
        /**
         * Model building
         */
        Integer i;
        if (message.getTag().equals("INIT")) {
            i = 1;
        }
        if (message.getTag().equals("TRAIN")) {
            // Something smart here
            i = 2;
        }
        if (message.getTag().equals("TEST")) {
            Integer rowId = message.getRowID();
            // Magic happens here
            Integer value = 55555;
            Prediction new_prediction = Prediction.newBuilder().setRowID(rowId).setTarget(value).build();
            this.predictions.add(new_prediction);
        }

    }

    public void send_predictions (){
        /**
         * Sending predictions
         */
        while (true){
            try {
                Prediction pred = this.predictions.remove(predictions.size() - 1);
                System.out.println(pred);
                this.requestObserver.onNext(pred);
            } catch (Exception e) {}
        }
    }

    public void run() {
        /**
         * Run client.
         */
        this.requestObserver = stub.sendData(new StreamObserver<Message>() {
            @Override
            public void onNext(Message message) {
                System.out.println(message);
                predict(message);
            }

            @Override
            public void onError(Throwable t) {
                System.out.println(t.getStackTrace());
            }

            @Override
            public void onCompleted() {
                System.out.println("Ended");
            }
        });

        send_predictions();

    }

    public static void main(String[] args) {
        /**
         *
         */
        Client client = new Client("rtc6", "app.streaming-challenge.com", 50051, 5,
                "john.doe1984@gmail.com", "oj", "eyJhbGciOiJIUzI1NiIsIvbSJ9.sZg_WVcsub9eIZkJhoSlKc27OCBNv8QtrDCPjNxgdvA");
        try {


            (new Thread(client)).start();

        } catch (Exception e) {
            System.out.println("Exception");

        }
    }

}
