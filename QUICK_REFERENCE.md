# GUIA DE REFERÊNCIA RÁPIDA - SISTEMA DE TEMPLATES

## 🚀 Como Rodar o Sistema

### Backend
```bash
cd backend
npx tsx src/server.ts
# Rodará em http://localhost:5000
```

### Frontend
```bash
cd frontend
npm run dev
# Rodará em http://localhost:3000
```

---

## 📦 Pacotes Instalados Nesta Sessão

```bash
# Frontend
npm install html2pdf.js --save
```

---

## 🏗️ Arquitetura de Componentes

### Templates Page (`frontend/src/pages/Templates.tsx`)
```
Templates
├── Template List
│   ├── Template Card
│   │   ├── Botão "Ver" → TemplatePreviewModal
│   │   ├── Botão "Editar" → EditorLayout
│   │   ├── Botão "Duplicar" → ConfirmationModal (azul)
│   │   └── Botão "Deletar" → ConfirmationModal (vermelho)
└── Modals
    ├── ConfirmationModal (Delete)
    ├── ConfirmationModal (Duplicate)
    └── TemplatePreviewModal
        └── TemplateVisualRenderer
            └── Download PDF
```

---

## 🎨 Componentes Principais

### 1. ConfirmationModal
**Arquivo:** `frontend/src/components/Modals/ConfirmationModal.tsx`

**Props:**
```typescript
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isDangerous?: boolean; // Red theme
  icon?: 'alert' | 'info' | 'warning' | 'success';
}
```

**Uso:**
```tsx
<ConfirmationModal
  isOpen={modal.isOpen}
  title="Deletar Template"
  message="Tem certeza?"
  onConfirm={handleDelete}
  onCancel={handleCancel}
  isDangerous={true}
  isLoading={isDeleting}
/>
```

### 2. TemplateVisualRenderer
**Arquivo:** `frontend/src/components/TemplatePreview/TemplateVisualRenderer.tsx`

**Props:**
```typescript
interface TemplateVisualRendererProps {
  template: EditorTemplate;
  onExport?: (status: 'success' | 'error', message?: string) => void;
}
```

**Features:**
- Renderiza template em layout A4 (210mm x 297mm)
- Suporta múltiplos tipos de elementos
- Export para PDF com html2pdf.js
- Estilos print-friendly

**Tipos de Elementos Suportados:**
- `text` → Div
- `heading` → h2
- `paragraph` → p
- `image` → img
- `rectangle` → Div com fundo
- `circle` → Div circular
- `line` → Div linear
- `table` → table HTML

### 3. TemplatePreviewModal
**Arquivo:** `frontend/src/components/Modals/TemplatePreviewModal.tsx`

**Props:**
```typescript
interface TemplatePreviewModalProps {
  isOpen: boolean;
  template: EditorTemplate | null;
  onClose: () => void;
}
```

---

## 🔧 Endpoints da API

### Template Operations

| Método | Endpoint | Autenticado | Descrição |
|--------|----------|-------------|-----------|
| GET | `/api/editor-templates` | ✅ | Listar templates |
| GET | `/api/editor-templates/:id` | ✅ | Obter template |
| POST | `/api/editor-templates` | ✅ | Criar template |
| PUT | `/api/editor-templates/:id` | ✅ | Atualizar template |
| DELETE | `/api/editor-templates/:id` | ✅ | Deletar template |
| POST | `/api/editor-templates/:id/duplicate` | ✅ | Duplicar template |
| POST | `/api/editor-templates/:id/export` | ✅ | Exportar template |

### Schemas de Validação

**Create/Update:**
```typescript
{
  name: string (1-255 chars),
  description: string | null | undefined (max 500),
  category: string (default: 'default'),
  elements: Array<any> (default: []),
  globalStyles: any (default: {}),
  pageSettings: any (optional),
  tags: string[] (default: []),
  isPublic: boolean (default: false)
}
```

