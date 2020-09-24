"""
Copyright 2020 Nedeljko Radulovic, Dihia Boulegane, Albert Bifet

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

from __future__ import print_function
import time
time.sleep(15)
from producer import Scheduler
from datetime import datetime
from flask import render_template, Response, Flask, stream_with_context, request, jsonify, send_file
from auth import decode_auth_token, get_auth_token
from subscription_auth import get_subscription_token
from functools import wraps
from flask_mail import Mail, Message
from gevent.pywsgi import WSGIServer
import json
import os
import os.path
from werkzeug.utils import secure_filename
from grpc_tools import protoc
from repositories.CompetitionRepository import CompetitionRepository, Competition, Datastream, DatastreamRepository, \
    User, UserRepository, Subscription, SubscriptionRepository
from repository import MongoRepository
import logging
from itsdangerous import URLSafeTimedSerializer
import csv
from io import StringIO
from werkzeug.datastructures import Headers
from hashids import Hashids
import eventlet
eventlet.monkey_patch(time=True)
logging.basicConfig(level='DEBUG')

with open('config.json') as json_data_file:
    config = json.load(json_data_file)

# Defining the mail client
app = Flask(__name__)
app.config['MAIL_SERVER'] = config['MAIL_SERVER']
app.config['MAIL_PORT'] = config['MAIL_PORT']
app.config['MAIL_USERNAME'] = config['MAIL_USERNAME']
app.config['MAIL_PASSWORD'] = config['MAIL_PASSWORD']
MAIL_USE_TSL = (config['MAIL_USE_TLS'].lower() == 'true')
MAIL_USE_SSL = (config['MAIL_USE_SSL'].lower() == 'true')
app.config['MAIL_USE_TLS'] = MAIL_USE_TSL
app.config['MAIL_USE_SSL'] = MAIL_USE_SSL
app.config['SECRET_KEY'] = config['SECRET_KEY']
app.config['SECURITY_PASSWORD_SALT'] = config['SECURITY_PASSWORD_SALT']
mail = Mail(app)
app.debug = True

# Start scheduler
_SCHEDULER = Scheduler()
_SCHEDULER.start()


def generate_confirmation_token(email):
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    return serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])


def confirm_token(token, expiration=3600):
    serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt=app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiration
        )
    except Exception as e:
        return False
    return email


# Generate hash code for competitions
hashids = Hashids()


def code_generator(competition_id):
    return hashids.encode(competition_id)


jinja_options = app.jinja_options.copy()
jinja_options.update(dict(
    block_start_string='<%',
    block_end_string='%>',
    variable_start_string='%%',
    variable_end_string='%%',
    comment_start_string='<#',
    comment_end_string='#>'
))
app.jinja_options = jinja_options

try:
    _SQL_HOST = os.environ['SQL_HOST']
except Exception:
    _SQL_HOST = config['SQL_HOST']

try:
    _SQL_DBNAME = os.environ['SQL_DBNAME']
except Exception:
    _SQL_DBNAME = config['SQL_DBNAME']

try:
    _MONGO_HOST = os.environ['MONGO_HOST']
except Exception:
    _MONGO_HOST = config['MONGO_HOST']


_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)
_DATASTREAM_REPO = DatastreamRepository(_SQL_HOST, _SQL_DBNAME)
_USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)
_SUBSCRIPTION_REPO = SubscriptionRepository(_SQL_HOST, _SQL_DBNAME)
_MONGO_REPO = MongoRepository(_MONGO_HOST)

# Standard evaluation measures, should be written in MongoDB if they don't exist there already
standard_measures = [{'id': 1, 'name': 'MAPE', 'type': 'regression'}, {'id': 2, 'name': 'MSE', 'type': 'regression'},
                     {'id': 3, 'name': 'MAE', 'type': 'regression'},
                     {'id': 4, 'name': 'ACC', 'type': 'classification'},
                     {'id': 5, 'name': 'kappa', 'type': 'classification'}]
_MONGO_REPO.insert_standard_measures(standard_measures=standard_measures)


def authorized(*roles):
    """
    Give authorization only to ADMIN user for some routes.

    :param roles:
    :return:
    """
    def wrapper(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            token = request.headers.get('Authorization')
            decoded = decode_auth_token(token)
            # print decoded
            if decoded[0] != 200:
                return decoded[1]
            user = decoded[1]
            logging.debug("Decorator: {}".format(user))
            if roles:
                user_roles = [str(r) for r in user['roles']]
                if "roles" not in user or len(set(user_roles).intersection(set(roles))) == 0:
                    # return "Not Allowed"
                    return json.dumps('Forbidden Admin Only'), 403, {'ContentType': 'application/json'}
            return f(user, *args, **kwargs)
        return wrapped
    return wrapper


@app.route('/')
def index():
    return render_template("base.html")

######################################################################################
############                      Auth Server                             ############
######################################################################################


# TODO: add checking on email confirmation and add decorator
@app.route('/auth/login', methods=['POST'])
def login():
    """
    Login route. Provide the credentials (email/password).

    :return:
    """
    user_name = request.form['username']
    password = request.form['password']

    user = {
        'id': user_name,
        'password': password
    }

    token = get_auth_token(user)
    _USER_REPO.session.commit()
    if token[0] != 200:
        return json.dumps(token[1]).encode('utf-8'), 401, {'ContentType': 'application/json'}
    return jsonify({'access_token': token[1].decode("utf-8")})


@app.route('/auth/api/account/me')
@authorized('ADMIN', 'USER')
def me(user):
    return jsonify(user)


@app.route('/auth/api/account/confirm/<token>')
def confirm_email(token):
    """
    Check if the confirmation token is correct.

    :param token:
    :return:
    """
    logging.debug("Token: {}".format(token))
    try:
        email = confirm_token(token)
    except Exception as e:
        logging.debug("Token not valid")

    user = _USER_REPO.get_user_by_email(email)
    _USER_REPO.session.commit()
    if user is None:
        print("User not registered.")
    else:
        if user.confirmed:
            logging.debug("already confirmed")
        else:
            _USER_REPO.confirm_user(user)
            print('Account confirmed')

    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}


@app.route('/auth/register', methods=['POST'])
def register():
    """
    Registration route. Provides a form to register to the platform.
        Parameters:
            - First name, last name, email, password
    Then the confirmation e-mail is sent with a token to validate the registration.

    :return: Response:
                - 200: confirm success
    """
    data = json.loads(request.data.decode('utf-8'))
    web = config["WEB_ADDRESS"]
    first_name = data['firstName']
    last_name = data['lastName']
    email = data['email']
    password = data['password']
    confirmed = False
    user = User(user_id=None, first_name=first_name, last_name=last_name, email=email, password=password, role='USER',
                confirmed=confirmed, confirmed_on=None)
    _USER_REPO.insert_one(user)
    _USER_REPO.session.commit()

    token = generate_confirmation_token(email)

    # Sending Confirmation email
    msg = Message('Streaming Data Challenge : Registration confirmed', sender=config['MAIL_USERNAME'],
                  recipients=[email])
    msg.body = "Hello " + first_name + ' ' + last_name + ", \n\nWelcome to Streaming Data Challenge platform! \n\nCheers, \nThe team \n\nPlease click on the link below to confirm your e-mail.\n" "http://" + web + ":80/auth/api/account/confirm/" + token

    mail.send(msg)
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}


@app.route('/auth/admin/accounts')
@authorized('ADMIN')
def get_users(user):
    users = _USER_REPO.get_all_users()
    return jsonify([u.serialize() for u in users])


@app.route('/auth/admin/accounts/delete', methods=['POST'])
@authorized('ADMIN')
def delete_users(user):
    users = json.loads(request.data)
    _USER_REPO.delete_many(users)
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}


@app.route('/test')
@authorized('ADMIN')
def test():
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}


######################################################################################
############                      Resource Server                         ############
######################################################################################

@app.route('/api/competitions', methods=['POST', 'GET'])
def competitions():
    """
    Competitions route.
    Implements two methods:
    GET: retrieve the competitions
    POST: create new competition:
        Parameters:
            - Competition name
            - Datastream
            - Description of the competition
            - Competition settings: size of initial batch, initial training time, size of a regular batch,
                                    time interval between the batches, name of the label column and the evaluation
                                    metric, start and end date, time interval to send the predictions, .proto file

    :return: Responses:
            - 200: If method== "GET", return the list of the competitions;
                   If method == "POST", confirm success
            - 500: Error
    """
    if request.method == 'GET':
        status = request.args.get('status')
        page = request.args.get('page')
        step = request.args.get('step')

        competitions = _COMPETITION_REPO.get_all_competitions(status, int(page), int(step))
        return jsonify(competitions)

    if request.method == 'POST':
        # Adding a competition
        data = dict(request.form)

        data = data['competition']
        data = data[0]
        data = json.loads(data)

        # TODO: store in mongodb
        competition_config = data['config']
        print("Competition configuration: ", competition_config)
        logging.debug("Competition config: {}".format(competition_config))

        name = data['name']
        datastream_id = data['datastream_id']
        initial_batch_size = data['initial_batch_size']
        initial_training_time = data['initial_training_time']
        batch_size = data['batch_size']
        time_interval = data['time_interval']
        target_class = data['target_class']
        logging.debug("Competition target: {}".format(target_class))

        start_date = data['start_date'].replace('T', ' ').replace('Z', '')

        end_date = data['end_date'].replace('T', ' ').replace('Z', '')
        predictions_time_interval = data['predictions_time_interval']
        description = data['description']

        data_file = request.files['file']
        file_name = data_file.filename
        # Check if the file is one of the allowed types/extensions
        if data_file and allowed_file(file_name):
            # Make the filename safe, remove unsupported chars
            extension = get_file_extension(file_name)
            filename = secure_filename(str(name) + str(extension))
            # Move the file form the temporal folder to
            # the upload folder we setup
            proto_directory = os.path.join(config['UPLOAD_REPO'], config['COMPETITION_PROTO_REPO'], name)

            if not os.path.exists(proto_directory):
                os.makedirs(proto_directory)

            data_file.save(os.path.join(proto_directory, 'file.proto'))
            generated_code_directory = os.path.join(config['UPLOAD_REPO'], config['COMPETITION_GENERATED_CODE'], name)

            if not os.path.exists(generated_code_directory):
                os.makedirs(generated_code_directory)

            try:
                with open(generated_code_directory + '/__init__.py', "w+") as f:
                    f.write('')
            except Exception:
                pass

            try:
                protoc.main(('', '-I' + proto_directory, '--python_out=' + generated_code_directory,
                             '--grpc_python_out=' + generated_code_directory,
                             os.path.join(proto_directory, 'file.proto')))
            except Exception as e:
                print(str(e))

        code = ''
        competition = Competition(None, name=name, datastream_id=datastream_id, initial_batch_size=initial_batch_size,
                                  initial_training_time=initial_training_time, batch_size=batch_size,
                                  time_interval=time_interval, target_class=target_class, start_date=start_date,
                                  file_path=file_name, predictions_time_interval=predictions_time_interval,
                                  end_date=end_date, description=description, code=code)

        _COMPETITION_REPO.insert_one(competition)
        code = code_generator(competition.competition_id)
        _COMPETITION_REPO.set_competition_code(competition.competition_id, code)

        evaluation_measures = {'competition_id': competition.competition_id, 'measures': competition_config}
        _MONGO_REPO.insert_document('evaluation_measures', 'evaluation_measures', evaluation_measures)

        _SCHEDULER.schedule_competition(competition, competition_config)

        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

    return json.dumps({'error': True}), 500, {'ContentType': 'application/json'}


@app.route('/api/competitions/<competition_id>')
def get_competition_info(competition_id):
    """
    Retrieve the competition by its id.

    :param competition_id: Competition id
    :return: The competition object
    """
    competition = _COMPETITION_REPO.get_competition_by_id(competition_id)
    logging.debug("Competition info request!")
    return jsonify(competition.serialize())


@app.route('/api/datastreams', methods=['GET', 'POST'])
def get_datastreams():
    """
    Datastreams route. It implements 2 methods:
    - GET: retrieve already existing datasets
    - POST: add new dataset
        Parameters:
                - Dataset name
                - Dataset description
                - Dataset file

    :return: Responses:
                - If method == "GET": return the list of the datasets
                - If method == "POST":
                    - 200: confirm success
                    - 500: Error
    """
    if request.method == 'GET':
        status = request.args.get('status')
        page = request.args.get('page')
        step = request.args.get('step')
        datastreams = []
        logging.debug("Page, step: {}, {}".format(page, step))
        if str(page) == 'null' or str(step) == 'null':
            datastreams = _DATASTREAM_REPO.get_all_datastreams(page=None, step=None)
        else:
            datastreams = _DATASTREAM_REPO.get_all_datastreams(int(page), int(step))

        return jsonify(datastreams)

    if request.method == 'POST':
        data = dict(request.form)

        data = data['datastream']
        data = data[0]
        data = json.loads(data)
        data_file = request.files['file']
        name = data['name']
        description = data['description']
        file_name = data_file.filename
        # Check if the file is one of the allowed types/extensions
        if data_file and allowed_file(file_name):
            # Make the filename safe, remove unsupported chars
            extension = get_file_extension(file_name)
            # Move the file form the temporal folder to
            # the upload folder we setup
            data_directory = os.path.join(config['UPLOAD_REPO'], config['STREAM_DATA_FILE'])
            data_file_name = name + extension
            ds_path = os.path.join(data_directory, data_file_name)
            if not os.path.exists(data_directory):
                os.makedirs(data_directory)
            data_file.save(os.path.join(ds_path))

        datastream = Datastream(None, name=name, file_path=data_file_name, description=description)
        _DATASTREAM_REPO.insert_one(datastream)

        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

    return json.dumps({'error': True}), 500, {'ContentType': 'application/json'}


@app.route('/api/datastreams/<datastream_id>')
def get_datastream_info(datastream_id):
    """
    Retrieve information about the dataset.

    :param datastream_id: Dataset id
    :return: Response: Return the information about the dataset (name, description)
    """
    datastream = _DATASTREAM_REPO.get_datastream_by_id(datastream_id)
    return jsonify(datastream.serialize())


@app.route('/api/results/<competition_id>')
def results_by_user_by_competition(competition_id):
    """
    Retrieve results of the users for a given competition.

    :param competition_id: Competition id
    :return: List of users with results
    """
    results = _MONGO_REPO.get_results_by_user(competition_id)
    return jsonify(results)


@app.route('/api/subscriptions', methods=['POST'])
def subscriptions():
    """
    Subscriptions route. Registers the users' subscriptions to competitions.

    :return: Responses:
                - 200: Confirm success
    """
    user_secret_key = ''
    try:
        data = json.loads(request.data.decode('utf-8'))
        competition = _COMPETITION_REPO.get_competition_by_id(data['competition_id'])
        user = _USER_REPO.get_user_by_email(data['user'])

        if competition is not None and user is not None:
            # insert subscriptions
            subscription = Subscription(None, competition.competition_id, user.user_id)
            _SUBSCRIPTION_REPO.insert_one(subscription)

            user_secret_key = get_subscription_token(competition.competition_id, data['user'])
    except Exception as e:
        print(str(e))

    if len(user_secret_key) > 0:
        return json.dumps({'secret_key': user_secret_key[1].decode('utf-8')}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'secret_key': user_secret_key}), 200, {'ContentType': 'application/json'}


@app.route('/api/subscriptions/delete', methods=['POST'])
def delete_subscription():
    """
    Removes the subscription for a competition
    :return: Response:
                - 200: OK
    """
    try:
        data = json.loads(request.data)
        competition = _COMPETITION_REPO.get_competition_by_id(data['competition_id'])
        user = _USER_REPO.get_user_by_email(data['user'])

        if competition is not None and user is not None:
            # insert subscriptions
            subscription = _SUBSCRIPTION_REPO.get_subscription(competition.competition_id, user.user_id)
            _SUBSCRIPTION_REPO.delete_one(subscription)

    except Exception as e:
        print(str(e))

    return json.dumps('OK'), 200, {'ContentType': 'application/json'}


@app.route('/api/subscriptions/check')
def check_subscription():
    """
    Check if user is subscribed to a given competition.
    :return: True or False
    """
    user = request.args.get('user')
    competition = request.args.get('competition')
    s = _SUBSCRIPTION_REPO.check_subscription(competition, user)
    return json.dumps(s), 200, {'ContentType': 'application/json'}


@app.route('/api/subscriptions/secret')
def get_secret_key():
    """
    Retrieve the subscription token for a given user and competition.

    :return: Responses:
                - 200: Confirm the token
                - 404: If user is not subscribed
    """
    user_id = request.args.get('user')
    competition_id = request.args.get('competition')
    user_secret_key = ''

    try:
        competition = _COMPETITION_REPO.get_competition_by_id(competition_id)
        user = _USER_REPO.get_user_by_email(user_id)
        logging.debug("User, competition: {}, {}".format(user, competition))
        if competition is not None and user is not None:
            # insert subscriptions
            if _SUBSCRIPTION_REPO.check_subscription(competition.competition_id, user.user_id):
                user_secret_key = get_subscription_token(competition_id, user_id)
    except Exception as e:
        pass

    if len(user_secret_key) > 0:
        return json.dumps({'secret_key': user_secret_key[1].decode("utf-8")}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'secret_key': user_secret_key}), 404, {'ContentType': 'application/json'}


@app.route('/api/users/<user_id>/competitions')
def get_competitions_by_user(user_id):
    """
    Retrieve the list of the competitions to which user is subscribed.

    :param user_id: User ID
    :return: List the competitions.
    """
    status = request.args.get('status')
    page = request.args.get('page')
    step = request.args.get('step')

    user_competitions = _COMPETITION_REPO.get_competitions_by_user(user_id, status, int(page), int(step))
    return jsonify(user_competitions)


@app.route('/api/evaluation/<competition_id>')
def get_competition_evaluation_measure(competition_id):
    """
    Get evaluation measures for a given competition.

    :param competition_id: Competition ID
    :return: Evaluation measure, or list if there are multiple
    """
    competition_measures = _MONGO_REPO.get_competition_evaluation_measures(competition_id)
    logging.debug("Competition measures: {}".format(competition_measures))
    return jsonify(competition_measures)


@app.route('/api/evaluation/measures')
def get_standard_evaluation_measures():
    """
    Get all available evaluation measures.
    :return: List of the evaluation measures
    """
    measures = _MONGO_REPO.get_standard_evaluation_measures()
    return jsonify(measures)


@app.route('/api/leaderboard/<competition_id>')
def get_leaderboard_by_competition(competition_id):
    """
    Leaderboard route. Retrieves the results, for a given competition, for all the users to show it on the leaderboard.

    :param competition_id: Competition ID
    :return: Ordered list with users and their results
    """
    field = request.args.get('field')
    measure = request.args.get('measure')

    results = []
    # TODO Check this query
    competition_results = _MONGO_REPO.get_users_ranking_by_field_by_measure(competition_id, field, measure)

    for r in competition_results:
        if r['id'] >= 100 or r['id'] < 1:
            first_name = "Test"
            last_name = "Baseline"
            res = {'id': r['id'], 'firstName': first_name, 'lastName': last_name, 'email': " ",
                   'measure': r['measures']}
        else:
            user = _USER_REPO.get_user_by_id(r['id'])
            res = {'id': r['id'], 'firstName': user.first_name, 'lastName': user.last_name, 'email': user.email,
                   'measure': r['measures']}
        results.append(res)

    return jsonify(results)


@app.route("/competition/<competition_id>/stream")
def get_competition_stream(competition_id):
    """
    Retrieve the stream.
    NOT USED.

    :param competition_id: Competition ID
    :return:
    """
    db = _MONGO_REPO.client['data']
    collection = db['data']
    stream = collection.find_one({"competition_id": competition_id})
    return json.dumps(stream['dataset']), 200, {'ContentType': 'application/json'}


@app.route("/competition/<competition_id>/golden_standard")
def get_competition_golden_standard(competition_id):
    """
    Retrieve the dataset with labels (training dataset).
    NOT USED.

    :param competition_id: Competition ID
    :return:
    """
    db = _MONGO_REPO.client['data']
    collection = db['golden_standard']
    stream = collection.find_one({"competition_id": competition_id})
    return json.dumps(stream['dataset']), 200, {'ContentType': 'application/json'}


# These are the extension that we are accepting to be uploaded
app.config['ALLOWED_EXTENSIONS'] = {'csv', 'xls', 'proto'}


def allowed_file(filename):
    """
    Check if the file has an allowed file extension.
    :param filename:
    :return: True/False
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in app.config['ALLOWED_EXTENSIONS']


