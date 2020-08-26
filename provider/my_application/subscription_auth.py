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

# TODO : make secret key global with authentication
SECRET_KEY = b"\xf6f \x8a\x08Q\xbd\xca\x0c\x87t|\x0b<\xc0\xb4\x13\xb4\xc6\x13\x8d\x8f\xe6&"


def get_subscription_token(competition_id, user_id):
    try:
        return encode_subscription_token(competition_id, user_id)
    except Exception as e:
        return 500, e


def encode_subscription_token(competition_id, user_id):
    try:
        payload = {
            'user_id': user_id,
            'competition_id': competition_id
        }

        print(jwt.encode(payload, SECRET_KEY, algorithm='HS256'))
        return 200, jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    except Exception as e:
        return 401, e


def decode_subscription_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY)
        return 200, payload
    except Exception as e:
        print(str(e))
