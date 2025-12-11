import sys
import json
import pandas as pd

path = sys.argv[1]
max_rows = 200

try:
    # Read the 'Lista' sheet if present, otherwise try first sheet
    try:
        df = pd.read_excel(path, sheet_name='Lista', dtype=str)
    except Exception:
        sheets = pd.ExcelFile(path).sheet_names
        df = pd.read_excel(path, sheet_name=sheets[0], dtype=str)

    # normalize column names (columns used as-is)
    cols = {c: c for c in df.columns}
except Exception as e:
    # fallback simpler read
    df = pd.read_excel(path, dtype=str)
    cols = {c: c for c in df.columns}

# Ensure columns have original names sanitized
# Find likely time/temp/humidity columns
time_col = None
temp_col = None
hum_col = None
for c in df.columns:
    cl = c.lower()
    if time_col is None and ('tempo' in cl or 'time' in cl):
        time_col = c
    if temp_col is None and ('temperatur' in cl or 'temperatura' in cl or cl == 'temp'):
        temp_col = c
    if hum_col is None and ('umid' in cl or 'humidity' in cl or cl == 'hum'):
        hum_col = c

# fallback heuristics
if time_col is None:
    for c in df.columns:
        sample = df[c].dropna().astype(str).head(20).tolist()
        if any(':' in s or '/' in s or '-' in s for s in sample):
            time_col = c
            break

# parse time with dayfirst preference
if time_col is not None:
    try:
        parsed = pd.to_datetime(df[time_col].astype(str).str.replace(',', '.'), dayfirst=True, errors='coerce')
    except Exception:
        parsed = pd.to_datetime(df[time_col].astype(str), dayfirst=True, errors='coerce')
else:
    parsed = pd.Series([pd.NaT] * len(df))

# parse numeric temperature/humidity
def parse_num(series):
    if series is None:
        return pd.Series([None] * len(df))
    s = series.astype(str).str.replace('.', '').str.replace(',', '.').replace('nan', None)
    try:
        return pd.to_numeric(s, errors='coerce')
    except Exception:
        return pd.Series([None] * len(df))

temp_parsed = parse_num(df[temp_col]) if temp_col is not None else pd.Series([None] * len(df))
hum_parsed = parse_num(df[hum_col]) if hum_col is not None else pd.Series([None] * len(df))

# choose rows that have temperature or humidity but no parsed time
mask = (parsed.isna()) & (temp_parsed.notna() | hum_parsed.notna())
failed_df = df[mask]

# prepare output samples (limit to max_rows)
out = []
for idx, row in failed_df.head(max_rows).iterrows():
    item = {
        'index': int(idx),
        'raw': {c: (None if pd.isna(row[c]) else str(row[c])) for c in df.columns},
        'parsed_time': None,
        'temperature': None if temp_col is None else (None if pd.isna(temp_parsed.loc[idx]) else float(temp_parsed.loc[idx])),
        'humidity': None if hum_col is None else (None if pd.isna(hum_parsed.loc[idx]) else float(hum_parsed.loc[idx]))
    }
    out.append(item)

print(json.dumps({'file': path, 'time_col': time_col, 'temp_col': temp_col, 'hum_col': hum_col, 'sample_count': len(out), 'samples': out}, ensure_ascii=False, indent=2))
