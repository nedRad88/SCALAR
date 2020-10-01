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


from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.types import Integer, String, Boolean
from datetime import datetime
from sqlalchemy import and_

_BASE = declarative_base()


class Competition(_BASE):
    __tablename__ = 'competition'

    competition_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64))
    datastream_id = Column(Integer, ForeignKey('datastream.datastream_id'))
    initial_batch_size = Column(Integer)
    initial_training_time = Column(Integer)
    batch_size = Column(Integer)
    time_interval = Column(Integer)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    predictions_time_interval = Column(Integer)
    target_class = Column(String(32))
    file_path = Column(String(255))
    description = Column(String(255))
    code = Column(String(10))

    __table_args__ = (UniqueConstraint('name'),
                      )

    datastream = relationship("Datastream", back_populates="competitions")

    def __init__(self, competition_id, name, datastream_id, initial_batch_size, initial_training_time, batch_size,
                 time_interval, start_date, end_date, target_class, file_path, predictions_time_interval, description,
                 code):
        """
        Construct a class for Competition table
        :param competition_id:
        :param name:
        :param datastream_id:
        :param initial_batch_size:
        :param initial_training_time:
        :param batch_size:
        :param time_interval:
        :param start_date:
        :param end_date:
        :param target_class:
        :param file_path:
        :param predictions_time_interval:
        :param description:
        :param code: Competition code
        """
        self.competition_id = competition_id
        self.name = name
        self.datastream_id = datastream_id
        self.initial_batch_size = initial_batch_size
        self.initial_training_time = initial_training_time
        self.batch_size = batch_size
        self.time_interval = time_interval
        self.start_date = start_date
        self.end_date = end_date
        self.target_class = target_class
        self.file_path = file_path
        self.predictions_time_interval = predictions_time_interval
        self.description = description
        self.code = code

    def serialize(self):
        # print (self.target_class)
        return {
            'competition_id': self.competition_id,
            'name': self.name,
            'datastream_id': self.datastream_id,
            'initial_batch_size': self.initial_batch_size,
            'initial_training_time': self.initial_training_time,
            'batch_size': self.batch_size,
            'time_interval': self.time_interval,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'target_class': self.target_class,
            'predictions_time_interval': self.predictions_time_interval,
            'description': self.description,
            'code': self.code
        }


class Datastream(_BASE):
    __tablename__ = 'datastream'
    datastream_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64))
    file_path = Column(String(255))
    description = Column(String(255))
    competitions = relationship("Competition", back_populates='datastream', lazy='dynamic')

    __table_args__ = (UniqueConstraint('name'),)

    def __init__(self, datastream_id, name, description, file_path):
        """
        Construct a class for Datastream table.
        :param datastream_id:
        :param name:
        :param description:
        :param file_path:
        """
        self.datastream_id = datastream_id
        self.name = name
        self.description = description
        self.file_path = file_path

    def serialize(self):
        return {'datastream_id': self.datastream_id, 'name': self.name, 'description': self.description}


class User(_BASE):
    __tablename__ = 'USERS'
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(32))
    last_name = Column(String(32))
    email = Column(String(32))
    password_hash = Column(String(256))
    role = Column(String(32))

    confirmed = Column(Boolean, nullable=False, default=False)
    confirmed_on = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint('email'),)

    def __init__(self, user_id, first_name, last_name, email, password, role, confirmed, confirmed_on):
        """
        Construct the class for USERS table.

        :param user_id:
        :param first_name:
        :param last_name:
        :param email:
        :param password:
        :param role:
        :param confirmed:
        :param confirmed_on:
        """
        self.user_id = user_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.role = role
        self.set_password(password)
        self.confirmed = confirmed
        self.confirmed_on = confirmed_on

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            'user_id': self.user_id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'email': self.email,
            'role': self.role
        }


class Subscription(_BASE):
    __tablename__ = 'subscriptions'

    subscription_id = Column('id', Integer, primary_key=True, autoincrement=True)
    competition_id = Column(Integer, ForeignKey('competition.competition_id'))
    user_id = Column(Integer, ForeignKey('USERS.user_id'))
    time_create = Column(DateTime, nullable=False, default=func.now())

    competition = relationship("Competition", backref="memberships")
    user = relationship("User", backref="memberships")

    __table_args__ = (UniqueConstraint('competition_id', 'user_id'),)

    def __init__(self, subscription_id, competition_id, user_id):
        """
        Construct the class for Subscriptions table.
        :param subscription_id:
        :param competition_id:
        :param user_id:
        """
        self.subscription_id = subscription_id
        self.competition_id = competition_id
        self.user_id = user_id


