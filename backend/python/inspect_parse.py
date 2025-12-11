import pandas as pd
fp=r"C:\Users\Clegivaldo\Desktop\QT-Master\uploads\EF7217100050.xls"
xl = pd.read_excel(fp, sheet_name='Lista', header=0)
col='Tempo'
ser = xl[col].astype(str).str.strip()
# detect dayfirst similar to fallback
sample = ser.dropna().head(500)
try:
    t_true = pd.to_datetime(sample, dayfirst=True, infer_datetime_format=True, errors='coerce')
    t_false = pd.to_datetime(sample, dayfirst=False, infer_datetime_format=True, errors='coerce')
    def score(ts):
        if ts.empty:
            return 0
        valid = ts.notna()
        yrs = ts.dt.year.where(valid)
        plausible = ((yrs >= 2000) & (yrs <= 2100)).sum()
        return int(plausible)
    dayfirst = True if score(t_true) >= score(t_false) else False
except Exception as e:
    dayfirst=True
print('dayfirst chosen:', dayfirst)
parsed = pd.to_datetime(ser, dayfirst=dayfirst, infer_datetime_format=True, errors='coerce')
print('parsed non-null:', parsed.notna().sum(), 'total', len(parsed))
# Show first 20 NaT raw values
nats = parsed[parsed.isna()]
print('First 20 NaT raw samples:')
for i,v in enumerate(nats.head(20).index):
    print(i, v, repr(ser.iloc[v]))
