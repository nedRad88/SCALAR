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


import jwt
import datetime
from repositories.CompetitionRepository import UserRepository
import json
import os

#TODO Why this key? Does it have to be hardcoded?
SECRET_KEY = b"\xf6f \x8a\x08Q\xbd\xca\x0c\x87t|\x0b<\xc0\xb4\x13\xb4\xc6\x13\x8d\x8f\xe6&"

"Read the environment variables."
with open('config.json') as json_data_file:
    config = json.load(json_data_file)
try:
    _SQL_HOST = os.environ['SQL_HOST']
except Exception:
    _SQL_HOST = config['SQL_HOST']
try:
    _SQL_DBNAME = os.environ['SQL_DBNAME']
except Exception:
    _SQL_DBNAME = config['SQL_DBNAME']

_USER_REPO = UserRepository(_SQL_HOST, _SQL_DBNAME)


def get_auth_token(user):
    """

    :param user:
    :return:
    """
    print(user)
    data_base_user = _USER_REPO.get_user_by_email(user['id'])
    print(data_base_user)

    if data_base_user is None:
        return 404, "Email Not found ! please check or register"

    if not data_base_user.check_password(user['password']):
        return 404, "Wrong password ! please check"

    if not data_base_user.confirmed:
        return 401, 'Please confirm your account'
    try:
        return encode_auth_token(data_base_user)
    except Exception as e:
        return 500, e


def encode_auth_token(user):
    """

    :param user:
    :return:
    """
    try:
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=0, hours=12),
            'iat': datetime.datetime.utcnow(),
            'firstName': user.first_name,
            'lastName': user.last_name,
            'id': user.email,
            'roles': [user.role] if user.role is not None else ['USER'],
            'confirmed': user.confirmed,
            'uid': user.user_id
        }
        return (200, jwt.encode(
            payload,
            SECRET_KEY,
            algorithm='HS256'
        ))
    except Exception as e:
        return 401, e


def decode_auth_token(auth_token):
    """

    :param auth_token:
    :return:
    """
    try:
        payload = jwt.decode(auth_token, SECRET_KEY)
        if not payload['confirmed']:
            return 100, 'Invalid token. Please confirm account'
        return 200, payload
    except jwt.ExpiredSignatureError:
        return 100, 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 100, 'Invalid token. Please log in again.'
