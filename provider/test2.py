import datetime
import json
from bson import json_util


now = str(datetime.datetime.now().isoformat())
print(now)
now_dt = datetime.datetime.strptime(now, '%Y-%m-%dT%H:%M:%S.%f')
print(now_dt)

