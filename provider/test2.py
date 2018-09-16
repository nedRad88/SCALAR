import datetime
import json
from bson import json_util


now = datetime.datetime.now()
print(now)
now_dt = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')

print(now_dt)
dict = {"Vreme": now_dt}
print(dict)

json1 = json.dumps(dict, default=json_util.default).encode('utf-8')
print(json1)


hello_list = []

for item in hello_list:
    print("Hello")