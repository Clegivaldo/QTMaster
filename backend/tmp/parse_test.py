import json, pandas as pd

with open('/tmp/failed_rows.json','r',encoding='utf-8') as f:
    j=json.load(f)

samples=[s['raw']['Tempo'] for s in j['samples'][:80]]
print('SAMPLES_COUNT=',len(samples))
for s in samples:
    s2 = (s or '').strip()
    parsed_fmt = pd.to_datetime(s2, format='%Y-%m-%d %H:%M:%S', errors='coerce')
    parsed_infer_false = pd.to_datetime(s2, dayfirst=False, infer_datetime_format=True, errors='coerce')
    parsed_infer_true = pd.to_datetime(s2, dayfirst=True, infer_datetime_format=True, errors='coerce')
    def fmt(p):
        try:
            if pd.isna(p):
                return None
            return p.isoformat()
        except Exception:
            return str(p)
    print(repr(s), '| fmt:', fmt(parsed_fmt), '| infer-false:', fmt(parsed_infer_false), '| infer-true:', fmt(parsed_infer_true))
