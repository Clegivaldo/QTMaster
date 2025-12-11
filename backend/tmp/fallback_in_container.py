#!/usr/bin/env python3
import sys, json, os
from typing import Optional
import pandas as pd
import re
ISO_TS_RE = re.compile(r'^\s*\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*$')
CLEAN_INV_RX = re.compile(r'[\x00-\x1f\x7f\u00A0\u200e\u200f\u202a-\u202e\ufeff]')

def normalize_str(s: str) -> str:
    try:
        if s is None:
            return ''
        # strip common invisible/control characters
        out = CLEAN_INV_RX.sub(' ', str(s))
        # normalize common Unicode minus/fullwidth punctuation to ASCII
        out = out.replace('\u2212', '-')
        out = out.replace('\uFF0E', '.')
        out = out.replace('\uFF1A', ':')
        out = re.sub(r'\s+', ' ', out).strip()
        return out
    except Exception:
        try:
            return str(s).strip()
        except Exception:
            return ''

# Usage: fallback_parser_improved.py <filePath> [sheetName]
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
    # Helper: auto-detect dayfirst for ambiguous date strings
    def detect_dayfirst(series: pd.Series) -> bool:
        try:
            s = series.dropna().astype(str).str.strip()
            if s.empty:
                return True
            sample = s.head(500)
            t_true = pd.to_datetime(sample, dayfirst=True, infer_datetime_format=True, errors='coerce')
            t_false = pd.to_datetime(sample, dayfirst=False, infer_datetime_format=True, errors='coerce')
            def score(ts):
                if ts.empty:
                    return 0
                valid = ts.notna()
                # Prefer parses that yield plausible years (2000-2100)
                yrs = ts.dt.year.where(valid)
                plausible = ((yrs >= 2000) & (yrs <= 2100)).sum()
                return int(plausible)
            return True if score(t_true) >= score(t_false) else False
        except Exception:
            return True

    if 'datetime' in dfx.columns:
        s = dfx['datetime']
        # Se for numérico (serial do Excel)
        if pd.api.types.is_numeric_dtype(s):
            ts = pd.to_datetime(s, unit='d', origin='1899-12-30', errors='coerce')
        else:
            df_sample = s.astype(str).str.strip()
            dayfirst = detect_dayfirst(df_sample)
            ts = pd.to_datetime(df_sample, dayfirst=dayfirst, infer_datetime_format=True, errors='coerce')
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
            # Tentar parse direto como datetime com detecção de dayfirst
            dayfirst = detect_dayfirst(st_str)
            ts = pd.to_datetime(st_str, dayfirst=dayfirst, infer_datetime_format=True, errors='coerce')
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
            date_str = sd.astype(str).str.strip()
            dayfirst = detect_dayfirst(date_str)
            date_ts = pd.to_datetime(date_str, dayfirst=dayfirst, infer_datetime_format=True, errors='coerce')

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
    # Procurar linha de cabeçalho provável (procurar um pouco mais para arquivos legados)
    tokens_any = ['temper', 'umid', 'humid', 'data', 'date', 'hora', 'time', 'tempo']
    best_idx = None
    best_score = -1
    # aumentar a janela de busca para acomodar cabeçalhos deslocados
    max_rows = min(len(dfh), 200)
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