def get_file_extension(filename):
    """
    Get the extension of the file.
    :param filename:
    :return:
    """
    file_name, extension = os.path.splitext(filename)
    return extension


@app.route('/topic/<competition_id>/<field>/<measure>/<user_id>')
def get_messages(competition_id, field, measure, user_id):
    """
    Stream live results to the chart.
    :param competition_id: Competition ID
    :param field: Label column
    :param measure: Evaluation metric
    :param user_id: User ID
    :return: Batch metrics to be shown on the live chart.
    """
    def stream_results(competition):
        # Getting competition from Database

        # Check if competition finished or no
        now = datetime.now()

        if competition.end_date > now:
            logging.debug("Competition not over yet!")
            evaluation_time_interval = 30

            if competition.start_date > now:
                # Competition hasn't started yet
                data = 'retry: 100000000\n'
                data = data + 'data: {0}\n\n'.format(json.dumps({"Error": 'Competition not started Yet'}))
                return data

            else:
                # Get Initial Measures
                results = _MONGO_REPO.get_results_by_user(competition.competition_id, field, measure, user_id)
                data = 'retry: 100000000\n'
                data = data + 'data: {0}\n\n'.format(json.dumps({"status": 'INIT', "results": results}))
                return data

        else:
            # Ended competition
            logging.debug("Competition finished!")
            results = _MONGO_REPO.get_results_by_user(competition_id, field, measure, user_id)
            data = 'retry: 100000000\n'
            data = data + 'data: {0}\n\n'.format(json.dumps({"status": 'INIT', "results": results}))
            return data

    try:
        competition = _COMPETITION_REPO.get_competition_by_id(competition_id)

        if competition is not None:
            request.environ['eventlet.minimum_write_chunk_size'] = 1
            Response.content_type = 'text/event-stream'

            return Response(stream_results(competition), mimetype="text/event-stream")
        else:
            return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}

    except Exception as e:
        print(str(e))
        return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}


