from __future__ import print_function
from producer import Scheduler
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Blueprint, flash, Markup, redirect, render_template, Flask, Response
from auth import decode_auth_token, get_auth_token
from subscription_auth import get_subscription_token
from functools import wraps
from flask_mail import Mail, Message
import threading
from flask import request
import json
import os
from os import path
import os.path
from werkzeug.utils import secure_filename
from grpc_tools import protoc
from flask import jsonify
from bson import json_util
from werkzeug.datastructures import ImmutableMultiDict
from forms import CompetitionForm, DatastreamForm
from repositories.CompetitionRepository import CompetitionRepository, Competition, Datastream, DatastreamRepository, \
    User, UserRepository, Subscription, SubscriptionRepository
from repository import MongoRepository
from flask import send_file
import logging

logging.basicConfig(level='INFO')
from itsdangerous import URLSafeTimedSerializer
import csv
from io import BytesIO
from flask import Flask, stream_with_context
from werkzeug.datastructures import Headers
import math

import datetime as dt
import string
import random
from hashids import Hashids

from eventlet import wsgi
import eventlet

eventlet.monkey_patch(time=True)

import time
import pause

time.sleep.__module__

app = Flask(__name__)

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = 'nedeljko.radulovic88@gmail.com'
app.config['MAIL_PASSWORD'] = 'usracuseU11i22'  # 'd1i3h5i7a'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['SECRET_KEY'] = 's3cr3t'
app.config['SECURITY_PASSWORD_SALT'] = 'my_precious_two'
mail = Mail(app)
app.debug = True

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

with open('config.json') as json_data_file:
    config = json.load(json_data_file)

_SQL_HOST = config['SQL_HOST']
_SQL_DBNAME = config['SQL_DBNAME']
_MONGO_HOST = config['MONGO_HOST']

_COMPETITION_REPO = CompetitionRepository(_SQL_HOST, _SQL_DBNAME)
_DATASTREAM_REPO = DatastreamRepository(_SQL_HOST, _SQL_DBNAME)
_USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)
_SUBSCRIPTION_REPO = SubscriptionRepository(_SQL_HOST, _SQL_DBNAME)

_MONGO_REPO = MongoRepository(_MONGO_HOST)


def authorized(*roles):
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
    user_name = request.form['username']
    password = request.form['password']

    user = {
        'id': user_name,
        'password': password
    }

    token = get_auth_token(user)

    if token[0] != 200:
        return json.dumps(token[1]).encode('utf-8'), 401, {'ContentType': 'application/json'}
    return jsonify({'access_token': token[1].decode("utf-8")})


@app.route('/auth/api/account/me')
@authorized('ADMIN', 'USER')
def me(user):
    return jsonify(user)


@app.route('/auth/api/account/confirm/<token>')
def confirm_email(token):
    logging.debug("Token: {}".format(token))
    try:
        email = confirm_token(token)
    except Exception as e:
        # flash('The confirmation link is invalid or has expired.', 'danger')
        logging.debug("Token not valid")

    user = _USER_REPO.get_user_by_email(email)
    if user.confirmed:
        logging.debug("already confirmed")
        # flash('Account already confirmed. Please login.', 'success')
    else:
        _USER_REPO.confirm_user(user)
        print('Account confirmed')

    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}


