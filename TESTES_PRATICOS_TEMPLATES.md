# 🧪 Guia Prático de Testes - Novas Funcionalidades

## ✅ Todos os Problemas Corrigidos

### 1. Erro 400 ao Salvar Template Existente
**Status:** ✅ **CORRIGIDO**

**Antes:**
- Ao editar template existente e clicar Salvar, retornava erro 400
- Questão: Schema Prisma com campo `pages` não mapeado corretamente

**Depois:**
- Template existente salva sem erros
- Versão incrementa automaticamente
- Dados persistem no banco

---

### 2. Modal de Salvar Inteligente
**Status:** ✅ **IMPLEMENTADO**

**Novo Comportamento:**
- **Template NOVO**: Abre modal com formulário (nome, descrição, categoria, tags)
- **Template EXISTENTE**: Salva direto, sem modal! ⚡

**Benefício:** Workflow muito mais rápido para edições

---

### 3. Botão Duplicar
**Status:** ✅ **IMPLEMENTADO**

**Locais:**
- Página de Templates (card de cada template)
- Botão roxo com ícone de cópia

**Ação:**
- Clica → Cria cópia idêntica
- Nome da cópia: "{original} (Cópia)"
- Criador: usuário atual
- Versão: 1

---

### 4. Botão Deletar
**Status:** ✅ **IMPLEMENTADO**

**Locais:**
- Página de Templates (card de cada template)
- Botão vermelho com ícone de lixeira

**Ação:**
- Clica → Abre confirmação: "Tem certeza que deseja deletar..."
- Se confirmar → Deleta e atualiza lista
- Se cancelar → Permanece na lista

---

## 🚀 Como Testar

### Setup
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

---

## 📋 Cenários de Teste

### Teste 1: Criar e Salvar Template Novo

**Passos:**
1. Abrir `/templates`
2. Clicar "Novo Template" ou acessar `/editor-layout`
3. Adicionar 2-3 elementos no canvas (texto, caixa, etc.)
4. Pressionar `Ctrl+S` ou clicar botão Salvar

**Resultado Esperado:**
- ✅ Modal abre com formulário
- ✅ Preencheu "Nome", "Categoria", "Tags" (opcional)
- ✅ Clicar "Salvar" no modal
- ✅ **SEM ERRO 400** 🎉
- ✅ URL muda para `/editor-layout/{uuid}`
- ✅ Mensagem de sucesso

**Se Passar:** ✅ Teste 1 OK

---

### Teste 2: Editar Template Existente

**Pré-requisito:** Template já criado (do Teste 1)

**Passos:**
1. Abrir `/templates`
2. Clicar "Editar" em um template existente
3. Modificar um elemento (posição, cor, texto, etc.)
4. Pressionar `Ctrl+S` ou clicar Salvar

**Resultado Esperado:**
- ✅ Modal **NÃO abre** ⚡ (grande diferença!)
- ✅ Template salva automaticamente
- ✅ **SEM ERRO 400** 🎉
- ✅ Sem formulário de preenchimento
- ✅ Mensagem de sucesso rápida
- ✅ Versão incrementou (+1)

**Como Verificar Versão:**
1. Ir para DevTools (F12)
2. Network tab
3. Procurar PUT /api/editor-templates/:id
4. Response → `version` deve ser +1 maior

**Se Passar:** ✅ Teste 2 OK

---

### Teste 3: Duplicar Template

**Pré-requisito:** Template existente

**Passos:**
1. Abrir `/templates`
2. Procurar template que quer duplicar
3. Clicar botão roxo "Duplicar"
4. Aguardar sucesso

**Resultado Esperado:**
- ✅ Alerta: "Template duplicado com sucesso!"
- ✅ Lista atualiza
- ✅ Nova cópia aparece com nome "{original} (Cópia)"
- ✅ Nova cópia tem ID diferente
- ✅ Nova cópia tem versão = 1
- ✅ Criador = usuário atual

**Como Verificar:**
1. Clicar "Editar" na cópia
2. URL deve ter ID diferente
3. Modificar algo, salvar
4. Versão deve ser 2 (não afeta original)

**Se Passar:** ✅ Teste 3 OK

---

### Teste 4: Deletar Template

**Pré-requisito:** Template existente (pode ser a cópia do Teste 3)

**Passos:**
1. Abrir `/templates`
2. Clicar botão vermelho "Deletar" em um template
3. Confirmar no modal: "Tem certeza que deseja deletar..."
4. Aguardar sucesso