---

## 📋 Fluxos de Usuário

### Workflow Visualizar Template
```
1. Usuario em /templates
2. Clica "👁️ Ver"
3. previewTemplate() chamada
   - GET /api/editor-templates/:id
   - setPreviewModal({ isOpen: true, template: data })
4. TemplatePreviewModal renderiza
5. TemplateVisualRenderer exibe layout A4
6. Usuario pode:
   - Clicar "📥 Download PDF" → html2pdf exporta
   - Clicar "Fechar" → Modal fecha
```

### Workflow Deletar Template
```
1. Usuario clica "🗑️ Deletar"
2. deleteTemplate() chamada
   - setDeleteModal({ isOpen: true, template })
3. ConfirmationModal abre (vermelho, isDangerous=true)
4. Usuario escolhe:
   A. "Cancelar" → setDeleteModal({ isOpen: false })
   B. "Deletar" → handleConfirmDelete()
      - DELETE /api/editor-templates/:id
      - loadTemplates() para atualizar lista
```

### Workflow Duplicar Template
```
1. Usuario clica "📋 Duplicar"
2. duplicateTemplate() chamada
   - setDuplicateModal({ isOpen: true, template })
3. ConfirmationModal abre (azul, isDangerous=false)
4. Usuario escolhe:
   A. "Cancelar" → setDuplicateModal({ isOpen: false })
   B. "Duplicar" → handleConfirmDuplicate()
      - POST /api/editor-templates/:id/duplicate
      - loadTemplates() para atualizar lista
```

---

## 🐛 Debugging

### Backend Logs
- Server logs em console
- Audit logs em `/api/monitoring`
- PDF generation errors capturados

### Frontend Console
- Network requests com Axios
- Component state com React DevTools
- PDF export status

### Monitoramento
```
GET http://localhost:5000/api/monitoring/health
GET http://localhost:5000/api/monitoring
```

---

## 🚨 Erros Comuns e Soluções

### Erro: "Zod validation error: invalid_type"
**Causa:** Schema rejeitando tipo de dados
**Solução:** Verificar se campo aceita `nullable().optional()`

### Erro: "Port 5000 already in use"
**Causa:** Outro processo usando porta
**Solução:** 
```bash
Get-Process node | Stop-Process -Force
```

### PDF não baixa
**Causa:** html2pdf.js não instalado ou bloqueado
**Solução:**
```bash
npm install html2pdf.js --force
```

### Modal não aparece
**Causa:** Estado não atualizado ou import faltando
**Solução:** Verificar imports e hook `useState`

---

## 📈 Performance Tips

1. **Lazy load TemplateVisualRenderer** para múltiplos templates
2. **Cache templates list** com react-query ou SWR
3. **Optimize PDF export** reduzindo qualidade se necessário
4. **Pagination** para muitos templates (implementar no backend)

---

## 🔐 Segurança

- Todos endpoints exigem autenticação (Bearer token)
- Validação de permissões (só pode editar templates próprios)
- CORS configurado
- Rate limiting ativo

---

## 📱 Responsividade

- Modal templates responsivo
- Renderizador adapta para mobile
- Print styles otimizados
- Touch-friendly buttons (44px mínimo)

---

## 🎯 Checklist de Deploy

- [ ] Backend environment variables configuradas
- [ ] Database migrations executadas
- [ ] Redis conectado
- [ ] Frontend build otimizado
- [ ] CORS whitelist atualizado
- [ ] SSL certificado (produção)
- [ ] Monitoramento ativo
- [ ] Backups configurados

---

## 📞 Suporte e Contribuições

Para bugs ou features:
1. Reportar com contexto (logs, screenshot)
2. Incluir passos para reproduzir
3. Mencionar versão do Node.js e npm
4. Sugerir solução se possível

---

**Última Atualização:** 10 de Novembro, 2025
**Versão:** 1.0.0 Completo
