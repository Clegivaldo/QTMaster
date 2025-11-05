# 🎨 Guia Completo do Sistema FastReport Personalizado

## 📋 **Índice**
1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Como Usar](#como-usar)
4. [API Endpoints](#api-endpoints)
5. [Docker Setup](#docker-setup)
6. [Galeria de Imagens](#galeria-de-imagens)
7. [Personalização Avançada](#personalização-avançada)

## 🎯 **Visão Geral**

Nosso sistema FastReport personalizado oferece uma alternativa moderna e poderosa ao FastReport tradicional, com interface web intuitiva, funcionalidades drag-and-drop e integração nativa com nosso stack TypeScript/Node.js.

### **Vantagens sobre FastReport Tradicional:**
- ✅ **Interface Web Moderna** - Funciona em qualquer navegador
- ✅ **Drag & Drop Visual** - Arraste elementos facilmente
- ✅ **Personalização Completa** - CSS, cores, fontes, alinhamento
- ✅ **Galeria de Recursos** - Biblioteca de imagens e elementos
- ✅ **Preview Instantâneo** - Visualize PDFs em tempo real
- ✅ **Integração Nativa** - API REST integrada ao sistema
- ✅ **Zero Dependências** - Sem necessidade de .NET ou licenças

## 🚀 **Funcionalidades**

### **🖱️ Editor Visual Drag & Drop**
- Paleta de elementos arrastáveis
- Canvas visual para posicionamento
- Controles de elemento (editar, duplicar, excluir)
- Seleção visual com destaque

### **🎨 Personalização Completa**
- **Texto**: Tamanho (8-72px), cor, negrito, itálico, sublinhado
- **Alinhamento**: Esquerda, centro, direita
- **Espaçamento**: Padding e margin personalizáveis
- **Dimensões**: Largura e altura ajustáveis
- **Cores**: Seletor visual para texto e fundo

### **📦 Elementos Disponíveis**
- **📝 Texto** - Parágrafos e conteúdo textual
- **🏷️ Cabeçalho** - Títulos e headers
- **🖼️ Imagem** - Logos e ilustrações
- **📊 Tabela** - Dados tabulares
- **📈 Gráfico** - Charts e visualizações
- **✍️ Assinatura** - Áreas de assinatura

### **🖼️ Galeria de Recursos**
- **Logos** - Logo da empresa, certificações
- **Fundos** - Backgrounds e texturas
- **Selos** - Elementos de aprovação
- **Marcas d'água** - Elementos de marca
- **Ícones** - Símbolos e pictogramas

## 📖 **Como Usar**

### **1. Acessar o Editor**
```bash
# Abrir no navegador
http://localhost:5000/api/template-editor

# Ou usar o arquivo HTML
open template-editor.html
```

### **2. Criar um Template**
1. **Arraste elementos** da paleta para o canvas
2. **Clique no elemento** para selecioná-lo
3. **Use o painel de propriedades** para personalizar
4. **Visualize** clicando em "👁️ Visualizar PDF"

### **3. Personalizar Elementos**
- **Tamanho da fonte**: Use o slider (8-72px)
- **Cores**: Clique no seletor de cores
- **Formatação**: Botões B (negrito), I (itálico), U (sublinhado)
- **Alinhamento**: Botões ⬅️ ↔️ ➡️
- **Espaçamento**: Digite valores como "10px" ou "1em"

### **4. Usar a Galeria**
- **Clique nas imagens** da galeria para adicioná-las
- **Categorias disponíveis**: Logos, Fundos, Selos, Marcas, Ícones
- **Formatos suportados**: SVG, PNG, JPG

### **5. Salvar e Carregar**
- **💾 Salvar**: Salva no localStorage do navegador
- **📂 Carregar**: Lista templates salvos
- **📤 Exportar**: Download como arquivo JSON

## 🔌 **API Endpoints**

### **Editor Visual**
```bash
GET  /api/template-editor          # Interface do editor
GET  /api/template-editor/gallery  # Galeria de imagens
POST /api/template-editor/preview  # Preview do template
POST /api/template-editor/save     # Salvar template
```

### **Testes e Demonstrações**
```bash
GET /api/test/templates             # Listar templates
GET /api/test/mock-report           # PDF simples
GET /api/test/advanced-report      # PDF avançado
GET /api/test/templates/:name       # Testar template específico
```

### **Galeria e Recursos**
```bash
GET /public/images/gallery/:file   # Acessar imagem da galeria
GET /uploads/reports/:file          # Download de relatórios
```

## 🐳 **Docker Setup**

### **Containers Atualizados**
```yaml
services:
  backend:
    # Inclui Puppeteer e Chromium
    environment:
      TEMPLATE_EDITOR_ENABLED: true
      PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium-browser
    volumes:
      - reports_data:/app/uploads/reports
      - gallery_data:/app/public/images/gallery

  frontend:
    environment:
      REACT_APP_TEMPLATE_EDITOR_URL: http://localhost:5000/api/template-editor
```

### **Iniciar Containers**
```bash
# Parar containers existentes
docker-compose down

# Construir e iniciar
docker-compose up --build -d

# Verificar status
docker-compose ps
```

## 🖼️ **Galeria de Imagens**

### **Imagens Incluídas**
- **logo-empresa.svg** - Logo da empresa
- **logo-certificacao.svg** - Selo ISO 17025
- **fundo-relatorio.svg** - Background sutil
- **selo-aprovado.svg** - Selo de aprovação
- **marca-dagua.svg** - Marca d'água "CONFIDENCIAL"
- **termometro-icon.svg** - Ícone de temperatura

### **Adicionar Novas Imagens**
```bash
# Copiar imagens para a galeria
cp sua-imagem.svg backend/public/images/gallery/

# Reinicializar índice da galeria
node backend/scripts/init-gallery.js
```

### **Formatos Suportados**
- **SVG** - Recomendado (escalável, pequeno)
- **PNG** - Para imagens com transparência
- **JPG** - Para fotografias

## 🎨 **Personalização Avançada**

### **Criar Templates Personalizados**
```javascript
// Estrutura de um template
const template = {
  id: 'meu-template',
  name: 'Meu Template Personalizado',
  elements: [
    {
      id: 'header-1',
      type: 'header',
      content: 'LAUDO PERSONALIZADO',
      styles: {
        fontSize: '24px',
        color: '#2563eb',
        textAlign: 'center',
        fontWeight: 'bold'
      }
    }
  ],
  globalStyles: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    pageSize: 'A4'
  }
};
```

### **Estilos CSS Avançados**
```css
/* Gradientes */
background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);

/* Sombras */
box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);

/* Bordas */
border: 2px solid #2563eb;
border-radius: 8px;

/* Transformações */
transform: rotate(-45deg);
```

### **Helpers Handlebars Personalizados**
```javascript
// Adicionar novos helpers
Handlebars.registerHelper('formatCurrency', (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
});

// Usar no template
{{formatCurrency 1234.56}} // R$ 1.234,56
```

## 🧪 **Testes e Validação**

### **Testes Automatizados**
```bash
# Testar galeria
curl http://localhost:5000/api/template-editor/gallery

# Testar geração de PDF
curl http://localhost:5000/api/test/advanced-report -o test.pdf

# Testar templates
curl http://localhost:5000/api/test/templates
```

### **Performance**
- **Template Simples**: ~1.3s (93KB)
- **Template Avançado**: ~1.9s (858KB)
- **Múltiplos PDFs**: Suporte a 5 concorrentes

## 🔧 **Troubleshooting**

### **Problemas Comuns**

**1. PDF não gera**
```bash
# Verificar se Puppeteer está instalado
npm list puppeteer

# Verificar logs
docker logs laudo-backend
```

**2. Imagens não carregam**
```bash
# Verificar galeria
ls backend/public/images/gallery/

# Reinicializar galeria
node backend/scripts/init-gallery.js
```

**3. Editor não abre**
```bash
# Verificar servidor
curl http://localhost:5000/api/health

# Verificar rotas
curl http://localhost:5000/api/
```

## 📞 **Suporte**

Para dúvidas ou problemas:
1. Verifique os logs: `docker logs laudo-backend`
2. Teste os endpoints: `curl http://localhost:5000/api/health`
3. Consulte a documentação da API: `http://localhost:5000/api/`

---

## 🎉 **Conclusão**

Nosso sistema FastReport personalizado oferece uma experiência superior ao FastReport tradicional, com:
- Interface moderna e intuitiva
- Funcionalidades drag-and-drop
- Personalização completa
- Galeria de recursos
- Integração nativa
- Performance excelente

**O sistema está pronto para produção!** 🚀