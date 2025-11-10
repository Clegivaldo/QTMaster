# 📋 Guia de Teste: Sistema de Salvar e Exportar Templates

## ✅ Pré-requisitos

1. **Backend rodando** em `http://localhost:3000`
   ```bash
   cd backend
   npm start
   ```

2. **Frontend rodando** em desenvolvimento
   ```bash
   cd frontend
   npm run dev
   ```

3. **Node.js instalado** (para rodar testes de diagnóstico)

---

## 🧪 Teste 1: Salvar Novo Template

### Via Interface Gráfica

1. Navegue para **http://localhost:5173** (frontend)
2. Clique em "Novo Projeto" ou vá para `/editor-layout`
3. Adicione alguns elementos:
   - Texto
   - Retângulo
   - Imagem (opcional)
4. Clique no botão verde **"Salvar"** (canto superior direito)
5. Modal "Salvar Template" aparece
6. Preencha:
   - **Nome**: "Meu Template Teste"
   - **Descrição**: "Template de teste para validação"
   - **Categoria**: "Teste"
7. Clique **"Salvar"**

### ✅ Resultado Esperado

- Modal fecha com mensagem de sucesso
- Sem erro 404 no console
- No console do backend:
  ```
  POST /api/editor-templates - 201 Created
  Template criado com ID: template-xxx... → ID-persistido-123
  ```

---

## 🧪 Teste 2: Exportar Novo Template (SEM SALVAR)

### Via Interface Gráfica

1. Crie um novo template (sem salvar)
2. Adicione elementos
3. Clique no botão roxo **"Exportar"** (canto superior direito)
4. Modal "Exportar Template" aparece
5. Escolha formato: **JSON**
6. Clique **"Exportar"**

### ✅ Resultado Esperado

- Arquivo JSON é baixado
- Sem erro 404 no console
- Arquivo contém estrutura do template
- Console backend mostra:
  ```
  POST /api/editor-templates/export - 200 OK
  Arquivo gerado: template_teste_2025-11-10T11-39-06-123.json
  ```

---

## 🧪 Teste 3: Exportar em Todos os Formatos

### Via Interface Gráfica

Repita o Teste 2 para cada formato:

#### JSON
1. Clique "Exportar"
2. Formato: **JSON**
3. Clique "Exportar"
4. ✅ Verifica: Arquivo com extensão `.json`

#### PDF
1. Clique "Exportar"
2. Formato: **PDF**
3. Clique "Exportar"
4. ✅ Verifica: Arquivo com extensão `.pdf`

#### PNG
1. Clique "Exportar"
2. Formato: **PNG**
3. Clique "Exportar"
4. ✅ Verifica: Arquivo com extensão `.png`

#### HTML
1. Clique "Exportar"
2. Formato: **HTML**
3. Clique "Exportar"
4. ✅ Verifica: Arquivo com extensão `.html`

---

## 🧪 Teste 4: Salvar + Exportar (Template Persistido)

### Via Interface Gráfica

1. Crie novo template
2. Adicione elementos
3. Clique **"Salvar"**
   - ✅ Template agora tem ID persistido
4. Edite os elementos
5. Clique **"Exportar"** → Formato **JSON**
6. ✅ Arquivo é baixado com sucesso

### Verificar no Console Backend
```
POST /api/editor-templates - 201 Created
PUT /api/editor-templates/template-xxx... - 200 OK
POST /api/editor-templates/export - 200 OK
```

---

## 🧪 Teste 5: Carregar Template Existente

### Via Interface Gráfica

1. Vá para `/editor-layout/:templateId` (substitua templateId com um ID real)
   - Exemplo: `/editor-layout/existing-template-123`

### ✅ Resultado Esperado

- Template carrega automaticamente
- Elementos aparecem no canvas
- Sem erro 404 no console

---

## 🚀 Teste Automatizado (Opcional)

### Executar teste completo:

```bash
node test-save-export-complete.js
```

### Output esperado:

