from dateutil import parser
import datetime
import time
import math
from repository import MongoRepository
import sys

mongo_repository = MongoRepository('172.22.0.3')
db = mongo_repository.client['data']
db_evaluations = mongo_repository.client['evaluation_measures']

"""date = "2017-06-12 13:27:09.062"""


# start = "2017-06-12 13:28:00.000Z"
# start = "2017-06-13 13:26:00.000Z"

# start = datetime.datetime.strptime(start,"%Y-%m-%d %H:%M:%S.000Z")


class Evaluator():
    """
    def _ordered(obj):
        if isinstance(obj, dict):
            return sorted((k, ordered(v)) for k, v in obj.items())
        if isinstance(obj, list):
            return sorted(ordered(x) for x in obj)
        else:
            return obj
    """
    # takes competition id and must have a config
    @staticmethod
    def evaluate(competition_id, config, evaluation_time_interval):
        # print (datetime.datetime.now())
        # print ('evaluating ' + str(competition_id), datetime.datetime.now())

        # date = datetime.datetime.now() - datetime.timedelta(minutes=1)
        # now = datetime.datetime.now()

        # now = datetime.strptime(start,"%Y-%m-%dT%H:%M:%S.000Z")
        # global start
        now = datetime.datetime.now()
        # TODO : check according to predictions time interval
        date = now - datetime.timedelta(seconds=evaluation_time_interval + 2)  # Was 10 sec

        # start  = start + datetime.timedelta(minutes = 1)

        # print(date, now)
        try:

            new_predictions = db.predictions_v2.aggregate([
                {"$match": {"$and": [{"competition_id": competition_id},
                                     {"submitted_on": {"$gte": date, "$lt": now}}
                                     ]
                            }
                 },
                {"$group": {"_id": "$user_id", "predictions": {"$push": "$$ROOT"}}
                 },
            ])

            # New predictions grouped by user_id
            # print(len(list(new_predictions)))
            test = []
            for prediction in new_predictions:
                rowIDs = []
                user_id = None
                for p in prediction['predictions']:
                    if not user_id:
                        user_id = int(p['user_id'])
                    del p['user_id']
                    del p['competition_id']
                    del p['_id']
                    if 'rowID' in p:
                        rowIDs.append(p['rowID'])
                    else:
                        prediction['predictions'].remove(p)

                golden = db.golden_standard.find({"$and": [{"rowID": {"$in": rowIDs}}, {"competition_id": competition_id}]})
                # added competition_id
                time_series_instance = {}
                time_series_instance['nb_submissions'] = 0
                time_series_instance['user_id'] = int(user_id)
                time_series_instance['competition_id'] = competition_id
                time_series_instance['start_date'] = date
                time_series_instance['end_date'] = now

                time_series_instance['latency'] = 0
                time_series_instance['penalized'] = 0
                time_series_instance['measures'] = {}
                time_series_instance['batch_measures'] = {}

                # getting the fields in case of multilabel
                fields = None
                if not fields:
                    fields = []
                    delete_columns = ['_id', 'competition_id', 'rowID', 'Deadline', 'Released']
                    g = golden.next()
                    keys = g.keys()
                    for k in keys:
                        if k not in delete_columns:
                            fields.append(k)
                            measures = {}
                            batch_measures = {}
                            for v in config[k]:
                                measures[v] = 0
                                batch_measures[v] = 0
                            time_series_instance['measures'][k] = measures
                            time_series_instance['batch_measures'][k] = batch_measures

                golden = sorted(golden, key=lambda k: k['rowID'])
                user_predictions = sorted(prediction['predictions'], key=lambda k: k['rowID'])

                for p in user_predictions:
                    for g in golden:
                        rowID = g['rowID']
                        if 'rowID' in p:
                            if rowID == p['rowID']:
                                submitted_on = p['submitted_on']
                                released_at = g['Released']
                                deadline = g['Deadline']
                                if submitted_on < deadline:
                                    # Global measures
                                    latency = submitted_on - released_at
                                    time_series_instance['latency'] = time_series_instance[
                                                                          'latency'] + latency.total_seconds()
                                    time_series_instance['nb_submissions'] = time_series_instance['nb_submissions'] + 1
                                    del p['rowID']
                                    del p['submitted_on']
                                    # Update field specific measures
                                    for field, v in time_series_instance['measures'].items():
                                        for measure, value in v.items():
                                            # check what measure to compute
                                            if measure == "MAPE":
                                                # compute variance
                                                g[field] = float(str(g[field]))
                                                error = float(g[field] - p[field]) / float(g[field])
                                                error = math.fabs(error)
                                                time_series_instance['batch_measures'][field][measure] = v[measure]
                                                v[measure] = v[measure] + error

                                            # Add MSE, response_time

                                            elif measure == "PRECISION":
                                                i = 1
                                            elif measure == "RECALL":
                                                i = 1
                                            else:
                                                print("unknown measure")
                                else:
                                    time_series_instance['penalized'] = time_series_instance['penalized'] + 1

                        else:
                            # print(p)
                            i = 1


                try:

                    # last_object = db_evaluations.meaures.find({"$and" : [{"user_id" : user_id}, {"competition_id" : competition_id } ]}).sort('end_date' ,-1 ).limit(1)
                    last_object = db_evaluations.measures.find(
                        {"$and": [{"user_id": int(user_id)}, {"competition_id": competition_id}]}).sort("end_date",
                                                                                                        -1).limit(1)

                    last_object = list(last_object)
                    # print(last_object)

                    # for measure in time_series_instance['measures']

                    if len(last_object) > 0:

                        last_object = last_object[0]
                        # Update incremental measures

                        # "MAPE"
                        n1 = last_object['nb_submissions']
                        # variance1= last_object["MAPE"]

                        n2 = time_series_instance['nb_submissions']
                        # variance2 = time_series_instance["MAPE"]

                        # new_variance = float(n1 * variance1 + 100 * variance2) / float(n1 + n2)

                        # time_series_instance["MAPE"] = time_series_instance["MAPE"] + last_object["MAPE"]
                        # time_series_instance["MAPE"] = new_variance

                        # Average reactivity
                        latency1 = last_object['latency']
                        latency2 = time_series_instance['latency']
                        new_latency = float(n1 * latency1 + latency2) / float(n1 + n2)

                        time_series_instance['latency'] = new_latency

                        # Number of valid submissions
                        time_series_instance['nb_submissions'] = time_series_instance['nb_submissions'] + last_object[
                            'nb_submissions']

                        for field, measures in time_series_instance['measures'].items():
                            for measure, value in measures.items():
                                if measure == "MAPE":
                                    old_value = last_object['measures'][field][measure]
                                    value = float(old_value * n1 + 100 * value) / float(n1 + n2)
                                    time_series_instance['measures'][str(field)][str(measure)] = value

                        # print(time_series_instance)
                        db_evaluations.measures.insert_one(time_series_instance)

                        # print(n1,n2,latency1, latency2, variance1, variance2)

                    else:
                        # print (time_series_instance)
                        # time_series_instance['latency'] = float(time_series_instance['latency'] ) / float(time_series_instance['nb_submissions'])
                        # time_series_instance["MAPE"] = float( 100 * time_series_instance["MAPE"]) / float(time_series_instance['nb_submissions'])

                        for field, measures in time_series_instance['measures'].items():
                            for measure, value in measures.items():
                                if measure == "MAPE":
                                    # print ('intermediate' , value)
                                    value = 100 * float(value) / float(time_series_instance['nb_submissions'])
                                    time_series_instance['measures'][str(field)][str(measure)] = value
                        # print ('final', time_series_instance['measures'])
                        db_evaluations.measures.insert_one(time_series_instance)

                except Exception as e:
                    print(str(e))
        except Exception as e:
            print(str(e))