def find_potential_datetime_cols(df0: pd.DataFrame):
    """Return list of columns that look like date/time columns based on value patterns."""
    candidates = []
    date_regexes = [
        r"\d{1,2}/\d{1,2}/\d{2,4}",
        r"\d{4}-\d{2}-\d{2}",
        r"\d{1,2}-\d{1,2}-\d{2,4}",
        r"\d{1,2}:\d{2}(:\d{2})?",
    ]
    # examinar mais linhas para detectar padrões em arquivos grandes
    max_rows = min(len(df0), 2000)
    for col in df0.columns:
        try:
            s = df0[col].astype(str).str.strip().dropna()
            if s.empty:
                continue
            sample = s.head(max_rows)
            matches = 0
            for v in sample:
                for rx in date_regexes:
                    if pd.notna(v) and isinstance(v, str) and re.search(rx, v):
                        matches += 1
                        break
            # aceitar colunas com sinal fraco de datas (20% das amostras)
            if (matches / max(1, len(sample))) > 0.2:
                candidates.append(col)
        except Exception:
            continue
    return candidates

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
    # Fast-path: if a column contains a significant fraction of strict ISO-like
    # timestamps (YYYY-MM-DD HH:MM:SS), prefer parsing them with the exact format
    # to avoid mis-detection by broader heuristics. This is intentionally
    # conservative: it only takes effect when a column has >=30% ISO matches.
    def try_strict_iso_on_df(df, current_ts):
        try:
            best = None
            best_count = int(current_ts.notna().sum()) if current_ts is not None else 0
            for col in df.columns:
                try:
                    # Normalize invisible/control characters and whitespace
                    s = df[col].astype(object).fillna('').map(lambda x: normalize_str(x))
                except Exception:
                    continue
                non_empty = int((s != '').sum())
                if non_empty == 0:
                    continue
                matches = int(s.map(lambda x: bool(ISO_TS_RE.match(x))).sum())
                if (matches / non_empty) >= 0.3:
                    # try strict parse — try without microseconds first (covers most legacy exports),
                    # then with microseconds, then fall back to pandas inference.
                    parsed = pd.to_datetime(s.where(s != ''), format='%Y-%m-%d %H:%M:%S', errors='coerce')
                    parsed_count = int(parsed.notna().sum())
                    if parsed_count < max(1, int(0.5 * non_empty)):
                        parsed2 = pd.to_datetime(s.where(s != ''), format='%Y-%m-%d %H:%M:%S.%f', errors='coerce')
                        parsed = parsed.combine_first(parsed2)
                        parsed_count = int(parsed.notna().sum())
                    if parsed_count < max(1, int(0.5 * non_empty)):
                        parsed3 = pd.to_datetime(s.where(s != ''), dayfirst=False, infer_datetime_format=True, errors='coerce')
                        parsed = parsed.combine_first(parsed3)
                        parsed_count = int(parsed.notna().sum())
                    # Accept if we improved over best_count
                    if parsed_count > best_count:
                        best = parsed
                        best_count = parsed_count
            return best
        except Exception:
            return None

    iso_fast = try_strict_iso_on_df(df1, ts)
    if iso_fast is not None:
        ts = iso_fast
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
        else:
            # Try scanning columns for date-like values and coerce
            potential = find_potential_datetime_cols(df0)
            if potential:
                for pcol in potential:
                    try:
                        df_try = df0.copy()
                        df_try = df_try.rename(columns={pcol: 'datetime'})
                        rename_map_try = build_rename_map(df_try.columns)
                        if rename_map_try:
                            df_try = df_try.rename(columns=rename_map_try)
                        ts_try = parse_datetime_columns(df_try)
                        non_null_try = int(ts_try.notna().sum())
                        if non_null_try > non_null:
                            df1 = df_try
                            ts = ts_try
                            non_null = non_null_try
                            # recompute numeric counts
                            df_est_try = df1.copy()
                            for numcol in ['temperature', 'humidity']:
                                if numcol in df_est_try.columns:
                                    col2 = unify_same_named_columns(df_est_try, numcol)
                                    if col2 is None:
                                        col2 = df_est_try[numcol]
                                    if isinstance(col2, pd.DataFrame):
                                        col2 = col2.iloc[:, 0]
                                    if not pd.api.types.is_numeric_dtype(col2):
                                        col2 = col2.astype(str).str.replace(',', '.').str.extract(r'([-+]?[0-9]*\.?[0-9]+)')[0]
                                    df_est_try[numcol] = pd.to_numeric(col2, errors='coerce')
                            col_t = unify_same_named_columns(df_est_try, 'temperature') if 'temperature' in df_est_try.columns else None
                            col_h = unify_same_named_columns(df_est_try, 'humidity') if 'humidity' in df_est_try.columns else None
                            temp_count = int(col_t.notna().sum()) if col_t is not None else 0
                            hum_count = int(col_h.notna().sum()) if col_h is not None else 0
                            break
                    except Exception:
                        continue

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