@app.route('/auth/register', methods=['POST'])
def register():
    data = json.loads(request.data.decode('utf-8'))
    # print(data)

    first_name = data['firstName']
    last_name = data['lastName']
    email = data['email']
    password = data['password']
    confirmed = False
    user = User(user_id=None, first_name=first_name, last_name=last_name, email=email, password=password, role='USER',
                confirmed=confirmed, confirmed_on=None)
    _USER_REPO.insert_one(user)

    token = generate_confirmation_token(email)

    # Sending Confirmation email
    msg = Message('Streaming Data Challenge : Registration confirmed', sender='nedeljko.radulovic88@gmail.com',
                  recipients=[email])
    # msg.body = "Hello  " + first_name + ' ' + last_name + "\n\n Welcome to Streaming Data Challenge platform \n\n Cheers, \n\n The team \n Please confirm \n" "http://streamigchallenge.cloudapp.net:5000/auth/api/account/confirm/"+ token
    msg.body = "Hello  " + first_name + ' ' + last_name + "\n\n Welcome to Streaming Data Challenge platform \n\n Cheers, \n\n The team \n Please confirm \n" "http://streamingcompetition.francecentral.cloudapp.azure.com:5000/auth/api/account/confirm/" + token
    # Was localhost:5000/auth...
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
    if request.method == 'GET':
        status = request.args.get('status')
        page = request.args.get('page')
        step = request.args.get('step')

        competitions = _COMPETITION_REPO.get_all_competitions(status, int(page), int(step))
        # print(competitions)
        # print("Jobs: ", _SCHEDULER.scheduler.get_jobs())
        return jsonify(competitions)

    if request.method == 'POST':

        data = dict(request.form)
        # print("Data: ", data)

        data = data['competition']
        data = data[0]
        data = json.loads(data)
        # print("Competition data: ", data)

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
        print("Target class: ", target_class)
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
            # print("Proto directory: ", proto_directory)

            if not os.path.exists(proto_directory):
                os.makedirs(proto_directory)

            data_file.save(os.path.join(proto_directory, 'file.proto'))
            # print("Proto file path: ", os.path.join(proto_directory, 'file.proto'))
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
            except Exception as e:  # e as Exception????
                print(str(e))

        code = ''
        competition = Competition(None, name=name, datastream_id=datastream_id, initial_batch_size=initial_batch_size,
                                  initial_training_time=initial_training_time, batch_size=batch_size,
                                  time_interval=time_interval, target_class=target_class, start_date=start_date,
                                  file_path=file_name, predictions_time_interval=predictions_time_interval,
                                  end_date=end_date, description=description, code=code)
        # print("Created competition: ******")

        _COMPETITION_REPO.insert_one(competition)
        code = code_generator(competition.competition_id)
        _COMPETITION_REPO.set_competition_code(competition.competition_id, code)

        evaluation_measures = {'competition_id': competition.competition_id, 'measures': competition_config}
        _MONGO_REPO.insert_document('evaluation_measures', 'evaluation_measures', evaluation_measures)

        _SCHEDULER.schedule_competition(competition, competition_config)
        # print("***********Competition scheduled!**********")

        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

    return json.dumps({'error': True}), 500, {'ContentType': 'application/json'}


@app.route('/api/competitions/<competition_id>')
def get_competition_info(competition_id):
    competition = _COMPETITION_REPO.get_competition_by_id(competition_id)
    logging.debug("Competition info request!")
    return jsonify(competition.serialize())


@app.route('/api/datastreams', methods=['GET', 'POST'])
def get_datastreams():
    if request.method == 'GET':
        status = request.args.get('status')
        page = request.args.get('page')
        step = request.args.get('step')
        datastreams = []
        logging.debug("Page, step: {}, {}".format(page, step))
        # logging.debug(str(page), str(step))
        if str(page) == 'null' or str(step) == 'null':
            datastreams = _DATASTREAM_REPO.get_all_datastreams(page=None, step=None)
        else:
            datastreams = _DATASTREAM_REPO.get_all_datastreams(int(page), int(step))
        # logging.debug(datastreams)
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
            # print name
            # filename = secure_filename(str(name)+ str(extension))
            # Move the file form the temporal folder to
            # the upload folder we setup
            data_directory = os.path.join(config['UPLOAD_REPO'], config['STREAM_DATA_FILE'])
            data_file_name = name + extension
            ds_path = os.path.join(data_directory, data_file_name)
            if not os.path.exists(data_directory):
                os.makedirs(data_directory)
            data_file.save(os.path.join(ds_path))

        datastream = Datastream(None, name=name, file_path=data_file_name)
        _DATASTREAM_REPO.insert_one(datastream)

        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

    return json.dumps({'error': True}), 500, {'ContentType': 'application/json'}


@app.route('/api/datastreams/<datastream_id>')
def get_datastream_info(datastream_id):
    datastream = _DATASTREAM_REPO.get_datastream_by_id(datastream_id)
    return jsonify(datastream.serialize())


@app.route('/api/results/<competition_id>')
def results_by_user_by_competition(competition_id):
    results = _MONGO_REPO.get_results_by_user(competition_id)
    return jsonify(results)


@app.route('/api/subscriptions', methods=['POST'])
def subscriptions():
    user_secret_key = ''
    try:
        data = json.loads(request.data.decode('utf-8'))
        competition = _COMPETITION_REPO.get_competition_by_id(data['competition_id'])
        user = _USER_REPO.get_user_by_email(data['user'])

        if competition is not None and user is not None:
            # insert subscriptions
            subscription = Subscription(None, competition.competition_id, user.user_id)
            logging.debug("here4: {}".format(subscription))
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
    try:
        data = json.loads(request.data)
        competition = _COMPETITION_REPO.get_competition_by_id(data['competition_id'])
        user = _USER_REPO.get_user_by_email(data['user'])

        if competition is not None and user is not None:
            # insert subscriptions
            # subscription = Subscription(None, competition.competition_id, user.user_id)
            subscription = _SUBSCRIPTION_REPO.get_subscription(competition.competition_id, user.user_id)
            _SUBSCRIPTION_REPO.delete_one(subscription)

    except Exception as e:
        print(str(e))

    return json.dumps('OK'), 200, {'ContentType': 'application/json'}


