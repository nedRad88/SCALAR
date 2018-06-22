from repositories.CompetitionRepository import CompetitionRepository, Competition
from flask_wtf import FlaskForm
from wtforms import StringField, DateField, IntegerField, FileField


class CompetitionForm(FlaskForm):
    name = StringField()
    datastream_id = IntegerField()
    initial_batch_size = IntegerField()
    initial_training_time = IntegerField()
    batch_size = IntegerField()
    time_interval = IntegerField()
    # start_date = DateField('Start', widget=DatePickerWidget())
    # end_date = DateField('End', widget=DatePickerWidget())
    target_class = StringField()
    start_date = StringField()
    predictions_time_interval = IntegerField()


class DatastreamForm(FlaskForm):
    name = StringField()







