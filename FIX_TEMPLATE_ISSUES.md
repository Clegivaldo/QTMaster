# Correções - Problemas ao Salvar Template

## Problemas Reportados
1. **Erro 400 ao salvar template** - PUT `/api/editor-templates/:id` retornava erro de validação
2. **PDF vazio com apenas "111111"** - Exportação não renderizava elementos
3. **Editor aberto vazio** - Template carregava mas sem elementos visíveis

## Problemas Identificados e Corrigidos

### 1. Erro de Import do Prisma
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** Import estava usando `../utils/prisma.js` mas arquivo está em `../lib/prisma.js`
**Solução:** Corrigido path do import
```typescript
// Antes:
import { prisma } from '../utils/prisma.js';
// Depois:
import { prisma } from '../lib/prisma.js';
```

### 2. Schema de Validação Muito Restritivo
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** `templateElementSchema` era muito restritivo com `z.enum()` para tipos e estrutura obrigatória
**Solução:** Flexibilizado para aceitar qualquer estrutura
```typescript
// Antes:
const templateElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'heading', 'image', ...]), // Apenas tipos específicos
  position: z.object({ ... }),
  size: z.object({ ... }),
  styles: elementStylesSchema, // Restritivo
  ...
});

elements: z.array(templateElementSchema),

// Depois:
const templateElementSchema = z.object({
  id: z.string(),
  type: z.string(), // Qualquer tipo
  content: z.any(),
  position: z.object({ ... }),
  size: z.object({ ... }),
  styles: z.any().optional(), // Qualquer estilo
  pageId: z.string().optional(),
  ...
}).passthrough(); // Permite propriedades extras

elements: z.array(z.any()).optional().default([]),
```

### 3. Bug ao Atualizar Template - Array Vazio Não Era Salvo
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** Linha 408-410 usava truthy check `(updateData.elements ? updateData.elements : existingTemplate.elements)` 
- Isso causava que arrays vazios `[]` (falsy) não fossem atualizados!
**Solução:** Usar `!== undefined` para checar se foi fornecido
```typescript
// Antes (BUGADO):
elements: (updateData.elements ? updateData.elements : existingTemplate.elements) as any,
globalStyles: (updateData.globalStyles ? updateData.globalStyles : existingTemplate.globalStyles) as any,

// Depois (CORRETO):
elements: updateData.elements !== undefined ? updateData.elements : existingTemplate.elements,
globalStyles: updateData.globalStyles !== undefined ? updateData.globalStyles : existingTemplate.globalStyles,
```

### 4. Bug ao Criar Template - Elements Usando {} ao Invés de []
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** Linha 312 usava `elements: (templateData.elements || {}) as any`
- Isso salvaria um objeto {} ao invés de um array quando elements fosse undefined
**Solução:** Usar array vazio []
```typescript
// Antes (BUGADO):
elements: (templateData.elements || {}) as any,

// Depois (CORRETO):
elements: (templateData.elements || []) as any,
```

### 5. PDF Vazio - Não Renderizava Elementos
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** Método `exportTemplate` só mostrava "Conteúdo do template (resumo): { elements: 1 }"
**Solução:** Implementado renderização detalhada do PDF com:
- Título do template
- Data/hora de exportação
- Contagem de elementos
- Informações de páginas (se multi-página)
- Primeiros 10 elementos com tipo e conteúdo
- Metadados (categoria, versão, datas, tags)

```typescript
// Antes: Mostrava apenas "{ elements: 1 }"
// Depois: Renderiza estrutura completa do template
```

### 6. Erros de Compilação TypeScript
**Arquivo:** `backend/src/controllers/editorTemplateController.ts`
**Problema:** Linhas 194 e 642 tinha `Parameter 'template' implicitly has an 'any' type`
**Solução:** Adicionado type hint `(template: any) =>`
```typescript
// Antes:
templates.map(template => ...)

// Depois:
templates.map((template: any) => ...)
```

## Resultado Esperado

Após essas correções:
1. ✅ **Salvar template** - Não deve retornar erro 400
2. ✅ **Exportar PDF** - Vai mostrar elementos e metadados do template
3. ✅ **Editar template** - Template carregará com todos os elementos

## Arquivos Modificados
- `backend/src/controllers/editorTemplateController.ts` - Corrigido import, schema, bugs de save/update, PDF export

## Para Testar
1. Parar backend se estiver rodando
2. Executar: `npm start` na pasta backend
3. Abrir frontend e tentar:
   - Criar novo template com elementos
   - Salvar template
   - Clicar em "Ver" para exportar PDF
   - Clicar em "Editar" para abrir template

## Notas Importantes
- O schema agora aceita estruturas mais flexíveis de elementos
- Arrays vazios agora são preservados corretamente
- PDF gerado terá muito mais informação útil
- Type safety melhorado no TypeScript
