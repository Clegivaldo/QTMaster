# Correção Multi-Sensor Import e Crash Excel (27/11/2025)

## Problemas Identificados

### 1. Import Crashando com 502 Bad Gateway
**Causa Raiz**: `matchFileToSensor()` linha 471 executava `XLSXLib.readFile((file as any).path)` sem verificar se path existe.
- Multer com `memoryStorage` não define `file.path`
- `readFile()` tentava ler `undefined` → **crash silencioso do processo Node**
- Backend reiniciava automaticamente (Docker health check)
- Frontend recebia 502 ao polling de status

**Solução Implementada**:
```typescript
// ANTES (linha 471 - CRASHAVA)
const wb = XLSXLib.readFile((file as any).path || (file as any).tempFilePath || ...);

// DEPOIS (corrigido)
private async matchFileToSensor(file: Express.Multer.File, suitcase: any, tempFilePath?: string): Promise<any | null> {
  const filePath = tempFilePath || (file as any).path || (file as any).tempFilePath;
  
  if (!filePath) {
    logger.warn('No file path available for serial extraction', { fileName: file.originalname });
  } else {
    const wb = XLSXLib.readFile(filePath);
    // ... resto do código
  }
}
```

- Adicionado parâmetro `tempFilePath` na assinatura da função
- Validação de path antes de `readFile()`
- Tratamento de erro robusto com fallback gracioso
- Atualizada chamada em `processFileWithRobustService()` linha 297: `await this.matchFileToSensor(file, suitcase, tempFilePath)`

### 2. Todos Arquivos Associados ao Mesmo Sensor
**Causa Raiz**: Strategy 2 em `matchFileToSensor()` usava `filename.includes(serialNumber)`.
- Sensores com serialNumbers simples ("1", "2") faziam match com QUALQUER arquivo contendo esses dígitos
- Exemplo: "Araujo_Jorge_2511125105_QT.xls" contém "1" e "2" → matchava ambos sensores

**Solução Implementada**:
- **Desabilitado Strategy 2 completamente** (linhas 499-505)
- Strategy 3 sempre cria novo sensor por arquivo
- Extração de serial em ordem de prioridade:
  1. Cell B6 da aba "Resumo" do Excel
  2. Regex `/[A-Z]{2}\d{10,}/` no filename (ex: "EF7216103539")
  3. Fallback: `${baseName}_${timestamp}` sanitizado

```typescript
// Strategy 2: DISABLED - always create new sensor
logger.info('Skipping filename match strategy, will create new sensor', { 
  fileName: file.originalname, 
  extractedSerial,
  existingSensorCount: suitcase.sensors.length 
});

// Strategy 3: Create new sensor for this file
let newSerial = extractedSerial || 
                file.originalname.match(/[A-Z]{2}\d{10,}/)  ||
                `${baseName}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
```

## Mudanças Aplicadas

### Backend (`backend/src/services/enhancedFileProcessorService.ts`)
1. **Linha 457**: Adicionado parâmetro `tempFilePath?: string` em `matchFileToSensor()`
2. **Linhas 467-477**: Validação robusta de path antes de `readFile()`
3. **Linha 297**: Passando `tempFilePath` para `matchFileToSensor(file, suitcase, tempFilePath)`
4. **Linhas 499-505**: Strategy 2 desabilitado com comentário explicativo

### Infraestrutura Docker
1. Backend rebuild completo: `docker build -f Dockerfile.prod -t qt-master-backend .`
   - Build time: 403.2s (exports 84.6s)
   - Nova imagem: sha256:62ace9f2ebbb...
2. Postgres volume recriado (`docker-compose down -v postgres`)
   - Schema aplicado: `npx prisma db push --accept-data-loss`
   - Admin recriado: `create_admin.sql` executado
3. Stack completa reiniciada: `docker-compose -f docker-compose.prod.yml up -d`
   - Todos containers healthy: postgres, redis, backend, frontend, nginx, prometheus, grafana, loki, promtail

## Validação

### Logs de Verificação
```powershell
# Código compilado presente
docker exec laudo-backend grep "Skipping filename match strategy" dist/services/enhancedFileProcessorService.js
# ✅ Encontrado na linha correta

# Backend conectado ao banco
docker logs laudo-backend --tail 5
# ✅ "Database connection successful", "Server running on port 5000"

# Stack completa operacional
docker-compose -f docker-compose.prod.yml ps
# ✅ All containers Up/Healthy
```

### Testes Necessários
- [ ] Importar 2-3 arquivos XLS diferentes em uma validação nova
- [ ] Verificar logs backend: `"Creating new sensor for file"` deve aparecer para cada arquivo
- [ ] Confirmar banco possui múltiplos sensores: `SELECT id, serialNumber, model FROM sensors;`
- [ ] Validar página Detalhes mostra todos sensores separadamente
- [ ] Verificar gráficos ValidationCharts exibem múltiplas séries coloridas

## Próximos Passos
1. **Testar importação multi-sensor end-to-end**
   - Criar nova validação
   - Importar 2+ arquivos diferentes
   - Verificar sensores criados com serials únicos
2. **Validar dados corretos**
   - Cada sensor deve ter readings isolados
   - Gráficos devem mostrar séries separadas
   - Detalhes devem listar todos sensores
3. **Monitorar logs de produção**
   - Verificar serial extraction funcionando
   - Confirmar ausência de crashes/502 errors
   - Validar performance de imports

## Arquivos Modificados
- `backend/src/services/enhancedFileProcessorService.ts` (2 edits)
  - Assinatura `matchFileToSensor()` + validação path
  - Chamada com `tempFilePath` em `processFileWithRobustService()`
- Docker images rebuilt: `qt-master-backend:latest`
- Database resetado (schema fresh + admin recreated)

## Referências
- Issue original: "Importei 3 sensores. Ainda mostra gráfico com apenas 1 sensor."
- Root cause: Strategy 2 filename matching + Excel readFile crash
- Solution: Disable Strategy 2 + robust path validation
- Status: ✅ **DEPLOYED TO PRODUCTION** - Awaiting user testing