class BaseRepository():
    """
    Repository base class.
    Implements the methods to write or delete rows in the table.

    --------------------------------------------------------------------
        insert_one(): inserts one row in the table

        insert_many(): insets multiple rows in the table

        delete_one(): deletes one row from the table

    """
    instance = None

    def __init__(self, host, dbname):
        self.instance = None
        self.engine = create_engine(host + dbname)
        self.sessionmaker = sessionmaker()
        self.sessionmaker.configure(bind=self.engine)
        self.Base = _BASE
        self.Base.metadata.create_all(self.engine)

        if not self.instance:
            self.session = self.sessionmaker()

    def insert_one(self, row):
        try:
            self.session.add(row)
            self.session.commit()
        except Exception as e:
            print(e)
            self.session.rollback()

    def insert_many(self, rows):
        try:
            for row in rows:
                self.session.add(row)
            self.session.commit()
        except Exception as e:
            print(e)
            self.session.rollback()

    def delete_one(self, row):
        try:
            self.session.delete(row)
            self.session.commit()
        except Exception as e:
            print(e)
            self.session.rollback()

    def cleanup(self):
        self.session.close()
        self.engine.dispose()


class CompetitionRepository(BaseRepository):
    """
    Competition repository class.

    Implements the methods to retrieve competitions by different condititons.

    ---------------------------------------------------------------------------

        get_competition_by_id(): Retrieve competition by its ID

        set_competition_code(): Update the competition code

        get_all_competitions(): Retrieve all competition

        get_competition_by_code(): Retrieve the competition by code

        get_competitions_by_user(): Retrieve competition for a given user


    """

    def __init__(self, host, dbname):
        BaseRepository.__init__(self, host, dbname)

    def get_competition_by_id(self, competition_id):
        results = self.session.query(Competition).filter_by(competition_id=competition_id)
        try:
            return results[0]
        except Exception as e:
            pass

    def set_competition_code(self, competition_id, code):
        self.session.query(Competition).filter_by(competition_id=competition_id).update({"code": code})
        self.session.commit()

    def get_all_competitions(self, status=None, page=None, step=None):
        now = datetime.now()
        results = None
        if status == 'all':
            try:
                results = self.session.query(Competition)
            except Exception:
                self.session.rollback()
        elif status == 'active':
            try:
                results = self.session.query(Competition).filter(and_(Competition.end_date > now,
                                                                      Competition.start_date < now))
            except Exception:
                self.session.rollback()
        elif status == 'coming':
            try:
                results = self.session.query(Competition).filter(Competition.start_date >= now)
            except Exception:
                self.session.rollback()
        elif status == 'finished':
            try:
                results = self.session.query(Competition).filter(Competition.end_date <= now)
            except Exception:
                self.session.rollback()
        else:
            raise ValueError('Unknown type ' + status)

        if results is not None:
            copy = results
            if step:
                results = results.limit(step)
            if page:
                results = results.offset((page - 1) * step)
            data = []
            for r in results:
                row = {'name': r.name, 'id': r.competition_id, 'description': r.description,
                       'start_date': r.start_date.strftime("%Y-%m-%d %H:%M"),
                       'end_date': r.end_date.strftime("%Y-%m-%d %H:%M")}

                data.append(row)

            return {'data': data, 'total': copy.count()}
        else:
            return {'data': [], 'total': 0}

    def get_competition_by_code(self, code):
        results = self.session.query(Competition).filter_by(code=code)
        try:
            return results[0]
        except Exception as e:
            return None

    def get_competitions_by_user(self, user_id, status, page, step):
        sub_query = None
        results = None
        try:
            sub_query = self.session.query(Subscription).filter_by(user_id=user_id).subquery()
        except Exception:
            self.session.rollback()

        now = datetime.now()
        if status == 'all':
            try:
                results = self.session.query(Competition).join(sub_query,
                                                               sub_query.c.competition_id == Competition.competition_id)
            except Exception:
                self.session.rollback()

        elif status == 'active':
            try:
                results = self.session.query(Competition).filter(and_(Competition.end_date > now,
                                                                      Competition.start_date < now)).join(sub_query,
                                                                                                          sub_query.c.competition_id == Competition.competition_id)
            except Exception:
                self.session.rollback()

        elif status == 'coming':
            try:
                results = self.session.query(Competition).filter(Competition.start_date >= now).join(sub_query,
                                                                                                     sub_query.c.competition_id == Competition.competition_id)
            except Exception:
                self.session.rollback()

        elif status == 'finished':
            try:
                results = self.session.query(Competition).filter(Competition.end_date <= now).join(sub_query,
                                                                                                   sub_query.c.competition_id == Competition.competition_id)
            except Exception:
                self.session.rollback()

        else:
            raise ValueError('Unknown type ' + status)

        if results is not None:
            copy = results
            if step:
                results = results.limit(step)
            if page:
                results = results.offset((page - 1) * step)

            data = []
            for r in results:
                row = {'name': r.name, 'id': r.competition_id, 'description': r.description,
                       'start_date': r.start_date.strftime("%Y-%m-%d %H:%M"),
                       'end_date': r.end_date.strftime("%Y-%m-%d %H:%M")}
                data.append(row)

            return {'data': data, 'total': copy.count()}
        else:
            return {'data': [], 'total': 0}