@app.route('/api/subscriptions/check')
def check_subscription():
    user = request.args.get('user')
    competition = request.args.get('competition')
    s = _SUBSCRIPTION_REPO.check_subscription(competition, user)
    return json.dumps(s), 200, {'ContentType': 'application/json'}


@app.route('/api/subscriptions/secret')
def get_secret_key():
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
        # print(str(e))

    # logging.debug(user_secret_key)
    if len(user_secret_key) > 0:
        return json.dumps({'secret_key': user_secret_key[1].decode("utf-8")}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'secret_key': user_secret_key}), 404, {'ContentType': 'application/json'}


@app.route('/api/users/<user_id>/competitions')
def get_competitions_by_user(user_id):
    status = request.args.get('status')
    page = request.args.get('page')
    step = request.args.get('step')

    user_competitions = _COMPETITION_REPO.get_competitions_by_user(user_id, status, int(page), int(step))
    return jsonify(user_competitions)


@app.route('/api/evaluation/<competition_id>')
def get_competition_evaluation_measure(competition_id):
    competition_measures = _MONGO_REPO.get_competition_evaluation_measures(competition_id)
    logging.debug("Competition measures: {}".format(competition_measures))
    return jsonify(competition_measures)


@app.route('/api/evaluation/measures')
def get_standard_evaluation_measures():
    measures = _MONGO_REPO.get_standard_evaluation_measures()
    return jsonify(measures)


@app.route('/api/leaderboard/<competition_id>')
def get_leaderboard_by_competition(competition_id):
    field = request.args.get('field')
    measure = request.args.get('measure')

    results = []
    # TODO Check this query
    competition_results = _MONGO_REPO.get_users_ranking_by_field_by_measure(competition_id, field, measure)

    for r in competition_results:
        if r['id'] == 0:
            res = {'id': r['id'], 'firstName': "Test", 'lastName': "Baseline", 'email': " ",
                   'measure': r['measures']}
        else:
            user = _USER_REPO.get_user_by_id(r['id'])
            res = {'id': r['id'], 'firstName': user.first_name, 'lastName': user.last_name, 'email': user.email,
                   'measure': r['measures']}
        results.append(res)

    return jsonify(results)


@app.route("/competition/<competition_id>/stream")
def get_competition_stream(competition_id):
    db = _MONGO_REPO.client['data']
    collection = db['data']
    stream = collection.find_one({"competition_id": competition_id})
    return json.dumps(stream['dataset']), 200, {'ContentType': 'application/json'}


@app.route("/competition/<competition_id>/golden_standard")
def get_competition_golden_standard(competition_id):
    db = _MONGO_REPO.client['data']
    collection = db['golden_standard']
    stream = collection.find_one({"competition_id": competition_id})
    return json.dumps(stream['dataset']), 200, {'ContentType': 'application/json'}


# app.config['UPLOAD_FOLDER'] = '../local/data/uploads/'
# These are the extension that we are accepting to be uploaded
app.config['ALLOWED_EXTENSIONS'] = set(['csv', 'xls', 'proto'])


# For a given file, return whether it's an allowed type or not
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in app.config['ALLOWED_EXTENSIONS']


def get_file_extension(filename):
    file_name, extension = os.path.splitext(filename)
    return extension


