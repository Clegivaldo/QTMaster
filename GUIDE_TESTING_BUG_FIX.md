# 🧪 Guia de Testes - Verificação de Bugs Corrigidos

**Versão:** Atualização 3 - Bug Fix Session  
**Data:** 2024  
**Status:** Pronto para Testes

---

## ⚡ Quick Start

```bash
# Iniciar Backend
cd backend
npm run dev

# Iniciar Frontend (em outro terminal)
cd frontend
npm run dev
# Frontend roda em http://localhost:3001

# Abrir browser
http://localhost:3001/templates
```

---

## 🧪 Teste 1: Múltiplos Toasts (BUG #1)

### Cenário
Verificar se apenas **1 Toast** aparece ao salvar um template.

### Passos

1. ✅ Navegue para http://localhost:3001/templates
2. ✅ Clique em um template existente para abrir no editor
3. ✅ Faça uma pequena alteração (ex: adicione um elemento de texto)
4. ✅ Clique em "Salvar" (ou use Ctrl+S)
5. ✅ **OBSERVE**: Quantos Toasts aparecem?

### Resultado Esperado
- ✅ **Exatamente 1 Toast** com mensagem "Template salvo com sucesso!"
- ✅ Toast desaparece após 3 segundos
- ✅ Sem duplicatas
- ✅ Sem múltiplas notificações

### Resultado com Bug
- ❌ 3-5 Toasts aparecem simultaneamente
- ❌ Múltiplas notificações sobrepostas

### Console Debug
Abra DevTools (F12) → Console e procure por:
```
✅ Esperado: Sem logs de "Duplicate save ignored"
❌ Com bug: Múltiplas chamadas sem controle
```

---

## 🧪 Teste 2: Persistência de Itens Após Save (BUG #2)

### Cenário
Verificar se os elementos permanecem visíveis após salvar o template.

### Passos

1. ✅ Abra um template no editor
2. ✅ Adicione 3-5 elementos novos (textos, shapes, etc)
3. ✅ Observe os elementos no canvas
4. ✅ Clique em "Salvar"
5. ✅ Aguarde a notificação de sucesso
6. ✅ **OBSERVE**: Os elementos continuam visíveis?

### Resultado Esperado
- ✅ Elementos permanecem **imediatamente visíveis** após save
- ✅ Canvas não fica vazio
- ✅ Sem lag ou redraw
- ✅ Dados persistem corretamente

### Resultado com Bug
- ❌ Canvas fica vazio imediatamente após save
- ❌ Elementos desaparecem
- ❌ Precisa recarregar para ver novamente

### Console Debug
```javascript
// No console:
// ✅ Sem erros de "Incomplete template data"
// ❌ Com bug: múltiplas chamadas a loadTemplate()
```

---

## 🧪 Teste 3: Persistência ao Reabrir Editor (BUG #3)

### Cenário
Verificar se os elementos carregam corretamente ao reabrir um template que foi salvo.

### Passos

1. ✅ Abra um template no editor
2. ✅ Adicione ou modifique vários elementos
3. ✅ Clique em "Salvar" e aguarde sucesso
4. ✅ **Feche o editor** (clique em "Voltar" ou "Templates")
5. ✅ Retorne à lista de templates
6. ✅ **Abra novamente o mesmo template**
7. ✅ **OBSERVE**: Os elementos carregam?

### Resultado Esperado
- ✅ Template abre com **todos os elementos intactos**
- ✅ Layout preservado exatamente como foi salvo
- ✅ Sem elementos faltando
- ✅ Sem linhas em branco ou vazios
- ✅ Dados completos carregados

### Resultado com Bug
- ❌ Template abre vazio (sem elementos)
- ❌ Canvas em branco
- ❌ Elementos faltam
- ❌ Dados corrompidos

### Console Debug
```javascript
// Esperado:
// ✅ "Carregando template: [id]"
// ✅ "Template carregado com sucesso: {com pages: [...], elements: [...]}"

// Com bug:
// ❌ "Template carregado com sucesso: {pages: [], elements: []}"
// ❌ Sem propriedade 'pages'
```

---

## 🔁 Teste 4: Multiple Saves Rapidly (Stress Test)

### Cenário
Testar comportamento com múltiplos saves em rápida sucessão (validar throttling).

### Passos

1. ✅ Abra um template
2. ✅ Faça uma alteração
3. ✅ Clique "Salvar" rapidamente **5 vezes** em sequência
4. ✅ **OBSERVE**: Toasts exibidos

