# 🎯 Planejamento Completo - Sistema de Validação QT-Master

**Data**: 26 de novembro de 2025  
**Status**: Em Implementação  
**Prioridade**: CRÍTICA - Bugs bloqueadores primeiro, depois features

---

## 🚨 **BUGS CRÍTICOS** (Resolver Primeiro)

### 1. ✅ **Duplicação de Dados na Importação (3x cada leitura)** - RESOLVIDO
**Problema**: Importação de arquivo com ~1000 leituras resulta em 3002 registros (3x duplicado)

**Causa Identificada**: Nested include `sensor -> type` criando Cartesian product em SQL joins

**Solução Aplicada**:
- Removido nested include em `validationController.ts` linha 267
- Simplificado para: `include: { sensor: { select: { id: true, serialNumber: true } } }`
- Deploy concluído em 26/11/2025

**Status**: 🟢 **RESOLVIDO E DEPLOYADO**

---

### 2. ✅ **Gráfico de Umidade Não Aparece** - RESOLVIDO
**Problema**: ValidationCharts mostra apenas temperatura, umidade não renderiza

**Causa Identificada**: Condição overly strict exigindo `minHumidity !== null` no banco

**Solução Aplicada**:
- Modificado `ValidationCharts.tsx` linha 111
- Alterado de: `if (humidities.length > 0 && validationData.minHumidity !== null)`
- Para: `if (humidities.length > 0)`
- Agora renderiza gráfico sempre que houver dados de umidade
- Deploy concluído em 26/11/2025

**Status**: 🟢 **RESOLVIDO E DEPLOYADO**

---

## 📊 **FEATURES FALTANTES**

### 3. ✅ **Estatísticas Min/Max em ValidationDetails** - JÁ FUNCIONA
**Status**: Verificado que `ValidationDetails.tsx` já exibe min/max corretamente nos cards de estatísticas (linhas 283, 299)

**Implementação Existente**:
- Backend já calcula min/max em `getValidationById`
- Frontend já renderiza 4 cards: Temp Min, Temp Max, Umidade Min, Umidade Max
- Não requer implementação adicional

**Status**: 🟢 **JÁ IMPLEMENTADO**

---

### 4. ✅ **Inputs de Critérios de Aceitação no Form** - RESOLVIDO
**Problema**: Valores hardcoded (2-8°C), usuário não pode configurar

**Solução Aplicada**:
- Adicionados 4 inputs numéricos em `ValidationCreationModal.tsx`
- Campos: minTemperature, maxTemperature, minHumidity, maxHumidity
- Validação client-side: min < max para ambos temperatura e umidade
- Valores default: temp 2-8°C, umidade indefinida
- Valores removidos de hardcode em `Validations.tsx` linhas 57-60
- Deploy concluído em 26/11/2025

**Status**: 🟢 **RESOLVIDO E DEPLOYADO**

---

### 5. ✅ **Sistema de Ciclos de Validação** - RESOLVIDO

**Backend API** (`backend/src/routes/validations.ts`):
- ✅ GET `/:id/cycles` - Lista todos os ciclos
- ✅ POST `/:id/cycles` - Cria novo ciclo com validação de sobreposição
- ✅ PUT `/:id/cycles/:cycleId` - Atualiza ciclo
- ✅ DELETE `/:id/cycles/:cycleId` - Remove ciclo

**Backend Controller** (`backend/src/controllers/validationController.ts`):
- ✅ `getCycles()` - Fetch com count de importedItems
- ✅ `createCycle()` - Validação de datas e detecção de overlapping
- ✅ `updateCycle()` - Update com revalidação de overlaps
- ✅ `deleteCycle()` - Delete cascade

**Frontend Component** (`frontend/src/components/CycleManager.tsx` - 400+ linhas):
- ✅ Modal CRUD completo com create/edit modes
- ✅ 5 tipos de ciclo com cores: NORMAL (azul), CHEIO (verde), VAZIO (amarelo), FALTA_ENERGIA (vermelho), PORTA_ABERTA (laranja)
- ✅ Datetime-local inputs para startAt/endAt
- ✅ Cards coloridos com duração calculada
- ✅ Edit/Delete buttons com confirmação
- ✅ Empty state com Clock icon

**Integração** (`frontend/src/pages/ValidationDetails.tsx`):
- ✅ Import e render de CycleManager
- ✅ Props: validationId, cycles, onUpdate callback
- ✅ Posicionado após statistics cards

**Deploy**: 26/11/2025 - Backend build: 287s, Frontend: 40s

**Status**: 🟢 **RESOLVIDO E DEPLOYADO**

---

### 6. 📊 **Estatísticas por Ciclo**

**Endpoint**: `GET /api/validations/:id/statistics?cycleId=xxx`

**Retorno**:
```json
{
  "overall": {
    "temperature": { "min": 2.1, "max": 7.8, "avg": 4.5 },
    "humidity": { "min": 45, "max": 68, "avg": 55 }
  },
  "byCycle": [
    {
      "cycleId": "cycle1",
      "cycleName": "Porta Aberta",
      "temperature": { "min": 12.3, "max": 18.5, "avg": 15.2 },
      "humidity": { "min": 40, "max": 50, "avg": 45 }
    }
  ]
}
```

**UI**: Tabs em `ValidationDetails.tsx`
- Tab "Geral": estatísticas do período completo
- Tab "Por Ciclo": tabela com estatísticas de cada ciclo

**Prioridade**: 🟢 **BAIXA** - depende de ciclos implementados

---

### 7. 🔗 **Conectar Botão "Gerar Laudo"**

**Localização**: `Validations.tsx` (botão já existe na UI)

**Código Atual** (linha ~350):
```tsx
<button className="...">
  <FileText /> Gerar Laudo
</button>
```

