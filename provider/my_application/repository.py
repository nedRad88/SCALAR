import pymongo
import sys
from pymongo import MongoClient
import datetime


class MongoRepository():
    client = None

    def __init__(self, mongo_host):
        try:
            self.client = MongoClient(mongo_host, 27017)
        except Exception as e:
            sys.stderr.write(str(e))

    def create_database(self, db_name):
        db = self.client[db_name]
        return db

    def create_collection(self, db_name, collection_name):
        db = self.client[db_name]
        collection = db[collection_name]
        return collection

    def insert_document(self, db_name, collection_name, document):
        db = self.client[db_name]
        collection = db[collection_name]
        collection.insert_one(document)

    def get_competition_data_records(self, competition_id):
        db = self.client['data']
        collection = db['data']
        results = collection.find_one({"competition_id": competition_id})
        return results

    def get_competition_evaluation_measures(self, competition_id):
        db = self.client['evaluation_measures']
        collection = db['evaluation_measures']

        results = collection.find_one({"competition_id": int(competition_id)})
        data = []

        record = {}
        record['competition_id'] = results['competition_id']
        record['measures'] = results['measures']

        return record

    def get_standard_evaluation_measures(self):
        db = self.client['evaluation_measures']
        collection = db['standard_measures']

        measures = collection.find({})
        data = []

        # print(measures)
        for m in measures:
            # print(m)
            data.append(m['name'])

        return data

    def get_results_by_user(self, competition_id, field, measure):

        db = self.client['evaluation_measures']
        collection = db['measures']
        """
        res = collection.find()
        for r in res : 
            print('INIT',r)"""

        results = collection.aggregate([
            {"$match": {"$and":
                [
                    {"competition_id": int(competition_id)}

                ]}
            },

            {
                "$group":
                    {
                        "_id": "$user_id",
                        "measures": {"$push": "$$ROOT"}
                    }
            },
            {
                "$project": {
                    "measures.competition_id": 0,
                    "measures._id": 0
                }
            },
            {"$sort": {"_id": 1}}

        ])

        # results = collection.find({"$and" : [{"competition_id" : int(competition_id)}, {"user_id" : int(user_id)}]}, { "user_id": 0, "competition_id": 0, "_id": 0 })

        final_stats = []
        for r in results:
            stats = {'user_id': r['_id'], 'results': []}
            measures = r['measures']
            for m in measures:
                start_date = m['start_date']
                end_date = m['end_date']
                center_date = start_date + (end_date - start_date) / 2

                year = str(center_date.year)
                month = str(center_date.month)
                day = str(center_date.day)
                hour = str(center_date.hour)
                minute = str(center_date.minute)
                second = str(center_date.second)

                row = {"label": {"Year": year, "Month": month, "Day": day, "Hour": hour, "Minute": minute,
                                 "Second": second},
                       "data": m['measures'][str(field)][str(measure)]}

                stats['results'].append(row)
            final_stats.append(stats)

        # print (final_stats)

        return final_stats

    def get_last_predictions_by_user(self, competition_id, now, field, measure, evaluation_time_interval):
        db = self.client['evaluation_measures']
        collection = db['measures']
        # print('#######################################')
        # print('\n')
        """
        res = collection.find()
        final_stats = []
        for r in res:
            #print('lest', r['start_date'], r['end_date'], start_date)
            final_stats.append(r)
            #print('\n')
            {"start_date" : {"gte" : start_date}}
        """
        date = now - datetime.timedelta(seconds=evaluation_time_interval)
        results = collection.aggregate([
            {"$match": {"$and":
                [
                    {"competition_id": int(competition_id)},
                    {"start_date": {"$gte": date, "$lt": now}}

                ]}
            },

            {
                "$group":
                    {
                        "_id": "$user_id",
                        "measures": {"$push": "$$ROOT"}
                    }
            },
            {
                "$project": {
                    "measures.competition_id": 0,
                    "measures._id": 0
                }
            },
            {"$sort": {"_id": 1}}

        ])

        final_stats = []
        for r in results:
            stats = {'user_id': r['_id'], 'results': []}
            measures = r['measures']
            for m in measures:
                start_date = m['start_date']
                end_date = m['end_date']
                center_date = start_date + (end_date - start_date) / 2

                year = str(center_date.year)
                month = str(center_date.month)
                day = str(center_date.day)
                hour = str(center_date.hour)
                minute = str(center_date.minute)
                second = str(center_date.minute)

                # TODO : Determine which field, which value
                row = {"label": {"Year": year, "Month": month, "Day": day, "Hour": hour, "Minute": minute,
                                 "Second": second},
                       "data": m['measures'][str(field)][str(measure)]}

                stats['results'].append(row)
            final_stats.append(stats)
        """
        print('repo',final_stats)
        final_stats = [

                {"user_id":1,"results":[{'data': 0.020, 'label': {'Hour': '13', 'Month': '10', 'Second': '25', 'Year': '2017', 'Day': '13', 'Minute': '55'}}]}
                ]
        #print('final_stats' , len(final_stats))"""
        return final_stats

    def get_users_ranking_by_field_by_measure(self, competition_id, field, measure):

        db = self.client['evaluation_measures']
        collection = db['measures']

        results = collection.aggregate([
            {"$match": {"$and":
                [
                    {"competition_id": int(competition_id)}

                ]}
            },

            {"$sort": {"user_id": 1, "end_date": -1}},
            {
                "$group":
                    {
                        "_id": "$user_id",
                        "end_date": {"$first": "$end_date"},
                        "measures": {"$first": "$measures"}
                    }
            },
            {
                "$project": {
                    "measures.competition_id": 0,
                    "measures._id": 0
                }
            }

        ])

        data = []
        for r in results:
            #print (r)
            item = {}
            item['id'] = r['_id']
            item['measures'] = r['measures'][field][measure]
            data.append(item)
        # print(data)

        # data = [{'id' : 1, 'measures' : 0.3}, {'id' : 2, 'measures' : 0.5}]
        return data









