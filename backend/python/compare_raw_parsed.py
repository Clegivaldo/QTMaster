import pandas as pd
fp=r"C:\Users\Clegivaldo\Desktop\QT-Master\uploads\EF7217100050.xls"
xl = pd.read_excel(fp, sheet_name='Lista', header=0)
ser_raw = xl['Tempo']
ser = ser_raw.astype(str).str.strip()
parsed = pd.to_datetime(ser, dayfirst=True, infer_datetime_format=True, errors='coerce')
for i in range(1868, 1896):
    print(i, repr(ser.iloc[i]), '->', parsed.iloc[i])
print('done')
