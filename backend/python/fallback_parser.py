#!/usr/bin/env python3
import sys, json, os
from typing import Optional
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
    
    # Preferir ler todas as planilhas quando nenhum sheet é explicitamente informado
    read_all = SHEET_NAME is None
    if ext == '.xls' and header != b'PK\x03\x04':
        # True legacy XLS file
        df_or = pd.read_excel(FILE_PATH, engine='xlrd', sheet_name=(None if read_all else SHEET_NAME))
    else:
        # XLSX file or ambiguous format - let pandas auto-detect
        df_or = pd.read_excel(FILE_PATH, sheet_name=(None if read_all else SHEET_NAME))
    
    # Normalizar para dict de dataframes
    if isinstance(df_or, dict):
        sheets = df_or
    else:
        # Apenas uma planilha retornada
        sheets = {SHEET_NAME or 'Sheet1': df_or}
    
except Exception as e:
    print(json.dumps({"error": f"Read error: {e}"}))
    sys.exit(3)

import sys

def build_rename_map(columns):
    rename_map = {}
    for col in columns:
        low = str(col).strip().lower()
        if 'temper' in low:
            rename_map[col] = 'temperature'
        elif 'umid' in low or 'humid' in low:
            rename_map[col] = 'humidity'
        elif ('data' in low or 'date' in low) and ('hora' in low or 'time' in low or 'tempo' in low):
            rename_map[col] = 'datetime'
        elif 'data' in low and ('hora' not in low and 'time' not in low and 'tempo' not in low):
            rename_map[col] = 'date'
        elif ('hora' in low) or ('time' in low) or ('tempo' in low):
            rename_map[col] = 'time'
    return rename_map

def parse_datetime_columns(dfx: pd.DataFrame) -> pd.Series:
    # Caso 1: coluna única 'datetime'
    if 'datetime' in dfx.columns:
        s = dfx['datetime']
        # Se for numérico (serial do Excel)
        if pd.api.types.is_numeric_dtype(s):
            ts = pd.to_datetime(s, unit='d', origin='1899-12-30', errors='coerce')
        else:
            ts = pd.to_datetime(s, dayfirst=True, infer_datetime_format=True, errors='coerce')
        return ts

    # Novo Caso 1.5: somente 'time' contendo data+hora inteira
    # Alguns arquivos (ex.: Elitech) rotulam a coluna como "Time" mas os valores trazem data e hora.
    if 'time' in dfx.columns and 'date' not in dfx.columns:
        st = dfx['time']
        if pd.api.types.is_numeric_dtype(st):
            # Numeric pode ser serial Excel (dias desde 1899-12-30) ou fração de dia.
            # Tentar primeiro como serial de data completa; se a maioria virar NaT, cair para to_timedelta.
            ts_try = pd.to_datetime(st, unit='d', origin='1899-12-30', errors='coerce')
            non_null_ratio = (ts_try.notna().sum() / max(len(ts_try), 1))
            if non_null_ratio > 0.7:
                return ts_try
            # Caso contrário tratar como tempo do dia (fração) e não temos data -> manter NaT
            # (evita gerar timestamps errados sem a parte da data)
            return pd.Series([pd.NaT] * len(dfx))
        else:
            st_str = st.astype(str).str.strip()
            # Tentar parse direto como datetime (dia primeiro para PT-BR)
            ts = pd.to_datetime(st_str, dayfirst=True, infer_datetime_format=True, errors='coerce')
            # Se ainda assim der tudo NaT e parecer só horário HH:MM[:SS], manter NaT (sem data)
            looks_like_time_only = st_str.str.fullmatch(r"\d{1,2}:\d{2}(:\d{2})?").fillna(False)
            if ts.notna().any() and (~looks_like_time_only).any():
                return ts
            return pd.Series([pd.NaT] * len(dfx))

    # Caso 2: 'date' (+ opcional 'time')
    date_ts = None
    if 'date' in dfx.columns:
        sd = dfx['date']
        if pd.api.types.is_numeric_dtype(sd):
            date_ts = pd.to_datetime(sd, unit='d', origin='1899-12-30', errors='coerce')
        else:
            date_ts = pd.to_datetime(sd.astype(str).str.strip(), dayfirst=True, infer_datetime_format=True, errors='coerce')

    if date_ts is not None and 'time' in dfx.columns:
        st = dfx['time']
        if pd.api.types.is_numeric_dtype(st):
            # Tempo em fração de dia (Excel)
            time_delta = pd.to_timedelta(st, unit='d')
        else:
            # Normalizar vírgula para ponto e remover espaços
            st_str = st.astype(str).str.replace(',', '.').str.strip()
            # Tentar HH:MM[:SS]
            time_delta = pd.to_timedelta(st_str, errors='coerce')
            # Se falhar, tentar parsear como datetime e extrair componente de tempo
            bad = time_delta.isna()
            if bad.any():
                aux = pd.to_datetime('1970-01-01 ' + st_str, errors='coerce')
                td2 = pd.to_timedelta(aux.dt.hour, unit='h') + pd.to_timedelta(aux.dt.minute, unit='m') + pd.to_timedelta(aux.dt.second, unit='s')
                time_delta = time_delta.mask(bad, td2)
        return date_ts + time_delta.fillna(pd.Timedelta(0))

    # Caso 3: somente 'date'
    if date_ts is not None:
        return date_ts

    # Fallback vazio
    return pd.Series([pd.NaT] * len(dfx))

