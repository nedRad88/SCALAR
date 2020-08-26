import lzma

labels_dict = {}
with lzma.open('yagoLabels.tsv.bz2', 'r') as labels:
    i = 0
    for line1 in labels:
        print(line1)
        i += 1
        if i > 10:
            break

