#!/usr/bin/env python3
"""
Script para importar arquivo Elitech RC-4HC.xls
Lê a planilha 'Lista' e insere dados no PostgreSQL
"""
import sys
import os
import pandas as pd
import psycopg2
from datetime import datetime
import re

# Configuração do banco
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'laudo_db',
    'user': 'laudo_user',
    'password': 'laudo_secure_pass_2024_prod'
}

def main():
    if len(sys.argv) < 2:
        print("Uso: python import_rc4hc.py <caminho_arquivo.xls>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Arquivo não encontrado: {file_path}")
        sys.exit(2)
    
    print(f"Lendo arquivo: {file_path}")
    
    # Ler planilha 'Lista' do arquivo XLS/XLSX
    try:
        # Tentar primeiro com openpyxl (XLSX), depois xlrd (XLS)
        try:
            df = pd.read_excel(file_path, sheet_name='Lista', engine='openpyxl')
        except:
            df = pd.read_excel(file_path, sheet_name='Lista', engine='xlrd')
        print(f"Planilha carregada: {len(df)} linhas")
    except Exception as e:
        print(f"Erro ao ler arquivo: {e}")
        sys.exit(3)
    
    # Conectar ao banco
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("Conectado ao banco de dados")
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
        sys.exit(4)
    
    # Criar/obter sensor type
    cur.execute("""
        SELECT id FROM sensor_types WHERE "name" = 'Elitech RC-4HC'
    """)
    result = cur.fetchone()
    if result:
        sensor_type_id = result[0]
    else:
        cur.execute("""
            INSERT INTO sensor_types (id, name, description, "dataConfig", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), 'Elitech RC-4HC', 'Elitech RC-4HC (Temp+Hum)', 
                    '{"temperatureColumn":"C","humidityColumn":"D","timestampColumn":"B","startRow":2,"dateFormat":"DD/MM/YYYY HH:mm:ss","hasHeader":true,"separator":";"}'::jsonb,
                    NOW(), NOW())
            RETURNING id
        """)
        sensor_type_id = cur.fetchone()[0]
        print(f"Sensor type criado: {sensor_type_id}")
    
    # Criar/obter sensor
    serial = f"RC4HC-{int(datetime.now().timestamp())}"
    cur.execute("""
        SELECT id FROM sensors WHERE "serialNumber" = %s
    """, (serial,))
    result = cur.fetchone()
    if result:
        sensor_id = result[0]
    else:
        cur.execute("""
            INSERT INTO sensors (id, "serialNumber", model, "typeId", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), %s, 'Elitech RC-4HC', %s, NOW(), NOW())
            RETURNING id
        """, (serial, sensor_type_id))
        sensor_id = cur.fetchone()[0]
        print(f"Sensor criado: {sensor_id} (serial: {serial})")
    
    # Criar/obter suitcase
    suitcase_name = f"Maleta RC-4HC ({serial})"
    cur.execute("""
        SELECT id FROM suitcases WHERE name = %s
    """, (suitcase_name,))
    result = cur.fetchone()
    if result:
        suitcase_id = result[0]
    else:
        cur.execute("""
            INSERT INTO suitcases (id, name, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), %s, NOW(), NOW())
            RETURNING id
        """, (suitcase_name,))
        suitcase_id = cur.fetchone()[0]
        
        # Associar sensor à maleta
        cur.execute("""
            INSERT INTO suitcase_sensors (id, "suitcaseId", "sensorId", position)
            VALUES (gen_random_uuid(), %s, %s, 1)
        """, (suitcase_id, sensor_id))
        print(f"Suitcase criada: {suitcase_id}")
    
    conn.commit()
    
    # Mapear colunas (assumindo: coluna 1=timestamp, 2=temperatura, 3=umidade)
    # Ajustar conforme a estrutura real do arquivo
    columns = df.columns.tolist()
    print(f"Colunas encontradas: {columns}")
    
    # Tentar identificar colunas automaticamente
    timestamp_col = None
    temp_col = None
    humidity_col = None
    
    for col in columns:
        col_lower = str(col).lower()
        if 'data' in col_lower or 'hora' in col_lower or 'time' in col_lower:
            timestamp_col = col
        elif 'temp' in col_lower:
            temp_col = col
        elif 'umid' in col_lower or 'humid' in col_lower:
            humidity_col = col
    
    if not timestamp_col or not temp_col:
        print("AVISO: Usando colunas por índice (1,2,3)")
        timestamp_col = columns[1] if len(columns) > 1 else columns[0]
        temp_col = columns[2] if len(columns) > 2 else columns[1]
        humidity_col = columns[3] if len(columns) > 3 else None
    
    print(f"Mapeamento: timestamp={timestamp_col}, temp={temp_col}, humidity={humidity_col}")
    
    # Inserir dados em lotes
    batch = []
    inserted = 0
    failed = 0
    
    for idx, row in df.iterrows():
        try:
            timestamp_raw = row[timestamp_col]
            temp_raw = row[temp_col]
            humidity_raw = row[humidity_col] if humidity_col else None
            
            # Converter timestamp (strip timezone suffix to keep naive local time)
            if pd.isna(timestamp_raw):
                failed += 1
                continue

            ts_raw_str = str(timestamp_raw).strip()
            ts_no_tz = re.sub(r'(?:Z|[+-]\d{2}:?\d{2})$', '', ts_raw_str)
            timestamp = pd.to_datetime(ts_no_tz, dayfirst=True, errors='coerce')
            if pd.isna(timestamp):
                failed += 1
                continue
            
            # Converter temperatura
            if pd.isna(temp_raw):
                failed += 1
                continue
            temp = float(str(temp_raw).replace(',', '.'))
            
            # Converter umidade
            humidity = None
            if humidity_raw is not None and not pd.isna(humidity_raw):
                try:
                    humidity = float(str(humidity_raw).replace(',', '.'))
                except:
                    pass
            
            batch.append((
                sensor_id,
                timestamp,
                temp,
                humidity,
                os.path.basename(file_path),
                idx + 2  # +2 porque linha 1 é header
            ))
            
            # Inserir em lotes de 1000
            if len(batch) >= 1000:
                cur.executemany("""
                    INSERT INTO sensor_data (id, "sensorId", timestamp, temperature, humidity, "fileName", "rowNumber", "createdAt")
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, batch)
                conn.commit()
                inserted += len(batch)
                batch = []
                print(f"Progresso: {inserted} linhas inseridas...")
        
        except Exception as e:
            failed += 1
            if failed < 5:  # Mostrar apenas primeiros erros
                print(f"Erro na linha {idx+2}: {e}")
    
    # Inserir lote final
    if batch:
        cur.executemany("""
            INSERT INTO sensor_data (id, "sensorId", timestamp, temperature, humidity, "fileName", "rowNumber", "createdAt")
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT DO NOTHING
        """, batch)
        conn.commit()
        inserted += len(batch)
    
    cur.close()
    conn.close()
    
    print(f"\n=== RESUMO ===")
    print(f"Total de linhas: {len(df)}")
    print(f"Inseridas: {inserted}")
    print(f"Falhadas: {failed}")
    print(f"Sensor ID: {sensor_id}")
    print(f"Suitcase ID: {suitcase_id}")

if __name__ == '__main__':
    main()
