# 🔧 Guia de Testes - Correções de Salvar Template

## Problemas Corrigidos

### 1. ✅ Erro 400 ao Salvar Template
**Antes:** `PUT /api/editor-templates/:id` retornava erro 400 com "Validation error"
**Causa:** Schema muito restritivo + bug de array vazio não ser atualizado
**Depois:** Template salva corretamente (201 ou 200 sem erros)

### 2. ✅ PDF Vazio com apenas "111111"
**Antes:** Exportação gerava PDF com apenas: "Conteúdo do template (resumo): { elements: 1 }"
**Causa:** Renderização mínima do PDF
**Depois:** PDF detalhado com:
- Título do template
- Data/hora de criação
- Contagem de elementos
- Informações de páginas
- Listagem dos elementos (primeiros 10)
- Metadados (categoria, versão, tags, datas)

### 3. ✅ Editor Aberto Vazio
**Antes:** Template carregava mas elementos não apareciam no editor
**Causa:** Bug em PUT update - arrays vazios não eram salvos no banco
**Depois:** Editor carrega com todos os elementos preservados

---

## 🧪 Procedimento de Teste

### Pré-requisitos
- Backend rodando: `npm start` na pasta `/backend`
- Frontend rodando: `npm run dev` na pasta `/frontend`
- Estar logado na aplicação

### Teste 1: Criar e Salvar Template Novo

1. **Abrir Editor**
   - Clicar em "Novo Template" na página de Templates
   - Ou acessar `/editor-layout`

2. **Adicionar Elementos**
   - Arrastar elementos do painel esquerdo para o canvas
   - Ex: Adicionar texto, imagem, tabela, etc.
   - Mínimo: 1 elemento para testar

3. **Salvar Template**
   - Clicar em botão "Salvar" ou `Ctrl+S`
   - Preencher nome, descrição, categoria
   - Clicar "Salvar"
   
   **Resultado Esperado:**
   - ✅ Sem erro 400
   - ✅ Mensagem de sucesso
   - ✅ Template recebe ID do backend (não começa com "template-")
   - ✅ URL muda para `/editor-layout/{id}`

### Teste 2: Visualizar Template Exportado (PDF)

1. **Ir para página Templates**
   - Navegar para `/templates`
   - Ver template criado na lista

2. **Clicar em "Ver" (olho)**
   - Abre aba nova com o PDF exportado
   
   **Resultado Esperado:**
   - ✅ PDF abre sem erros
   - ✅ Primeiro texto mostra o nome do template
   - ✅ Segunda seção mostra "Export gerado em: DATA"
   - ✅ Seção "Elementos do Template" com:
     - Quantidade de elementos
     - Detalhes dos elementos (tipo e conteúdo)
   - ✅ Metadados no final (categoria, versão, tags)

### Teste 3: Editar Template Existente

1. **Ir para página Templates**
   - Navegar para `/templates`

2. **Clicar em "Editar" (lápis)**
   - Abre o editor com template carregado
   
   **Resultado Esperado:**
   - ✅ Editor carrega em segundos
   - ✅ Todos os elementos aparecem no canvas
   - ✅ Elementos aparecem na mesma posição anterior
   - ✅ Propriedades dos elementos estão preservadas

3. **Fazer pequena mudança**
   - Modificar posição de um elemento ou texto
   - Clicar "Salvar"
   
   **Resultado Esperado:**
   - ✅ Salva sem erro 400
   - ✅ Versão do template incrementa (+1)
   - ✅ Data de atualização muda

### Teste 4: Verificar Dados Persistidos

1. **Abrir DevTools (F12)**
   - Abrir aba "Network"

2. **Salvar um template**
   - Observar requisição PUT

3. **Inspecionar Response**
   - Verificar se `data.template.elements` é um array (não objeto)
   - Verificar se `data.template.pages` existe
   - Exemplo de response correto:
   ```json
   {
     "success": true,
     "data": {
       "template": {
         "id": "abc123...",
         "name": "Meu Template",
         "elements": [
           {
             "id": "elem-1",
             "type": "text",
             "content": "...",
             "position": { "x": 10, "y": 20 },
             "size": { "width": 100, "height": 50 }
           }
         ],
         "globalStyles": { ... },
         "pages": [ ... ]
       }
     }
   }
   ```

---

## 📋 Checklist de Validação

- [ ] Salvar template novo retorna 201 (não 400)
- [ ] Template persiste com ID do banco
- [ ] PDF exportado mostra detalhes dos elementos
- [ ] Editor carrega template com todos os elementos
- [ ] Editar e salvar template atualiza com sucesso
- [ ] Elements array preserva valores vazios
- [ ] Versão do template incrementa ao atualizar
- [ ] Múltiplas páginas funcionam corretamente (se aplicável)

---

## 🐛 Se Encontrar Problemas

### Ainda dá erro 400 ao salvar
**Verificar:**
- Console do backend tem mensagens de erro?
- Qual é a mensagem de validação? (checar Network > Response)
- O template tem pelo menos 1 elemento?

**Solução:**
- Adicionar elemento antes de salvar
- Verificar console do backend para detalhes

### PDF ainda aparece vazio
**Verificar:**
- O template foi salvo com sucesso?
- Template tem elementos no editor?

**Solução:**
- Fazer GET /api/editor-templates/:id no Postman
- Verificar se response traz `elements` array

### Editor abre vazio mas lista mostra template
**Verificar:**
- Abrir DevTools, aba Network
- Procurar por GET /api/editor-templates/:id
- Ver se response tem elements

**Solução:**
- Se response não tem elements: problema de fetch do backend
- Se response tem elements: problema de renderização no frontend

---

## 📝 Detalhes Técnicos

### Mudanças no Backend

**Arquivo:** `backend/src/controllers/editorTemplateController.ts`

#### 1. Import Prisma
```typescript
// Corrigido:
import { prisma } from '../lib/prisma.js';
```

#### 2. Schema Flexível
```typescript
// elements aceita qualquer estrutura
elements: z.array(z.any()).optional().default([])
```

#### 3. Update com !== undefined
```typescript
// Preserva arrays vazios
elements: updateData.elements !== undefined ? updateData.elements : existingTemplate.elements
```

#### 4. Create com []
```typescript
// Elements é array, não objeto
elements: (templateData.elements || []) as any
```

#### 5. PDF com Detalhes
```typescript
// Renderiza estrutura completa do template
doc.fontSize(11).text(`Total de elementos: ${elements.length}`);
elements.slice(0, 10).forEach((el, idx) => {
  doc.fontSize(8).text(`${idx + 1}. [${el.type}] ${el.content}`);
});
```

---

## 📞 Suporte

Se os testes passarem em todos os pontos, as correções estão funcionando! 🎉

Se algum teste falhar, verifique:
1. Backend compilou sem erros? (`npm run build` ou `npx tsc --noEmit`)
2. Token JWT está válido?
3. Banco de dados está acessível?