**Resultado Esperado:**
- ✅ Modal de confirmação aparece com nome do template
- ✅ Se clicar "OK":
  - Template desaparece da lista
  - Alerta: "Template deletado com sucesso!"
- ✅ Se clicar "Cancelar":
  - Modal fecha
  - Template permanece na lista

**Como Verificar no Backend:**
1. DevTools → Network tab
2. Procurar DELETE /api/editor-templates/:id
3. Status deve ser 200 ou 204

**Se Passar:** ✅ Teste 4 OK

---

### Teste 5: Exportar PDF

**Passos:**
1. Abrir `/templates`
2. Clicar "Ver" (cinza com olho) em um template
3. PDF abre em nova aba

**Resultado Esperado:**
- ✅ PDF abre sem erro
- ✅ Primeira página mostra:
  - Nome do template
  - "Export gerado em: {DATA}"
  - "Elementos do Template:"
  - Contagem e detalhes dos elementos
  - Metadados (categoria, versão, tags, datas)

**Nota Importante:**
- O PDF **atualmente mostra os dados sobre o template**
- Próxima versão: renderizará o template visualmente
- Isto requer library como html2pdf ou puppeteer

**Se Passar:** ✅ Teste 5 OK

---

## 🐛 Troubleshooting

### Problema: Modal não abre ao editar template existente

**Esperado:** Modal não deve abrir
**Se abrir:** Pode ser que o `isNewTemplate` não está sendo setado corretamente

**Solução:**
```typescript
// Verificar em EditorLayout.tsx
isNewTemplate={editor.template.id?.startsWith('template-') || false}

// Deve retornar:
// - true se ID começa com 'template-' (novo)
// - false se tem outro ID (existente)
```

---

### Problema: Erro 400 ao salvar template existente

**Se ainda dá erro:**
```
statusCode: 400
body: "Validation error"
```

**Verificar:**
1. Backend compilou sem erros? `npx tsc --noEmit`
2. Reinou o backend? `npm start`
3. Template tem pelo menos 1 elemento?

**Solução:**
```bash
# Backend
cd backend
npx tsc --noEmit  # Verificar erros TS
npm start          # Restart

# Check logs
# Procurar por mensagens de erro no console
```

---

### Problema: Duplicar ou Deletar não funciona

**Verificar:**
1. Template tem um ID válido (UUID)?
2. Você está logado?
3. Você é o criador do template?

**Logs:**
- DevTools → Console tab
- Procurar por mensagens de erro
- Network tab → Ver resposta do servidor

---

## 📊 Checklist Final

- [ ] Backend compilou sem erros (`npx tsc --noEmit`)
- [ ] Frontend compilou sem erros
- [ ] Backend rodando: `npm start` na pasta backend
- [ ] Frontend rodando: `npm run dev` na pasta frontend
- [ ] Consegue fazer login
- [ ] Teste 1: Criar novo template ✅
- [ ] Teste 2: Editar template existente (sem modal) ✅
- [ ] Teste 3: Duplicar template ✅
- [ ] Teste 4: Deletar template ✅
- [ ] Teste 5: Exportar PDF ✅

---

## 📞 Quando Tudo Passar

Se todos os testes passarem, significa:
- ✅ Erro 400 foi corrigido
- ✅ Modal de salvar é inteligente
- ✅ Duplicar funciona
- ✅ Deletar funciona
- ✅ PDF exporta

**Status:** Pronto para usar! 🚀

---

## 📝 Logs Esperados

### Sucesso ao Salvar Novo
```
✅ Template criado com sucesso
Novo ID: abc123def456...
Version: 1
```

### Sucesso ao Editar Existente
```
✅ Template atualizado
ID: abc123def456...
Version: 2 (incrementou)
```

### Sucesso ao Duplicar
```
✅ Template duplicado com sucesso
Original ID: abc123...
Copy ID: xyz789...
Nome: "Original (Cópia)"
```

### Sucesso ao Deletar
```
✅ Template deletado com sucesso
ID: abc123...
```

---

## 🎯 Resultado Esperado

Após passar todos os testes, o sistema deve:

1. **Salvar templates** sem erro 400 ✅
2. **Editar templates** sem abrir modal desnecessário ✅
3. **Duplicar templates** com um clique ✅
4. **Deletar templates** com confirmação ✅
5. **Exportar PDF** com estrutura completa ✅

**Pronto para production!** 🎉
