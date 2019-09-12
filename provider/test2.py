from werkzeug.security import generate_password_hash, check_password_hash


password = 'sMECgJ87HhGH'

hashed = generate_password_hash(password)

print(hashed)



