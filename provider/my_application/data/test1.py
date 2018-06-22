import csv

initial_batch_size = 20
initial_batch = []

class CsvStream:

    def main(self):
        with open("Demand_Data2017.csv", 'r') as csvfile:
            datareader = csv.reader(csvfile, delimiter=',', quotechar='|')
            data = list(datareader)
            # Process initial batch
            for row in range(1, initial_batch_size + 1):
                # If the row is empty
                if row == 5:
                    data[row] = []
                if not self.is_not_empty(data[row]):
                    print(self.is_not_empty(data[row]))
                else:
                    print(self.is_not_empty(data[row]))

    def is_not_empty(self, row):
        return all(item == "" for item in row)


stream = CsvStream()
stream.main()