# Sheet/column-level fast-paths: for many legacy files (eg. 'Lista') the time
# column already contains strict ISO-like datetimes (YYYY-MM-DD HH:MM:SS).
# Try a conservative column-level parse on the mapped 'time' column when the
# chosen sheet is 'Lista' or when the 'time' column has many ISO-like values.
try:
    if chosen_df is not None:
        # Prefer explicit sheet name match (low risk) or significant ISO fraction
        performed_fastpath = False
        if 'time' in chosen_df.columns:
            # Normalize invisible/control characters and whitespace
            scol = chosen_df['time'].astype(object).fillna('').map(lambda x: normalize_str(x))
            non_empty = int((scol != '').sum())
            iso_matches = int(scol.map(lambda x: bool(ISO_TS_RE.match(x))).sum()) if non_empty > 0 else 0
            iso_frac = (iso_matches / non_empty) if non_empty > 0 else 0.0
            # record counts before attempting fastpath
            pre_fast_ts_count = int(chosen_ts.notna().sum() if chosen_ts is not None else 0)

            # If sheet is 'Lista' we apply the fallback aggressively; otherwise require >=10% ISO-like
            if (str(chosen_name).lower() == 'lista') or (iso_frac >= 0.10):
                try:
                    # Try strict format parse — try without microseconds first (most common),
                    # then with microseconds, then pandas inference.
                    parsed_col = pd.to_datetime(scol.where(scol != ''), format='%Y-%m-%d %H:%M:%S', errors='coerce')
                    parsed_count = int(parsed_col.notna().sum())
                    if parsed_count < max(1, int(0.5 * non_empty)):
                        parsed_col2 = pd.to_datetime(scol.where(scol != ''), format='%Y-%m-%d %H:%M:%S.%f', errors='coerce')
                        parsed_col = parsed_col.combine_first(parsed_col2)
                        parsed_count = int(parsed_col.notna().sum())
                    if parsed_count < max(1, int(0.5 * non_empty)):
                        parsed_col3 = pd.to_datetime(scol.where(scol != ''), dayfirst=False, infer_datetime_format=True, errors='coerce')
                        parsed_col = parsed_col.combine_first(parsed_col3)
                        parsed_count = int(parsed_col.notna().sum())
                    print(f"DEBUG: Lista fastpath iso_frac={iso_frac:.3f} non_empty={non_empty} iso_matches={iso_matches} parsed_count={parsed_count}", file=sys.stderr)

                    if parsed_col.notna().sum() > int(chosen_ts.notna().sum() if chosen_ts is not None else 0):
                        # Use this parsed column as chosen_ts (convert to timezone-aware UTC)
                        parsed_col = parsed_col.dt.tz_localize('UTC', ambiguous='NaT', nonexistent='NaT') if parsed_col.dt.tz is None else parsed_col.dt.tz_convert('UTC')
                        chosen_ts = parsed_col
                        chosen_ts_count = int(chosen_ts.notna().sum())
                        performed_fastpath = True
                        # compute fixed rows
                        post_fast_ts_count = int(chosen_ts.notna().sum())
                        try:
                            fixed = max(0, post_fast_ts_count - pre_fast_ts_count)
                        except Exception:
                            fixed = 0
                        print(f"DEBUG: Fastpath fixed {fixed} rows (pre={pre_fast_ts_count} post={post_fast_ts_count})", file=sys.stderr)
                except Exception:
                    pass
        # If we didn't find a time column, but the sheet is 'Lista', try scanning columns
        if (not performed_fastpath) and str(chosen_name).lower() == 'lista':
            # Try each column quickly for ISO-like majority
            for col in chosen_df.columns:
                try:
                    scol = chosen_df[col].astype(str).fillna('').map(lambda x: re.sub(r'[\u00A0\u200e\u200f\u202a-\u202e\ufeff]', ' ', x)).str.strip()
                    non_empty = int((scol != '').sum())
                    if non_empty == 0:
                        continue
                    iso_matches = int(scol.map(lambda x: bool(ISO_TS_RE.match(x))).sum())
                    if (iso_matches / non_empty) >= 0.15:
                        parsed_col = pd.to_datetime(scol.where(scol != ''), dayfirst=False, infer_datetime_format=True, errors='coerce')
                        if parsed_col.notna().sum() > int(chosen_ts.notna().sum() if chosen_ts is not None else 0):
                            parsed_col = parsed_col.dt.tz_localize('UTC', ambiguous='NaT', nonexistent='NaT') if parsed_col.dt.tz is None else parsed_col.dt.tz_convert('UTC')
                            chosen_ts = parsed_col
                            chosen_ts_count = int(chosen_ts.notna().sum())
                            break
                except Exception:
                    continue
except Exception:
    pass