@app.route('/topic/<competition_id>/<field>/<measure>')
def get_messages(competition_id, field, measure):
    def stream_results(competition):
        # Getting competition from Database

        # Check if competition finished or no
        now = datetime.now()

        if competition.end_date > now:
            logging.debug("Competition not over yet!")
            if competition.predictions_time_interval < 5:
                evaluation_time_interval = 5
            else:
                evaluation_time_interval = competition.predictions_time_interval

            if competition.start_date > now:
                # Competition hasn't started yet
                data = 'retry: 100000000\n'
                data = data + 'data: {0}\n\n'.format(json.dumps({"Error": 'Competition not started Yet'}))
                yield data
                # Wait until competition starts and first
                pause.until(competition.start_date + dt.timedelta(seconds=competition.initial_training_time +
                                                                          competition.time_interval +
                                                                          evaluation_time_interval + 2))

            else:
                # Get Initial Measures
                results = _MONGO_REPO.get_results_by_user(competition.competition_id, field, measure)
                data = 'retry: 100000000\n'
                data = data + 'data: {0}\n\n'.format(json.dumps({"status": 'INIT', "results": results}))

                yield data

                if len(results) > 0:
                    random_user_results = results[0]['results']
                    last_interval = random_user_results[len(random_user_results) - 1]['label']

                    if int(last_interval['Year']) % 4 != 0:
                        leap_year = False
                    elif int(last_interval['Year']) % 100 != 0:
                        leap_year = True
                    elif int(last_interval['Year']) % 400 != 0:
                        leap_year = False
                    else:
                        leap_year = True

                    pause_second = int(last_interval['Second']) + evaluation_time_interval
                    pause_minute = int(last_interval['Minute'])
                    pause_hour = int(last_interval['Hour'])
                    pause_day = int(last_interval['Day'])
                    pause_month = int(last_interval['Month'])
                    pause_year = int(last_interval['Year'])
                    if pause_second > 59:
                        pause_minute = pause_minute + 1
                        pause_second = pause_second - 60
                        if pause_minute > 59:
                            pause_hour = pause_hour + 1
                            pause_minute = pause_minute - 60
                            if pause_hour > 23:
                                pause_day = pause_day + 1
                                pause_hour = pause_hour - 24
                                if pause_month in [1, 3, 5, 7, 8, 10, 12] and pause_day > 31:
                                    pause_day = pause_day - 31
                                    pause_month = pause_month + 1
                                if pause_month in [4, 6, 9, 11] and pause_day > 30:
                                    pause_day = pause_day - 30
                                    pause_month = pause_month + 1
                                if pause_month == 2 and pause_day > 28 and not leap_year:
                                    pause_day = pause_day - 28
                                    pause_month = pause_month + 1
                                if pause_month == 2 and pause_day > 29 and leap_year:
                                    pause_day = pause_day - 29
                                    pause_month = pause_month + 1
                                if pause_month > 12:
                                    pause_month = pause_month - 12
                                    pause_year = pause_year + 1

                    pause.until(datetime(
                        year=pause_year,
                        month=pause_month,
                        day=pause_day,
                        hour=pause_hour,
                        minute=pause_minute,
                        second=pause_second
                    ))

            continue_loop = True

            while continue_loop:
                now = datetime.now()

                if now > competition.end_date + dt.timedelta(seconds=evaluation_time_interval):
                    continue_loop = False

                else:
                    results_by_user = _MONGO_REPO.get_last_predictions_by_user(competition_id, now, field, measure,
                                                                               evaluation_time_interval)
                    data = 'retry: 100000000\n'
                    data = data + 'data: {0}\n\n'.format(
                        json.dumps({"status": 'INCREMENT', "results": results_by_user}))
                    # print(data)
                    yield data

                    time.sleep(evaluation_time_interval)

        else:
            # Ended
            logging.debug("Competition finished!")
            results = _MONGO_REPO.get_results_by_user(competition_id, field, measure)
            data = 'retry: 100000000\n'
            data = data + 'data: {0}\n\n'.format(json.dumps({"status": 'INIT', "results": results}))
            yield data

    try:
        competition = _COMPETITION_REPO.get_competition_by_id(competition_id)

        if competition is not None:
            request.environ['eventlet.minimum_write_chunk_size'] = 1
            Response.content_type = 'text/event-stream'
            # Response.cache_control = 'no-cache'
            # Response.headers['Cache-Control'] = 'no-cache'

            return Response(stream_results(competition), mimetype="text/event-stream")
        else:
            return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}

    except Exception as e:
        print(str(e))
        return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}


@app.route('/download/data/<competition_id>')
def download_data(competition_id):
    def generate():
        data = BytesIO()
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
    return Response(
        stream_with_context(generate()),
        mimetype='text/csv', headers=headers
    )


@app.route("/download/proto/<competition_id>")
def download_proto_file(competition_id):
    competition = _COMPETITION_REPO.get_competition_by_id(competition_id)
    if competition is None:
        return json.dumps('Competition not found !, please check'), 404, {'ContentType': 'application/json'}

    try:
        path = os.path.join(config['UPLOAD_REPO'], config['COMPETITION_PROTO_REPO'], competition.name, 'file.proto')
        print(path)
        return send_file(path, as_attachment=True)
    except Exception as e:
        # self.log.exception(e)
        # self.Error(400)
        print(str(e))
        return json.dumps('no File'), 404, {'ContentType': 'application/json'}

        # return ('', 204)


if __name__ == '__main__':
    # app.run(host='0.0.0.0', port='5000')
    # http_server = WSGIServer(('', 5000), app)
    # http_server.serve_forever()
    wsgi.server(eventlet.listen(('', 5000)), app, debug=True)