### Resultado Esperado
- ✅ Máximo **5 Toasts** (1 por save, sem duplicatas extras)
- ✅ Nenhum erro na console
- ✅ Dados salvos corretamente a cada vez
- ✅ Sem stale data issues

### Resultado com Bug
- ❌ 15-25 Toasts (múltiplas por save)
- ❌ Muitas notificações simultâneas
- ❌ Possível dados corrompidos

---

## 🔁 Teste 5: Create → Save → Edit → Save → Reopen (Full Cycle)

### Cenário
Teste do ciclo completo de vida de um template.

### Passos

1. ✅ Clique "Novo Template"
2. ✅ Adicione título: "Test-Template-BugFix"
3. ✅ Adicione 3 elementos (texto, shape, etc)
4. ✅ **Primeira save** → Aguarde sucesso
5. ✅ Verifique: elementos ainda lá? ✓
6. ✅ Edite os elementos
7. ✅ **Segunda save** → Aguarde sucesso
8. ✅ Verifique: elementos ainda lá? ✓
9. ✅ Volte à lista de templates
10. ✅ Abra novamente "Test-Template-BugFix"
11. ✅ **Verifique**: Todos os elementos carregaram?

### Resultado Esperado
- ✅ 1º Toast ao salvar (criação)
- ✅ Elementos persistem após cada save
- ✅ Reopening carrega todos os dados
- ✅ **3 Toasts totais** (1 por save, apenas os que salvaram)
- ✅ Nenhuma perda de dados

### Resultado com Bug
- ❌ Múltiplos Toasts em cada save (3-5)
- ❌ Elementos desaparecem após algum save
- ❌ Reopen mostra template vazio
- ❌ Dados perdidos

---

## 📝 Checklist Final

### ✅ Testes a Passar

- [ ] Teste 1: Apenas 1 Toast por save ✓
- [ ] Teste 2: Elementos persistem após save ✓
- [ ] Teste 3: Elementos carregam ao reabrir ✓
- [ ] Teste 4: Multiple saves throttled ✓
- [ ] Teste 5: Full lifecycle OK ✓

### 🔍 Console Checks

- [ ] Sem erros vermelhos em DevTools
- [ ] Sem "Incomplete template data" warnings
- [ ] Logs de "Duplicate save ignored" apenas para saves rápidos
- [ ] "Template carregado com sucesso" com dados completos

### 📊 Performance

- [ ] Sem lag ao salvar
- [ ] Sem lag ao reabrir
- [ ] Toast aparece em < 100ms
- [ ] Sem freeze do UI

---

## 🐛 Se Algo Falhar

### Múltiplos Toasts ainda aparecem?
1. ✅ Verificar se alterações foram salvas em:
   - `frontend/src/components/EditorLayoutProfissional/components/Modals/SaveTemplateModal.tsx`
   - `frontend/src/pages/EditorLayout.tsx`
2. ✅ Fazer rebuild: `npm run build`
3. ✅ Hard refresh browser: `Ctrl+Shift+R`
4. ✅ Verificar console para erros

### Elementos desaparecem?
1. ✅ Verificar se backend retorna `pages` field
   - Abra DevTools → Network → XHR
   - Salve template → Veja request response
   - Procure por `"pages":` na resposta
2. ✅ Se falta `pages`, backend não foi atualizado
   - Verificar: `backend/src/controllers/editorTemplateController.ts` linha 437
3. ✅ Reiniciar backend: `npm run dev`

### Stale Data on Reopen?
1. ✅ Verificar localStorage vs API
   - DevTools → Application → Local Storage
   - Comparar com Network responses
2. ✅ Verificar useTemplateEditor dependencies
   - Procurar por: `}, [templateId, loadTemplate, loadTemplateFromStorage]);`
   - Se falta dependências, não está corrigido

---

## 📞 Debug Avançado

### Ver Request/Response Completo

```javascript
// No console do browser:
localStorage.setItem('DEBUG_API', '1');
// Recarregue a página
// Agora todos os requests/responses serão logados
```

### Verificar Template Carregado

```javascript
// No console do browser:
// Após abrir um template, execute:
console.log('Current template:', window.__debugTemplate || 'Not exposed');
```

### Limpar Cache Local

```bash
# Se os testes ainda falham, limpar estado local:
1. DevTools → Application → Storage → Clear all
2. Hard refresh: Ctrl+Shift+R
3. Tente novamente
```

---

## 📋 Resultado Final

Após passar em todos os testes, o sistema está pronto para:
- ✅ Produção
- ✅ Testes de regressão completos
- ✅ Deploy em Docker
- ✅ Uso dos usuários finais

**Status Esperado:** 🟢 TODOS OS TESTES PASSANDO