class DatastreamRepository(BaseRepository):
    """
        Competition repository class.

        Implements the methods to retrieve competitions by different condititons.

        ---------------------------------------------------------------------------

            get_competition_by_id(): Retrieve competition by its ID

            set_competition_code(): Update the competition code

            get_all_competitions(): Retrieve all competition

            get_competition_by_code(): Retrieve the competition by code

            get_competitions_by_user(): Retrieve competition for a given user


        """

    def __init__(self, host, dbname):
        BaseRepository.__init__(self, host, dbname)

    def get_datastream_by_id(self, datastream_id):
        results = None
        try:
            results = self.session.query(Datastream).filter_by(datastream_id=datastream_id).first()
        except Exception:
            self.session.rollback()
        if not results:
            return None
        else:
            return results

    def get_all_datastreams(self, page=None, step=None):
        results = None
        try:
            results = self.session.query(Datastream)
        except Exception:
            self.session.rollback()

        if results is not None:
            copy = results
            if step:
                results = results.limit(step)
            if page:
                results = results.offset((page - 1) * step)
            data = [r.serialize() for r in results]

            return {'data': data, 'total': copy.count()}
        else:
            return {'data': [], 'total': 0}


class UserRepository(BaseRepository):
    """
        User repository class.

        Implements the methods to query the USERS table.

        ---------------------------------------------------------------------------

            get_user_by_id(): Retrieve user information based on his ID

            get_user_by_email(): Retrieve user information based on his email

            get_all_users(): List all users

            delete_many(): Delete several users at the same time

            confirm_user(): Manually confirm user's registration


        """
    def __init__(self, host, dbname):
        BaseRepository.__init__(self, host, dbname)
    def get_user_by_id(self, id):
        results = None
        try:
            results = self.session.query(User).filter_by(user_id=id).first()
        except Exception:
            self.session.rollback()
        return results

    def get_user_by_email(self, email):
        results = None
        try:
            results = self.session.query(User).filter_by(email=email).first()
        except Exception:
            self.session.rollback()
        return results

    def get_all_users(self):
        results = None
        try:
            results = self.session.query(User)
        except Exception:
            self.session.rollback()
        return results

    def delete_many(self, users):
        self.session.query(User).delete().where(User.email.in_(users))
        self.session.flush()
        self.session.commit()

    def confirm_user(self, user):
        user.confirmed = True
        user.confirmed_on = datetime.now()
        self.session.commit()


class SubscriptionRepository(BaseRepository):
    """
        Subscription repository class.

        Implements the methods to retrieve subscriptions by different condititons.

        ---------------------------------------------------------------------------

            get_competition_subscribers(): Get users that subscribed to the competition

            check_subscription(): Check if a given user is subscribed to a given competition

            get_subscription(): Retrieve the subscription for a user


        """
    def __init__(self, host, dbname):
        BaseRepository.__init__(self, host, dbname)

    def get_competition_subscribers(self, competition_id):
        users = None
        try:
            users = self.session.query(Subscription).filter_by(competition_id=competition_id)
        except Exception:
            self.session.rollback()
        return users

    def check_subscription(self, competition_id, user_id):
        subscribed = None
        try:
            s = self.session.query(Subscription).filter_by(competition_id=competition_id, user_id=user_id)
            subscribed = False if len(list(s)) == 0 else True
        except Exception:
            self.session.rollback()
        return subscribed

    def get_subscription(self, competition_id, user_id):
        s = None
        try:
            s = self.session.query(Subscription).filter_by(competition_id=competition_id, user_id=user_id).first()
        except Exception:
            self.session.rollback()
        return s
