import pymongo
import sys
from pymongo import MongoClient
from datetime import datetime, timedelta
import logging
logging.basicConfig(level='DEBUG')


class MongoRepository:
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

    def get_results_by_user(self, competition_id, field, measure, user_id):

        db = self.client['evaluation_measures']
        collection = db['measures']
        """
        res = collection.find()
        for r in res : 
            print('INIT',r)"""

        results = collection.aggregate([
            {"$match": {"$and":
                [
                    {"competition_id": int(competition_id)},
                    {'user_id': {"$in": [0, int(user_id)]}}

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
                second = str(center_date.second)

                row = {"label": {"Year": year, "Month": month, "Day": day, "Hour": hour, "Minute": minute,
                                 "Second": second},
                       "data": m['measures'][str(field)][str(measure)]}

                stats['results'].append(row)
            stats['results'] = sorted(stats['results'],
                                      key=lambda i: datetime(**{k.lower(): int(v) for k, v in i['label'].items()}))
            final_stats.append(stats)

        if len(final_stats) > 1:
            # get baseline results (x-axis)
            base_line_results = [r for r in final_stats if r['user_id'] == 0][0]
            user_results = [r for r in final_stats if r['user_id'] != 0][0]

            base_line_dates = [r['label'] for r in base_line_results['results']]
            user_line_dates = [r['label'] for r in user_results['results']]
            # Filling missing dates with zeros
            for i in range(len(base_line_dates)):
                if base_line_dates[i] not in user_line_dates:
                    # add this missing date at this index
                    user_results['results'].insert(i, {'label': base_line_dates[i], 'data': str(0)})
            final_stats = [base_line_results, user_results]

        for r in final_stats:
            r['user_id'] = 'Baseline' if r['user_id'] == 0 else 'You'

        return final_stats

    def get_last_predictions_by_user(self, competition_id, now, field, measure, user_id, evaluation_time_interval):
        db = self.client['evaluation_measures']
        collection = db['measures']

        date = now - timedelta(seconds=35)
        results = collection.aggregate([
            {"$match": {"$and":
                [
                    {"competition_id": int(competition_id)},
                    {"start_date": {"$gte": date, "$lt": now}},
                    {'user_id': {"$in": [0, int(user_id)]}}

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
            # stats['results'] = sorted(stats['results'], key=lambda i: str(i['label']))
            stats['results'] = sorted(stats['results'],
                                      key=lambda i: datetime(**{k.lower(): int(v) for k, v in i['label'].items()}))
            final_stats.append(stats)

        if len(final_stats) > 1:
            # get baseline results (x-axis)
            base_line_results = [r for r in final_stats if r['user_id'] == 0][0]
            user_results = [r for r in final_stats if r['user_id'] != 0][0]

            base_line_dates = [r['label'] for r in base_line_results['results']]
            user_line_dates = [r['label'] for r in user_results['results']]
            # Filling missing dates with zeros
            for i in range(len(base_line_dates)):
                if base_line_dates[i] not in user_line_dates:
                    # add this missing date at this index
                    user_results['results'].insert(i, {'label': base_line_dates[i], 'data': str(0)})
            final_stats = [base_line_results, user_results]

        for r in final_stats:
            r['user_id'] = 'Baseline' if r['user_id'] == 0 else 'You'
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
            # print (r)
            item = {}
            item['id'] = r['_id']
            item['measures'] = r['measures'][field][measure]
            data.append(item)

        return data

    def insert_standard_measures(self, standard_measures):
        db = self.client['evaluation_measures']
        collection = db['standard_measures']
        measures = collection.find({})
        existing_measures = []
        for m in measures:
            existing_measures.append(m)

        for measure in standard_measures:
            insert = True
            for m in existing_measures:
                if m['name'] == measure['name']:
                    insert = False
            if insert:
                collection.insert_one(measure)