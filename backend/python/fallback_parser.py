#!/usr/bin/env python3
import sys, json, os
import pandas as pd

# Usage: fallback_parser.py <filePath> [sheetName]
# Emits one JSON line per normalized row: {"timestamp": ISO8601, "temperature": float, "humidity": float|null}

FILE_PATH = sys.argv[1] if len(sys.argv) > 1 else None
SHEET_NAME = sys.argv[2] if len(sys.argv) > 2 else None
if not FILE_PATH or not os.path.exists(FILE_PATH):
    print(json.dumps({"error": "File not found"}))
    sys.exit(2)

try:
    # Attempt legacy XLS read; pandas will choose engine. Force xlrd for .xls if available.
    ext = os.path.splitext(FILE_PATH)[1].lower()
    # Try to detect if file is actually XLSX (ZIP format) despite .xls extension
    with open(FILE_PATH, 'rb') as f:
        header = f.read(4)
    
    if ext == '.xls' and header != b'PK\x03\x04':
        # True legacy XLS file
        df = pd.read_excel(FILE_PATH, engine='xlrd', sheet_name=SHEET_NAME)
    else:
        # XLSX file or ambiguous format - let pandas auto-detect
        df = pd.read_excel(FILE_PATH, sheet_name=SHEET_NAME)
except Exception as e:
    print(json.dumps({"error": f"Read error: {e}"}))
    sys.exit(3)

# Heuristic header normalization
rename_map = {}
for col in df.columns:
    low = str(col).strip().lower()
    if 'temper' in low:
        rename_map[col] = 'temperature'
    elif 'umid' in low or 'humid' in low:
        rename_map[col] = 'humidity'
    elif ('data' in low or 'date' in low) and ('hora' in low or 'time' in low or 'tempo' in low):
        rename_map[col] = 'datetime'
    elif 'tempo' in low and ('data' not in low):
        # 'Tempo' column usually contains datetime
        rename_map[col] = 'datetime'
    elif low in ('data', 'date'):
        rename_map[col] = 'date'
    elif low in ('hora', 'time', 'tempo'):
        rename_map[col] = 'time'

if rename_map:
    df = df.rename(columns=rename_map)

# Combine separate date/time columns if present
if 'datetime' not in df.columns and 'date' in df.columns and 'time' in df.columns:
    df['datetime'] = df['date'].astype(str).str.strip() + ' ' + df['time'].astype(str).str.strip()

# Choose timestamp source
if 'datetime' in df.columns:
    ts_series = df['datetime']
elif 'date' in df.columns:
    ts_series = df['date']
else:
    ts_series = pd.Series([None]*len(df))

# Clean numeric columns
for numcol in ['temperature', 'humidity']:
    if numcol in df.columns:
        df[numcol] = (df[numcol]
                      .astype(str)
                      .str.replace(',', '.')
                      .str.extract(r'([-+]?[0-9]*\.?[0-9]+)')[0]
                      .astype(float))

# Emit rows
for idx, row in df.iterrows():
    ts_raw = row.get('datetime') or row.get('date') or ''
    # Basic timestamp parse
    ts_parsed = None
    if ts_raw:
        try:
            ts_parsed = pd.to_datetime(str(ts_raw), dayfirst=True, errors='coerce')
        except Exception:
            ts_parsed = None
    out = {
        'timestamp': ts_parsed.isoformat() if pd.notnull(ts_parsed) else None,
        'temperature': row.get('temperature'),
        'humidity': row.get('humidity') if 'humidity' in row else None
    }
    print(json.dumps(out, ensure_ascii=False))

sys.exit(0)