def unify_same_named_columns(dfx: pd.DataFrame, name: str):
    if name not in dfx.columns:
        return None
    try:
        sub = dfx.loc[:, dfx.columns == name]
    except Exception:
        # fallback simples
        return dfx[name]
    # Se já for Series
    if isinstance(sub, pd.Series):
        return sub
    # Se apenas uma coluna com esse nome
    if getattr(sub, 'shape', (0, 0))[1] <= 1:
        return sub.iloc[:, 0] if getattr(sub, 'shape', (0, 0))[1] == 1 else None
    # Várias colunas com o mesmo nome: pegar o primeiro não-nulo por linha
    unified = sub.bfill(axis=1).iloc[:, 0]
    return unified

def try_header_autodetect(xls_path: str, sheet_name: str, engine_hint: Optional[str]) -> Optional[pd.DataFrame]:
    try:
        dfh = pd.read_excel(xls_path, sheet_name=sheet_name, header=None, engine=engine_hint)
    except Exception:
        try:
            dfh = pd.read_excel(xls_path, sheet_name=sheet_name, header=None)
        except Exception:
            return None
    # Procurar linha de cabeçalho provável (primeiras 50 linhas)
    tokens_any = ['temper', 'umid', 'humid', 'data', 'date', 'hora', 'time', 'tempo']
    best_idx = None
    best_score = -1
    max_rows = min(len(dfh), 50)
    for i in range(max_rows):
        row_vals = [str(v).strip().lower() for v in list(dfh.iloc[i].values)]
        score = sum(any(tok in val for tok in tokens_any) for val in row_vals)
        if score > best_score:
            best_score = score
            best_idx = i
    if best_idx is None or best_score <= 0:
        return None
    # Definir cabeçalho e dados
    new_cols = [str(v).strip() for v in list(dfh.iloc[best_idx].values)]
    dfd = dfh.iloc[best_idx + 1:].reset_index(drop=True)
    dfd.columns = new_cols
    return dfd

# Selecionar melhor planilha
chosen_df = None
chosen_name = None
chosen_ts = None
chosen_temp_count = -1
chosen_ts_count = -1
engine_hint = 'xlrd' if (ext == '.xls' and header != b'PK\x03\x04') else None

