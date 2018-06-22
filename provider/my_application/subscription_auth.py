import jwt
import sys

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


"""
if __name__ == '__main__':


    encoded_1 = get_subscription_token(1,1)
    print(encoded_1)
    encoded_2 = get_subscription_token(1,2)
    print(encoded_2)
    encoded_3 = get_subscription_token(1,2)
    print(encoded_3)

    print('1', decode_subscription_token (encoded_1[1]))
    print('2', decode_subscription_token (encoded_2[1]))
    print('3', decode_subscription_token (encoded_3[1]))"""









