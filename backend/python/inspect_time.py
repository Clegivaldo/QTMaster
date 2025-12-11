import pandas as pd
fp=r"C:\Users\Clegivaldo\Desktop\QT-Master\uploads\EF7217100050.xls"
try:
    xl = pd.read_excel(fp, sheet_name='Lista', header=0)
except Exception as e:
    print('READ ERROR', e)
    raise
print('Columns:', list(xl.columns))
col=None
for c in xl.columns:
    if 'tempo' in str(c).lower() or 'time' in str(c).lower() or 'data' in str(c).lower():
        col=c
        break
print('Detected time column:', col)
if col:
    s=xl[col].head(50)
    for i,v in enumerate(s):
        print(i, type(v), repr(v))
else:
    print('No time-like column found')