# Lista-scoped forced fallback (last resort): try strict '%Y-%m-%d %H:%M:%S' on the
# mapped 'time' column (or any column with many ISO-like values) and accept it
# only if it increases the parsed count. This is intentionally narrow and
# conservative because we've observed 'Tempo' in 'Lista' files to follow that
# pattern in the failing sample.
try:
    if str(chosen_name).lower() == 'lista' and chosen_df is not None:
        pre_count = int(chosen_ts.notna().sum() if chosen_ts is not None else 0)
        performed_forced = False
        # Prefer explicit 'time' column when present
        if 'time' in chosen_df.columns:
            scol = chosen_df['time'].astype(object).fillna('').map(lambda x: normalize_str(x))
            parsed = pd.to_datetime(scol.where(scol != ''), format='%Y-%m-%d %H:%M:%S', errors='coerce')
            parsed_count = int(parsed.notna().sum())
            # if we improved, accept
            if parsed_count > pre_count:
                parsed = parsed.dt.tz_localize('UTC', ambiguous='NaT', nonexistent='NaT') if parsed.dt.tz is None else parsed.dt.tz_convert('UTC')
                chosen_ts = parsed
                chosen_ts_count = int(chosen_ts.notna().sum())
                performed_forced = True
                post_count = chosen_ts_count
                print(f"DEBUG: Lista forced-strict parsed_count={parsed_count} pre={pre_count} post={post_count}", file=sys.stderr)

        # If no explicit 'time' column or not improved, scan other columns
        if not performed_forced:
            for col in chosen_df.columns:
                try:
                    scol = chosen_df[col].astype(str).fillna('').map(lambda x: normalize_str(x))
                    non_empty = int((scol != '').sum())
                    if non_empty == 0:
                        continue
                    iso_matches = int(scol.map(lambda x: bool(ISO_TS_RE.match(x))).sum())
                    # require at least a modest fraction of ISO-like values to try
                    if (iso_matches / non_empty) < 0.10:
                        continue
                    parsed = pd.to_datetime(scol.where(scol != ''), format='%Y-%m-%d %H:%M:%S', errors='coerce')
                    parsed_count = int(parsed.notna().sum())
                    if parsed_count > pre_count:
                        parsed = parsed.dt.tz_localize('UTC', ambiguous='NaT', nonexistent='NaT') if parsed.dt.tz is None else parsed.dt.tz_convert('UTC')
                        chosen_ts = parsed
                        chosen_ts_count = int(chosen_ts.notna().sum())
                        post_count = chosen_ts_count
                        print(f"DEBUG: Lista forced-strict column={col} parsed_count={parsed_count} pre={pre_count} post={post_count}", file=sys.stderr)
                        break
                except Exception:
                    continue