```
🧪 Teste Completo: Salvar e Exportar Templates

▶ 1. POST - Criar novo template...
✅ 1. POST - Criar novo template
   ✓ Template criado com ID: template-abc123...

▶ 2. PUT - Atualizar template...
✅ 2. PUT - Atualizar template
   ✓ Template atualizado com sucesso

▶ 3. POST /export - Exportar novo template como JSON...
✅ 3. POST /export - Exportar novo template como JSON
   ✓ Exportado: Template_Novo_JSON_2025-11-10T11-39-06.json

▶ 4. POST /export - Exportar novo template como PDF...
✅ 4. POST /export - Exportar novo template como PDF
   ✓ Exportado: Template_Novo_PDF_2025-11-10T11-39-07.pdf

▶ 5. POST /export - Exportar novo template como PNG...
✅ 5. POST /export - Exportar novo template como PNG
   ✓ Exportado: Template_Novo_PNG_2025-11-10T11-39-08.png

▶ 6. POST /export - Exportar novo template como HTML...
✅ 6. POST /export - Exportar novo template como HTML
   ✓ Exportado: Template_Novo_HTML_2025-11-10T11-39-09.html

▶ 7. POST /export - Exportar template persistido como JSON...
✅ 7. POST /export - Exportar template persistido como JSON
   ✓ Exportado template persistido: Template_Atualizado_2025-11-10T11-39-10.json

============================================================
✅ Testes passaram: 7
❌ Testes falharam: 0
============================================================

🎉 TODOS OS TESTES PASSARAM!
```

---

## 🔍 Troubleshooting

### Erro: "Route not found: POST /api/editor-templates/export"

**Solução:**
- Certifique-se de que fez `git pull` para atualizar o código
- Reinicie o backend: `npm start`
- Limpe cache do navegador: `Ctrl+Shift+Delete`

### Erro: "Template não encontrado" (404)

**Causas possíveis:**
1. Backend foi reiniciado (templates em memória foram perdidos)
   - **Solução**: Salve o template novamente
2. ID incorreto na URL
   - **Solução**: Use ID do último template salvo

### Erro: "Resposta vazia do servidor"

**Solução:**
- Verifique se diretório `exports` existe em `backend/`
- Se não existir, crie: `mkdir backend/exports`

### Erro: "Arquivo não foi baixado"

**Solução:**
1. Verifique permissões de arquivo
2. Verifique se há espaço em disco
3. Tente novamente em outro navegador

---

## 📊 Checklist de Validação

- [ ] **Novo template criado com sucesso** (POST)
- [ ] **Template atualizado com sucesso** (PUT)
- [ ] **Novo template exportado em JSON** (sem salvar)
- [ ] **Novo template exportado em PDF** (sem salvar)
- [ ] **Novo template exportado em PNG** (sem salvar)
- [ ] **Novo template exportado em HTML** (sem salvar)
- [ ] **Template persistido exportado com sucesso**
- [ ] **Nenhum erro 404 no console**
- [ ] **Arquivos aparecem em pasta de downloads**

Se todos os itens estão marcados ✅, então o sistema está **100% FUNCIONAL**!

---

## 📝 Informações Úteis

### Diretórios Importantes

```
/backend/exports/          # Arquivos exportados
/frontend/downloads/       # Downloads do navegador
```

### Formatos Suportados

| Formato | Extensão | Uso |
|---------|----------|-----|
| JSON | .json | Importar/Exportar dados |
| PDF | .pdf | Impressão, Documentação |
| PNG | .png | Imagem, Compartilhamento |
| HTML | .html | Web, Visualização |

### Endpoints Disponíveis

```
POST   /api/editor-templates          # Criar novo template
GET    /api/editor-templates/:id      # Carregar template
PUT    /api/editor-templates/:id      # Atualizar template
DELETE /api/editor-templates/:id      # Deletar template
POST   /api/editor-templates/export   # Exportar (novo ou persistido)
```

---

## 🎯 Conclusão

Se todos os testes passarem, o sistema está pronto para:
- ✅ Salvar templates novos e persistidos
- ✅ Exportar em múltiplos formatos
- ✅ Carregar templates por URL
- ✅ Atualizar templates existentes
- ✅ Usar em produção!

Bom teste! 🚀
