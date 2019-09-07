import datetime
import json
from bson import json_util
from werkzeug.security import generate_password_hash, check_password_hash

password = "5eIWqOotMopq"

hashed = generate_password_hash(password)


print(hashed)

#print(check_password_hash(hashed_old, password))