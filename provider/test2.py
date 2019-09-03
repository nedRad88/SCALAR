import datetime
import json
from bson import json_util
from werkzeug.security import generate_password_hash, check_password_hash

password = "Mht3mPp4sS"

hashed = generate_password_hash(password)

hashed_old = "pbkdf2:sha256:50000$GskN1kar$9ae718826ed6e0af650ba0180838d97e6b7946f996f3264e5695cc077dc35721"
print(hashed)

print(check_password_hash(hashed_old, password))