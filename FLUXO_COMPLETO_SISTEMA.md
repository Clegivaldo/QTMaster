# 📋 Fluxo Completo: Da Importação ao Laudo

## 🎯 Visão Geral do Sistema

O sistema QT-Master segue este fluxo de trabalho:

```
1. Criar Validação
   ↓
2. Importar Dados dos Sensores
   ↓
3. Analisar Dados e Estatísticas
   ↓
4. Gerar Relatório/Laudo
   ↓
5. Visualizar, Exportar PDF, Compartilhar
```

---

## 📊 Passo a Passo Completo

### 1️⃣ Criar Validação
**Página:** `/validations` → Botão "Nova Validação"

**O que criar:**
- ✅ Nome da validação
- ✅ Cliente associado
- ✅ Equipamento sendo validado
- ✅ Parâmetros de temperatura (min/max)
- ✅ Parâmetros de umidade (opcional)
- ✅ Número do certificado

**Após criar:** Sistema redireciona para `/import` com validationId

---

### 2️⃣ Importar Dados
**Página:** `/import` (abre automaticamente após criar validação)

**O que fazer:**
1. Selecionar a **Maleta** que contém os sensores
2. Fazer upload dos arquivos (`.xls`, `.xlsx`, `.csv`)
3. Sistema processa arquivos e:
   - Detecta sensores automaticamente (via serial no arquivo)
   - Importa leituras de temperatura/umidade
   - Associa à validação criada

**Onde os dados vão:**
- Tabela `SensorData` no PostgreSQL
- Cada leitura vinculada a:
  - `sensorId` (sensor que coletou)
  - `validationId` (validação em andamento)
  - `timestamp`, `temperature`, `humidity`

---

### 3️⃣ Visualizar Dados Importados
**Página:** `/validations`

**O que você vê na lista:**
- ✅ Nome da validação
- ✅ Cliente e Maleta
- ✅ **Estatísticas automáticas:**
  - Total de leituras importadas
  - % de conformidade (dentro dos limites)
  - Temperatura mín/média/máx
  - Umidade mín/média/máx
- ✅ Número de relatórios gerados

**Ações disponíveis:**
- 🔍 **Ver Gráficos** → (em desenvolvimento)
- 📝 **Detalhes** → (em desenvolvimento)
- 📤 **Importar Mais Dados** → volta para `/import`
- ✅ **Aprovar/Reprovar** → muda status da validação
- 🗑️ **Excluir** → remove validação

---

### 4️⃣ Gerar Relatório/Laudo
**Página:** `/reports` → Botão "Novo Relatório"

**Como criar um relatório:**
1. Ir para página **Reports**
2. Clicar em **"Novo Relatório"**
3. Preencher:
   - Nome do relatório
   - **Selecionar a Validação** (com dados já importados)
   - Template de layout (opcional)
   - Observações
4. Salvar

**O sistema irá:**
- ✅ Buscar todos os dados da validação
- ✅ Calcular estatísticas finais
- ✅ Aplicar template de layout escolhido
- ✅ Criar relatório com status **DRAFT**

---

### 5️⃣ Finalizar e Exportar
**Página:** `/reports` (lista de relatórios)

**Status do Relatório:**
- 📄 **DRAFT** (Rascunho) → Em edição
- ✅ **VALIDATED** (Validado) → Aprovado para geração
- 🔒 **FINALIZED** (Finalizado) → PDF gerado, imutável

**Ações disponíveis:**
- 👁️ **Visualizar** → Ver detalhes completos
- ✏️ **Editar** → Modificar informações
- 📊 **Gerar PDF** → Exportar para PDF (após validar)
- 💾 **Download** → Baixar relatório
- 🖨️ **Imprimir** → Enviar para impressora
- 🗑️ **Excluir** → Remover relatório

---

## 🔧 Funcionalidades Pendentes de Implementação

### ⚠️ Na Página de Validações
Após importar dados, as seguintes funcionalidades mostram **alerta "será implementada em breve"**:

```tsx
// Linha ~335 em frontend/src/pages/Validations.tsx
<button onClick={() => alert('Funcionalidade de gráficos será implementada em breve')}>
  Ver Gráficos
</button>
<button onClick={() => alert('Funcionalidade de detalhes será implementada em breve')}>
  Detalhes
</button>
```

### ✅ O que JÁ funciona:
- ✅ Criar validação
- ✅ Importar dados (XLS/CSV)
- ✅ Ver estatísticas automáticas
- ✅ Aprovar/reprovar validação
- ✅ Importar mais dados
- ✅ Navegar para Reports
- ✅ Criar relatórios (backend implementado)

### 🚧 O que precisa ser conectado:
1. **Botão "Ver Gráficos"** → Navegar para página de gráficos ou modal
2. **Botão "Detalhes"** → Abrir modal com dados completos da validação
3. **Botão "Gerar Laudo"** → Navegar para `/reports` com validationId pré-selecionado

---

## 🎨 Sugestão: Melhorar UX após Importação

### Adicionar na página de Validations após importar:

```tsx
// Substituir os botões de alerta por navegação real:

<button 
  onClick={() => navigate(`/reports/new?validationId=${validation.id}`)}
  className="btn-primary"
>
  📊 Gerar Laudo
</button>

<button 
  onClick={() => setSelectedValidation(validation)}
  className="btn-secondary"
>
  📈 Ver Gráficos
</button>

<button 
  onClick={() => navigate(`/validations/${validation.id}`)}
  className="btn-secondary"
>
  🔍 Ver Detalhes Completos
</button>
```

---

## 📂 Estrutura de Dados

### Após Importação Bem-Sucedida:

```sql
-- Validação criada
SELECT * FROM "Validation" WHERE id = 'seu-validation-id';

-- Dados importados
SELECT COUNT(*) FROM "SensorData" 
WHERE "validationId" = 'seu-validation-id';

-- Sensores usados
SELECT s.serialNumber, COUNT(sd.id) as leituras
FROM "Sensor" s
JOIN "SensorData" sd ON s.id = sd."sensorId"
WHERE sd."validationId" = 'seu-validation-id'
GROUP BY s.id, s.serialNumber;

-- Estatísticas calculadas (aparecem na UI)
SELECT 
  COUNT(*) as total_leituras,
  AVG(temperature) as temp_media,
  MIN(temperature) as temp_min,
  MAX(temperature) as temp_max,
  AVG(humidity) as umid_media
FROM "SensorData"
WHERE "validationId" = 'seu-validation-id';
```

---

## 🚀 Próximos Passos Recomendados

Para completar o fluxo, implementar:

1. **Página de Detalhes da Validação** (`/validations/:id`)
   - Tabela completa de leituras
   - Gráficos de temperatura/umidade por sensor
   - Timeline das leituras
   - Botão destacado "Gerar Laudo"

2. **Formulário de Criação de Relatório** (página dedicada)
   - Pre-popular com validationId da query string
   - Buscar dados da validação automaticamente
   - Preview do layout antes de gerar

3. **Gerador de PDF Funcional**
   - Integrar com FastReport ou biblioteca PDF
   - Aplicar template visual
   - Incluir gráficos e tabelas
   - Adicionar marca d'água e assinatura

4. **Modal de Gráficos Inline**
   - Exibir gráficos sem sair da página
   - Usar Chart.js ou Recharts
   - Permitir exportar gráfico como PNG

---

## ✅ Checklist de Uso Atual

- [x] Login funcional (admin@sistema.com / admin123)
- [x] Criar validação
- [x] Selecionar maleta
- [x] Importar arquivo XLS/CSV
- [x] Ver dados importados na lista
- [x] Ver estatísticas automáticas
- [ ] **FALTA:** Botão claro "Gerar Laudo" após importação
- [ ] **FALTA:** Navegar para criação de relatório
- [ ] **FALTA:** Ver relatórios gerados
- [ ] **FALTA:** Exportar PDF

**Status:** Sistema importa dados com sucesso, mas falta conectar à geração de laudos! 🎯