except Exception:
    pass

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
def ts_to_iso_z(ts_val):
    # Return None for NaT/NaN
    try:
        if pd.isna(ts_val):
            return None
    except Exception:
        pass
    try:
        ts = pd.Timestamp(ts_val)
        # If naive, treat as UTC (do not guess local timezone)
        if ts.tz is None:
            ts = ts.tz_localize('UTC')
        else:
            ts = ts.tz_convert('UTC')
        iso = ts.isoformat()
        # Normalize +00:00 to Z
        if iso.endswith('+00:00'):
            iso = iso[:-6] + 'Z'
        return iso
    except Exception:
        try:
            return str(ts_val)
        except Exception:
            return None
    # Keep the last full date parsed so we can combine it with time-only values
    last_valid_date = None

    # regex to detect time-only strings like HH:MM or HH:MM:SS
    time_only_rx = re.compile(r"^\s*\d{1,2}:\d{2}(:\d{2})?\s*$")

    for idx, row in chosen_df.iterrows():
        ts_parsed = chosen_ts.iloc[idx] if idx < len(chosen_ts) else pd.NaT

        # Helpers: find nearby date and try combining adjacent columns
        def get_nearby_date(i, window=5):
            for off in range(1, window+1):
                up = i - off
                if up >= 0 and up < len(chosen_ts) and pd.notna(chosen_ts.iloc[up]):
                    return pd.Timestamp(chosen_ts.iloc[up]).normalize()
                down = i + off
                if down >= 0 and down < len(chosen_ts) and pd.notna(chosen_ts.iloc[down]):
                    return pd.Timestamp(chosen_ts.iloc[down]).normalize()
            return None

        def try_combine_adjacent_columns(r, row_index):
            cols = list(chosen_df.columns)
            time_only_rx = re.compile(r"^\s*\d{1,2}:\d{2}(:\d{2})?\s*$")
            # Try concatenating adjacent columns (a b)
            for i in range(len(cols) - 1):
                a = r.get(cols[i])
                b = r.get(cols[i+1])
                if a is None or (isinstance(a, float) and pd.isna(a)):
                    continue
                if b is None or (isinstance(b, float) and pd.isna(b)):
                    continue
                try:
                    s = f"{str(a).strip()} {str(b).strip()}"
                    t1 = pd.to_datetime(s, dayfirst=True, infer_datetime_format=True, errors='coerce')
                    if pd.notna(t1):
                        return t1
                    t2 = pd.to_datetime(s, dayfirst=False, infer_datetime_format=True, errors='coerce')
                    if pd.notna(t2):
                        return t2
                except Exception:
                    pass
            # Try time-only column combined with nearby date
            for c in cols:
                v = r.get(c)
                if v is None:
                    continue
                try:
                    vs = str(v).strip()
                    if time_only_rx.match(vs):
                        nearby = get_nearby_date(row_index, window=10)
                        if nearby is not None:
                            combined = f"{nearby.date().isoformat()} {vs}"
                            t_try = pd.to_datetime(combined, dayfirst=True, errors='coerce')
                            if pd.notna(t_try):
                                return t_try
                            t_try2 = pd.to_datetime(combined, dayfirst=False, errors='coerce')
                            if pd.notna(t_try2):
                                return t_try2
                except Exception:
                    continue
            return pd.NaT

        # Handle temperature - may be Series if multiple columns with same name
        temp_val = row.get('temperature')
        if isinstance(temp_val, pd.Series):
            temp_val = temp_val.dropna().iloc[0] if not temp_val.dropna().empty else None
        if pd.notna(temp_val):
            temp_val = float(temp_val)
        else:
            temp_val = None

        # Handle humidity - may be Series if multiple columns with same name
        humidity_val = row.get('humidity') if 'humidity' in row.index else None
        if isinstance(humidity_val, pd.Series):
            humidity_val = humidity_val.dropna().iloc[0] if not humidity_val.dropna().empty else None
        if pd.notna(humidity_val):
            humidity_val = float(humidity_val)
        else:
            humidity_val = None

        # If the chosen_ts entry is NaT, try stricter fallbacks to capture
        # common patterns missed by the generic detection above.
        if pd.isna(ts_parsed):
            # 1) Try combining adjacent columns (some files split date/time)
            try:
                comb = try_combine_adjacent_columns(row, idx)
                if pd.notna(comb):
                    ts_parsed = comb
            except Exception:
                pass

        if pd.isna(ts_parsed):
            # 2) Try explicit formats (ISO-like YYYY-MM-DD HH:MM:SS / HH:MM)
            candidates = []
            for k in row.index:
                v = row.get(k)
                if v is None or (isinstance(v, float) and pd.isna(v)):
                    continue
                candidates.append(str(v).strip())

            for vs in candidates:
                if not vs:
                    continue
                # Normalize common invisible/nbsp characters and collapse whitespace
                try:
                    cleaned = re.sub(r'[\u00A0\u200e\u200f\u202a-\u202e\ufeff]', ' ', vs)
                    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                except Exception:
                    cleaned = vs.strip()

                # ISO full datetime — try multiple strict formats (seconds, no-seconds, microseconds)
                try:
                    if re.match(r'^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$', cleaned):
                        # try with seconds + microseconds, then seconds, then minutes only
                        parsed = pd.to_datetime(cleaned, format='%Y-%m-%d %H:%M:%S.%f', errors='coerce')
                        if pd.isna(parsed):
                            parsed = pd.to_datetime(cleaned, format='%Y-%m-%d %H:%M:%S', errors='coerce')
                        if pd.isna(parsed):
                            parsed = pd.to_datetime(cleaned, format='%Y-%m-%d %H:%M', errors='coerce')
                        if pd.notna(parsed):
                            ts_parsed = parsed
                            break
                except Exception:
                    pass
                # Generic pandas fallback (try both dayfirst settings)
                try:
                    parsed = pd.to_datetime(vs, dayfirst=False, infer_datetime_format=True, errors='coerce')
                    if pd.notna(parsed):
                        ts_parsed = parsed
                        break
                    parsed = pd.to_datetime(vs, dayfirst=True, infer_datetime_format=True, errors='coerce')
                    if pd.notna(parsed):
                        ts_parsed = parsed
                        break
                except Exception:
                    continue

        out = {
            'timestamp': ts_to_iso_z(ts_parsed),
            'temperature': temp_val,
            'humidity': humidity_val
        }
        print(json.dumps(out, ensure_ascii=False))

sys.exit(0)
