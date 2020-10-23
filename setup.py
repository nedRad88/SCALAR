import subprocess
import sys


def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--quiet"])

install("PyYAML")
install("pytz")
install("datetime")
import time
import yaml
import pytz
import datetime

bashCommand = "docker network create --driver bridge provider_network --subnet=172.22.0.0/16 --ip-range=172.22.0.0/24 --gateway=172.22.0.1"
try:
    subprocess.check_call(bashCommand.split())
except Exception as e:
    print(e)
    pass


def get_potentials(continent):
    local_names = []
    if time.daylight:
        local_offset = time.altzone
        localtz = time.tzname[1]
    else:
        local_offset = time.timezone
        localtz = time.tzname[0]

    local_offset = datetime.timedelta(seconds=-local_offset)

    for name in pytz.all_timezones:
        timezone = pytz.timezone(name)
        if not hasattr(timezone, '_tzinfos'):
            continue
        for (utcoffset, daylight, tzname), _ in timezone._tzinfos.items():
            if utcoffset == local_offset and tzname == localtz:
                local_names.append(name)

    potentials = []
    for item in local_names:
        if continent in item:
            potentials.append(item)

    return potentials


def confirm_tz(potentials):
    print("Choose your time zone from the following list:")
    for item in potential:
        print(item)

    time_zone = input("Your time zone is: ")

    final_zone = ''

    for item in potentials:
        if item.lower() == time_zone.lower().strip():
            final_zone = item

    return final_zone


user = input("Enter the Host Machine Name: ")

print("To set up your time zone, please enter your location as a part of the world,")
print("Enter one of the following: Africa, America, Arctic, Asia, Australia, Atlantic, Europe, Pacific")

continent = input("I am somewhere in: ")

potential = get_potentials(continent)

final_tz = confirm_tz(potential)
correct = False
count = 0
while not correct:
    if final_tz == '':
        print("Check your spelling and enter the time zone again: ")
        final_tz = confirm_tz(potential)
        count += 1
    elif final_tz == '' and count == 3:
        print("Wrong Time zone")
        break
    if final_tz != '':
        correct = True
        break


with open('docker-compose.yml') as file:
    compose = yaml.load(file, Loader=yaml.FullLoader)
print(compose)
compose['services']['kafka']['environment']['KAFKA_ADVERTISED_LISTENERS'] = 'INTERNAL://kafka:9092,EXTERNAL://' + user+ ':9094'
compose['services']['kafka']['environment']['TZ'] = final_tz
compose['services']['mongo_db']['environment']['TZ'] = final_tz
compose['services']['spark-master']['environment']['TZ'] = final_tz
compose['services']['provider']['environment']['TZ'] = final_tz
compose['services']['sql_db']['environment']['TZ'] = final_tz
compose['services']['worker1']['environment']['TZ'] = final_tz
compose['services']['zookeeper']['environment']['TZ'] = final_tz

with open('docker-compose.yml', 'w') as file1:
    documents = yaml.dump(compose, file1)

ubuntu_tz = []
