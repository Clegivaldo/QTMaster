import pandas as pd
fp=r"C:\Users\Clegivaldo\Desktop\QT-Master\uploads\EF7217100050.xls"
xl = pd.read_excel(fp, sheet_name='Lista', header=0)
col='Tempo'
print('Types for first 20:')
for i,v in enumerate(xl[col].head(20)):
    print(i, type(v), repr(v))
print('\nTypes around 1878-1894:')
for i in range(1878, 1896):
    v = xl[col].iloc[i]
    print(i, type(v), repr(v))
