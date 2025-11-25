# Guia de Importação para Arquivos XLS Legados (Elitech RC-4HC)

## Problema
Arquivos `.xls` no formato legado (BIFF8) podem causar problemas de memória no backend Node.js.

## ✅ Solução Integrada (IMPLEMENTADA)

A partir de agora, a importação via interface web usa automaticamente o fallback Python para arquivos XLS legados:

1. **Acesse**: Menu "Importar Dados" → Selecione arquivo .xls
2. **Sistema detecta** formato legado e usa Python automaticamente
3. **Processamento** ocorre em segundo plano de forma eficiente
4. **Resultado** aparece normalmente com estatísticas

### Dependências no Container Docker
- ✅ Python 3 instalado
- ✅ pandas, xlrd, openpyxl configurados
- ✅ Script `/app/python/fallback_parser.py` disponível

## Solução Manual Alternativa: Script Python Standalone

Caso prefira processar arquivos diretamente via terminal (fora da interface):

### 1. Certifique-se de ter as dependências instaladas:
```powershell
pip install pandas xlrd openpyxl psycopg2-binary
```

### 2. Execute o script de importação:
```powershell
python "backend\tmp\import_rc4hc.py" "caminho\para\seu\arquivo.xls"
```

### Exemplo:
```powershell
python "backend\tmp\import_rc4hc.py" "uploads\Elitech RC-4HC.xls"
```

### 3. O script irá:
- ✅ Conectar ao PostgreSQL automaticamente (usando credenciais do .env)
- ✅ Criar sensor type, sensor e maleta
- ✅ Detectar colunas automaticamente (Tempo, Temperatura, Umidade)
- ✅ Inserir dados em lotes de 1000 registros
- ✅ Exibir resumo com estatísticas (período, médias, total importado)

## Saída Esperada

```
Lendo arquivo: uploads\Elitech RC-4HC.xls
Planilha carregada: 1128 linhas
Conectado ao banco de dados
Sensor criado: cdb7b559-70d3-4834-9ee7-4232c344d306 (serial: RC4HC-1764091663)
Suitcase criada: eaccc371-5d65-4498-9616-ecb1b21e592a
Colunas encontradas: ['Não.', 'Tempo', 'Temperatura°C', 'Umidade%RH']
Mapeamento: timestamp=Tempo, temp=Temperatura°C, humidity=Umidade%RH
Progresso: 1000 linhas inseridas...

=== RESUMO ===
Total de linhas: 1128
Inseridas: 1128
Falhadas: 0
Sensor ID: cdb7b559-70d3-4834-9ee7-4232c344d306
Suitcase ID: eaccc371-5d65-4498-9616-ecb1b21e592a
```

## Solução Definitiva (Futura)

## ✅ Status das Melhorias

- [x] **Python fallback integrado** - Container Docker inclui Python 3 + dependências
- [x] **Detecção automática** - Sistema identifica XLS legados e usa fallback
- [x] **Script disponível** - `/app/python/fallback_parser.py` copiado para imagem
- [x] **Caminho corrigido** - `pythonFallbackService.ts` usa `/app/python/fallback_parser.py`
- [x] **Dependências instaladas** - pandas, xlrd, openpyxl via requirements.txt

## Verificação dos Dados Importados

```sql
-- Total de registros importados
SELECT COUNT(*) FROM sensor_data 
WHERE "sensorId" = 'SEU_SENSOR_ID';

-- Estatísticas dos dados
SELECT 
    COUNT(*) as total_registros,
    MIN(timestamp) as primeira_leitura,
    MAX(timestamp) as ultima_leitura,
    ROUND(AVG(temperature)::numeric, 2) as temp_media,
    ROUND(AVG(humidity)::numeric, 2) as umid_media
FROM sensor_data 
WHERE "sensorId" = 'SEU_SENSOR_ID';
```

Ou via PowerShell:
```powershell
docker-compose exec -T postgres psql -U laudo_user -d laudo_db -c "SELECT COUNT(*) FROM sensor_data WHERE \"sensorId\" = 'SEU_SENSOR_ID';"
```

## Estrutura do Arquivo RC-4HC

- **Planilha "Resumo"**: Célula B6 = número de série
- **Planilha "Lista"**: 
  - Coluna B = Data/Hora
  - Coluna C = Temperatura (°C)
  - Coluna D = Umidade (%RH)
  - Linha 1 = Cabeçalhos
  - Dados iniciam na linha 2

## Suporte

Em caso de erro, verifique:
1. Credenciais do banco no arquivo `.env`
2. PostgreSQL está rodando: `docker-compose ps postgres`
3. Arquivo XLS existe e está acessível
4. Python tem permissões para acessar o arquivo
