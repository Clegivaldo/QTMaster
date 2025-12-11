import pandas as pd
vals=['2025-11-13 00:00:28','2025-11-12 23:59:28','2025-11-11 16:34:28']
for dayfirst in (True, False):
    print('dayfirst',dayfirst)
    print(pd.to_datetime(vals, dayfirst=dayfirst, errors='coerce'))
