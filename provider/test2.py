import datetime
import json
import orjson
from bson import json_util
dict = {'key': 2}

test1 = orjson.dumps(dict)
print(type(test1))
test2 = orjson.loads(test1)
print(type(test2))

test3 = json.dumps(test2)
print(type(test3))
print(test3)

test4 = json.dumps(test1.decode('utf-8'), default=json_util.default)
print(type(test4))
print(test4)
print(type(json.loads(test3)))
#print(check_password_hash(hashed_old, password))