for name, df0 in sheets.items():
    print(f"DEBUG: Inspecting sheet: {name}", file=sys.stderr)
    print(f"DEBUG: Columns found: {list(df0.columns)}", file=sys.stderr)
    if len(df0) > 0:
        print(f"DEBUG: First row: {df0.iloc[0].to_dict()}", file=sys.stderr)
    else:
        print(f"DEBUG: First row: empty", file=sys.stderr)

    # 1) Renomear com heurística
    rename_map = build_rename_map(df0.columns)
    print(f"DEBUG: Rename map: {rename_map}", file=sys.stderr)
    df1 = df0.rename(columns=rename_map) if rename_map else df0.copy()
    print(f"DEBUG: Columns after rename: {list(df1.columns)}", file=sys.stderr)

    # 2) Tentar parse
    ts = parse_datetime_columns(df1)
    non_null = int(ts.notna().sum())
    print(f"DEBUG: Parsed datetime non-null count: {non_null} / {len(ts)}", file=sys.stderr)

    # 2.1) Estimar contagem de temperatura/umidade válidas
    df_est = df1.copy()
    for numcol in ['temperature', 'humidity']:
        if numcol in df_est.columns:
            col = unify_same_named_columns(df_est, numcol)
            if col is None:
                col = df_est[numcol]
            if isinstance(col, pd.DataFrame):
                col = col.iloc[:, 0]
            if not pd.api.types.is_numeric_dtype(col):
                col = col.astype(str).str.replace(',', '.').str.extract(r'([-+]?[0-9]*\.?[0-9]+)')[0]
            df_est[numcol] = pd.to_numeric(col, errors='coerce')
    col_t = unify_same_named_columns(df_est, 'temperature') if 'temperature' in df_est.columns else None
    col_h = unify_same_named_columns(df_est, 'humidity') if 'humidity' in df_est.columns else None
    temp_count = int(col_t.notna().sum()) if col_t is not None else 0
    hum_count = int(col_h.notna().sum()) if col_h is not None else 0
    print(f"DEBUG: Numeric counts -> temperature: {temp_count}, humidity: {hum_count}", file=sys.stderr)

    # 3) Se nenhum datetime encontrado, tentar detecção de cabeçalho automática
    if non_null == 0:
        df_auto = try_header_autodetect(FILE_PATH, name, engine_hint)
        if df_auto is not None:
            print(f"DEBUG: Header autodetect applied on sheet {name}", file=sys.stderr)
            rename_map2 = build_rename_map(df_auto.columns)
            df2 = df_auto.rename(columns=rename_map2) if rename_map2 else df_auto
            print(f"DEBUG: Columns after autodetect+rename: {list(df2.columns)}", file=sys.stderr)
            ts2 = parse_datetime_columns(df2)
            non_null2 = int(ts2.notna().sum())
            print(f"DEBUG: Parsed datetime after autodetect: {non_null2} / {len(ts2)}", file=sys.stderr)
            # Recalcular contagens numéricas após autodetect
            df_est2 = df2.copy()
            for numcol in ['temperature', 'humidity']:
                if numcol in df_est2.columns:
                    col2 = unify_same_named_columns(df_est2, numcol)
                    if col2 is None:
                        col2 = df_est2[numcol]
                    if isinstance(col2, pd.DataFrame):
                        col2 = col2.iloc[:, 0]
                    if not pd.api.types.is_numeric_dtype(col2):
                        col2 = col2.astype(str).str.replace(',', '.').str.extract(r'([-+]?[0-9]*\.?[0-9]+)')[0]
                    df_est2[numcol] = pd.to_numeric(col2, errors='coerce')
            col_t2 = unify_same_named_columns(df_est2, 'temperature') if 'temperature' in df_est2.columns else None
            col_h2 = unify_same_named_columns(df_est2, 'humidity') if 'humidity' in df_est2.columns else None
            temp_count2 = int(col_t2.notna().sum()) if col_t2 is not None else 0
            hum_count2 = int(col_h2.notna().sum()) if col_h2 is not None else 0
            if (temp_count2 > temp_count) or (temp_count2 == temp_count and non_null2 > non_null):
                df1, ts, non_null = df2, ts2, non_null2
                temp_count, hum_count = temp_count2, hum_count2

    # 4) Escolher a melhor: priorizar planilha com mais temperaturas válidas; em empate, maior ts_count
    if (
        chosen_df is None
        or temp_count > chosen_temp_count
        or (temp_count == chosen_temp_count and non_null > chosen_ts_count)
    ):
        chosen_df = df1
        chosen_ts = ts
        chosen_name = name
        chosen_temp_count = temp_count
        chosen_ts_count = non_null

if chosen_df is None:
    print(json.dumps({"error": "No sheets found"}))
    sys.exit(4)

print(f"DEBUG: Chosen sheet: {chosen_name} (temp_count={chosen_temp_count}, ts_count={chosen_ts_count})", file=sys.stderr)

# Clean numeric columns (temperatura/umidade)
for numcol in ['temperature', 'humidity']:
    if numcol in chosen_df.columns:
        col = unify_same_named_columns(chosen_df, numcol)
        if col is None:
            col = chosen_df[numcol]
        if isinstance(col, pd.DataFrame):
            col = col.iloc[:, 0]
        if not pd.api.types.is_numeric_dtype(col):
            col = col.astype(str).str.replace(',', '.').str.extract(r'([-+]?[0-9]*\.?[0-9]+)')[0]
        chosen_df[numcol] = pd.to_numeric(col, errors='coerce')

# Emit rows
for idx, row in chosen_df.iterrows():
    ts_parsed = chosen_ts.iloc[idx] if idx < len(chosen_ts) else pd.NaT
    
    # Handle temperature - may be Series if multiple columns with same name
    temp_val = row.get('temperature')
    if isinstance(temp_val, pd.Series):
        # Take first non-null value from multiple temperature columns
        temp_val = temp_val.dropna().iloc[0] if not temp_val.dropna().empty else None
    # Convert numpy types to Python types for JSON serialization
    if pd.notna(temp_val):
        temp_val = float(temp_val)
    else:
        temp_val = None
    
    # Handle humidity - may be Series if multiple columns with same name
    humidity_val = row.get('humidity') if 'humidity' in row.index else None
    if isinstance(humidity_val, pd.Series):
        humidity_val = humidity_val.dropna().iloc[0] if not humidity_val.dropna().empty else None
    # Convert numpy types to Python types for JSON serialization
    if pd.notna(humidity_val):
        humidity_val = float(humidity_val)
    else:
        humidity_val = None
    
    out = {
        'timestamp': ts_parsed.isoformat() if pd.notnull(ts_parsed) else None,
        'temperature': temp_val,
        'humidity': humidity_val
    }
    print(json.dumps(out, ensure_ascii=False))

sys.exit(0)
