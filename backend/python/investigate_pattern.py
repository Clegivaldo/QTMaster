import pandas as pd
fp=r"C:\Users\Clegivaldo\Desktop\QT-Master\uploads\EF7217100050.xls"
xl = pd.read_excel(fp, sheet_name='Lista', header=0)
ser = xl['Tempo'].astype(str).str.strip()
parsed = pd.to_datetime(ser, dayfirst=True, infer_datetime_format=True, errors='coerce')
valid_idx = parsed.notna()
print('total', len(parsed), 'valid', valid_idx.sum())
# find contiguous runs of valid/invalid
runs=[]
cur_val=valid_idx.iloc[0]
start=0
for i,val in enumerate(valid_idx):
    if val!=cur_val:
        runs.append((start,i-1,cur_val))
        start=i
        cur_val=val
runs.append((start,len(valid_idx)-1,cur_val))
print('runs count', len(runs))
for r in runs[:10]:
    print(r)
# print run where change occurs around 1800-1900
for r in runs:
    if r[0]<=1900<=r[1] or r[0]>=1800 and r[1]<=2000:
        print('around run',r)
        break
# show parsed values at boundaries
for i in range(1878, 1896):
    print(i, parsed.iloc[i])