**Implementação**:
```tsx
const handleGenerateReport = async (validation: Validation) => {
  try {
    setGeneratingReport(validation.id);
    
    const response = await fetch(`/api/reports/generate/${validation.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const { reportId, downloadUrl } = await response.json();
    
    // Opção 1: Navegar para página de relatórios
    navigate(`/reports/${reportId}`);
    
    // Opção 2: Download direto
    window.open(downloadUrl, '_blank');
  } catch (error) {
    alert('Erro ao gerar laudo');
  } finally {
    setGeneratingReport(null);
  }
};
```

**Prioridade**: 🟡 **MÉDIA** - conecta fluxo validação → relatório

---

### 8. ⚠️ **UI de Detecção de Duplicatas**

**Localização**: `ImportData.tsx` (antes do upload)

**Fluxo**:
1. Usuário seleciona arquivo
2. Parser extrai metadados (firstTimestamp, lastTimestamp, recordCount)
3. Chamar `POST /api/validations/:id/check-duplicate`
4. Se `isDuplicate: true`, mostrar modal de confirmação
5. Usuário cancela ou prossegue

**Código**:
```tsx
const checkDuplicates = async (metadata) => {
  const response = await fetch(`/api/validations/${validationId}/check-duplicate`, {
    method: 'POST',
    body: JSON.stringify(metadata)
  });
  
  const { isDuplicate, message, existingCount } = await response.json();
  
  if (isDuplicate) {
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: ${message}\n\n` +
      `Registros existentes: ${existingCount}\n` +
      `Novos registros: ${metadata.recordCount}\n\n` +
      `Deseja prosseguir mesmo assim?`
    );
    
    if (!confirmed) return false;
  }
  
  return true;
};

const handleUpload = async () => {
  const metadata = parseFileMetadata(file);
  const canProceed = await checkDuplicates(metadata);
  
  if (!canProceed) return;
  
  // Continua upload normal...
};
```

**Prioridade**: 🟡 **MÉDIA** - API já existe, falta UI

---

### 9. 🔄 **Filtrar Gráficos por Ciclo**

**Localização**: `ValidationCharts.tsx`

**UI**:
```tsx
<select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}>
  <option value="">Todos os dados</option>
  {cycles.map(cycle => (
    <option key={cycle.id} value={cycle.id}>
      {cycle.name} ({cycle.cycleType})
    </option>
  ))}
</select>
```

**Filtro de Dados**:
```tsx
const filteredData = useMemo(() => {
  if (!selectedCycleId) return sensorData;
  
  const cycle = cycles.find(c => c.id === selectedCycleId);
  if (!cycle) return sensorData;
  
  return sensorData.filter(d => {
    const timestamp = new Date(d.timestamp);
    return timestamp >= new Date(cycle.startAt) && timestamp <= new Date(cycle.endAt);
  });
}, [sensorData, selectedCycleId, cycles]);
```

**Prioridade**: 🟢 **BAIXA** - feature complementar

---

## 🎯 **ORDEM DE IMPLEMENTAÇÃO**

### **Sprint 1 - Bugs Críticos** ✅ CONCLUÍDO (26/11/2025)
1. ✅ Investigar e corrigir duplicação de dados (3x) - DEPLOYADO
2. ✅ Corrigir gráfico de umidade não renderizando - DEPLOYADO
3. ✅ Verificar estatísticas min/max - JÁ FUNCIONAVA

### **Sprint 2 - Forms e Critérios** ✅ CONCLUÍDO (26/11/2025)
4. ✅ Adicionar inputs de critérios de aceitação no form - DEPLOYADO
5. ⏳ Conectar botão "Gerar Laudo" - PENDENTE
6. ⏳ UI de detecção de duplicatas - PENDENTE

### **Sprint 3 - Sistema de Ciclos** ✅ CONCLUÍDO (26/11/2025)
7. ✅ Backend API de ciclos (CRUD completo) - DEPLOYADO
8. ✅ Frontend CycleManager component - DEPLOYADO
9. ⏳ Estatísticas por ciclo - EM IMPLEMENTAÇÃO
10. ⏳ Filtrar gráficos por ciclo - PENDENTE

### **Sprint 4 - Deploy e QA** ⏳ PRÓXIMO
11. ⏳ Testes E2E do fluxo completo
12. ⏳ Documentação final

---

## 📝 **CHECKLIST DE VALIDAÇÃO**

### Bugs Corrigidos
- [x] Importação de 1000 leituras resulta em exatamente 1000 registros (não 3000) ✅
- [x] Gráfico de umidade aparece quando há dados de humidity ✅
- [x] ValidationDetails mostra min/max além da média ✅

### Features Implementadas
- [x] Formulário de validação permite configurar min/max temp e umidade ✅
- [ ] Botão "Gerar Laudo" funciona e navega para relatório ou faz download ⏳
- [ ] Importação detecta duplicatas e pede confirmação ⏳
- [x] Sistema de ciclos permite criar/editar/excluir ciclos ✅
- [ ] Estatísticas são calculadas por ciclo e período completo ⏳ EM IMPLEMENTAÇÃO
- [ ] Gráficos podem ser filtrados por ciclo específico ⏳

### Testes E2E
- [ ] Criar cliente → criar validação com critérios → importar dados → verificar contagem
- [ ] Ver gráficos de temperatura E umidade
- [ ] Criar ciclo "Porta Aberta" → ver estatísticas do ciclo
- [ ] Gerar laudo → download PDF ou visualização
- [ ] Importar mesmo arquivo 2x → sistema avisa sobre duplicatas

---

**Próxima Ação**: Iniciar Sprint 1 investigando duplicação de dados