@app.route('/download/data/<competition_id>')
def download_data(competition_id):
    """
    Dowload the .csv file with the records from the stream that have been published until now.

    :param competition_id: Competition ID
    :return: .csv file
    """
    def generate():
        data = StringIO()
        w = csv.writer(data)
        # Getting the dataset
        results = _MONGO_REPO.get_competition_data_records(competition_id)
        dataset = results['dataset']
        # TODO : put deadline at the end

        # Writing the header
        d = dataset[0]
        headers = d.keys()
        t = tuple(headers)
        w.writerow(t)
        yield data.getvalue()
        data.seek(0)
        data.truncate(0)

        # write each dataset item
        for item in dataset:
            v = tuple(item.values())
            w.writerow(v)
            yield data.getvalue()
            data.seek(0)
            data.truncate(0)

    # add a filename
    headers = Headers()
    headers.set('Content-Disposition', 'attachment', filename=competition_id + 'data.csv')
    # stream the response as the data is generated
    return Response(stream_with_context(generate()), mimetype='text/csv', headers=headers)


@app.route("/download/proto/<competition_id>")
def download_proto_file(competition_id):
    """
    Download the proto file for a given competition.
    :param competition_id: Competition ID
    :return: Responses:
                - .proto file
                - 404: File not found

    """
    competition = _COMPETITION_REPO.get_competition_by_id(competition_id)
    if competition is None:
        return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}
    try:
        path = os.path.join(config['UPLOAD_REPO'], config['COMPETITION_PROTO_REPO'], competition.name, 'file.proto')
        print(path)
        return send_file(path, as_attachment=True)
    except Exception as e:
        print(str(e))
        return json.dumps('no File'), 404, {'ContentType': 'application/json'}


if __name__ == '__main__':
    http_server = WSGIServer(('', 5000), app)
    http_server.serve_forever()
