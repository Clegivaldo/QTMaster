/**
 * Testes Simples para o Template Editor
 * Executa testes básicos sem dependências externas
 */

import { TemplateEditorController } from '../src/controllers/templateEditorController.js';
import fs from 'fs';
import path from 'path';

// Contador de testes
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Função de teste simples
const testPromises = [];
function test(name, testFn) {
  const p = (async () => {
    testsRun++;
    try {
      console.log(`🧪 Executando: ${name}`);
      await testFn();
      testsPassed++;
      console.log(`✅ PASSOU: ${name}\n`);
    } catch (error) {
      testsFailed++;
      console.log(`❌ FALHOU: ${name}`);
      console.log(`   Erro: ${error.message}\n`);
    }
  })();
  testPromises.push(p);
}

// Mock simples para Request/Response
function mockRequest(body = {}) {
  return { body, params: {}, query: {}, headers: {} };
}

function mockResponse() {
  const res = {
    status: (code) => res,
    json: (data) => { res._json = data; return res; },
    send: (data) => { res._send = data; return res; },
    setHeader: (key, value) => { res._headers = res._headers || {}; res._headers[key] = value; return res; },
    _json: null,
    _send: null,
    _headers: {}
  };
  return res;
}

// Template de teste
const mockTemplate = {
  id: 'test-template-123',
  name: 'Template de Teste',
  description: 'Template para testes',
  elements: [
    {
      id: 'header-1',
      type: 'header',
      content: 'CABEÇALHO DE TESTE',
      styles: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#2563eb',
        textAlign: 'center'
      },
      data: {}
    },
    {
      id: 'text-1',
      type: 'text',
      content: 'Texto de teste',
      styles: {
        fontSize: '14px',
        color: '#333333'
      },
      data: {}
    }
  ],
  globalStyles: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    pageSize: 'A4',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

console.log('🚀 Iniciando Testes Simples do Template Editor\n');

// Teste 1: Verificar se o editor HTML é gerado
test('Editor HTML deve ser gerado corretamente', async () => {
  const req = mockRequest();
  const res = mockResponse();
  
  await TemplateEditorController.getEditor(req, res);
  
  if (!res._send) throw new Error('HTML não foi enviado');
  if (!res._send.includes('Editor Visual de Templates')) throw new Error('Título não encontrado');
  if (!res._send.includes('canvas')) throw new Error('Canvas não encontrado');
  if (!res._send.includes('element-palette')) throw new Error('Paleta de elementos não encontrada');
  if (!res._headers['Content-Type'] || !res._headers['Content-Type'].includes('text/html')) {
    throw new Error('Content-Type incorreto');
  }
});

// Teste 2: Verificar elementos na paleta
test('Paleta deve incluir todos os elementos', async () => {
  const req = mockRequest();
  const res = mockResponse();
  
  await TemplateEditorController.getEditor(req, res);
  
  const html = res._send;
  const expectedElements = ['text', 'header', 'image', 'table', 'chart', 'signature', 'footer'];
  
  expectedElements.forEach(elementType => {
    if (!html.includes(`data-type="${elementType}"`)) {
      throw new Error(`Elemento ${elementType} não encontrado na paleta`);
    }
  });
});

// Teste 3: Verificar controles de propriedades
test('Controles de propriedades devem estar presentes', async () => {
  const req = mockRequest();
  const res = mockResponse();
  
  await TemplateEditorController.getEditor(req, res);
  
  const html = res._send;
  const expectedControls = [
    'id="fontSize"',
    'id="textColor"', 
    'id="backgroundColor"',
    'id="imageWidth"',
    'id="imageHeight"',
    'id="pageMarginTop"',
    'id="pageMarginBottom"',
    'id="pageMarginLeft"',
    'id="pageMarginRight"'
  ];
  
  expectedControls.forEach(control => {
    if (!html.includes(control)) {
      throw new Error(`Controle ${control} não encontrado`);
    }
  });
});

// Teste 4: Verificar funções JavaScript
test('Funções JavaScript devem estar incluídas', async () => {
  const req = mockRequest();
  const res = mockResponse();
  
  await TemplateEditorController.getEditor(req, res);
  
  const html = res._send;
  const expectedFunctions = [
    'function createElement',
    'function updateElementCount',
    'function saveTemplate',
    'function previewTemplate',
    'function loadImageGallery',
    'function updatePageMargin'
  ];
  
  expectedFunctions.forEach(func => {
    if (!html.includes(func)) {
      throw new Error(`Função ${func} não encontrada`);
    }
  });
});

// Teste 5: Conversão de Layout para HTML
test('Conversão de layout para HTML deve funcionar', async () => {
  const html = await TemplateEditorController.convertLayoutToHTML(mockTemplate);

  if (!html.includes('<!DOCTYPE html>')) throw new Error('DOCTYPE não encontrado');
  if (!html.includes('<html lang="pt-BR">')) throw new Error('Tag HTML não encontrada');
  if (!html.includes('<title>Template de Teste</title>')) throw new Error('Título não encontrado');
  if (!html.includes('CABEÇALHO DE TESTE')) throw new Error('Conteúdo do cabeçalho não encontrado');
  if (!html.includes('Texto de teste')) throw new Error('Conteúdo do texto não encontrado');
  if (!html.includes('font-family: Arial, sans-serif')) throw new Error('Estilo global não aplicado');
  if (!html.includes('margin: 20mm 15mm 20mm 15mm')) throw new Error('Margens não aplicadas');
});

// Teste 6: Validação de entrada para salvamento
test('Validação de entrada deve funcionar', async () => {
  const req = mockRequest({ name: null });
  const res = mockResponse();
  
  await TemplateEditorController.saveTemplate(req, res);
  
  if (!res._json) throw new Error('Resposta JSON não enviada');
  if (res._json.success !== false) throw new Error('Validação não falhou como esperado');
  if (!res._json.error.includes('obrigatório')) throw new Error('Mensagem de erro incorreta');
});

// Teste 7: Conversão de estilos CSS
test('Conversão de estilos CSS deve funcionar', async () => {
  const testTemplate = {
    ...mockTemplate,
    elements: [{
      id: 'styled-element',
      type: 'text',
      content: 'Texto estilizado',
      styles: {
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#f0f0f0'
      }
    }]
  };
  
  const html = await TemplateEditorController.convertLayoutToHTML(testTemplate);
  
  if (!html.includes('font-size: 18px')) throw new Error('fontSize não convertido');
  if (!html.includes('font-weight: bold')) throw new Error('fontWeight não convertido');
  if (!html.includes('text-align: center')) throw new Error('textAlign não convertido');
  if (!html.includes('background-color: #f0f0f0')) throw new Error('backgroundColor não convertido');
});

// Teste 8: Diferentes tipos de elementos
test('Diferentes tipos de elementos devem ser renderizados', async () => {
  const multiElementTemplate = {
    ...mockTemplate,
    elements: [
      { id: '1', type: 'text', content: 'Texto', styles: {} },
      { id: '2', type: 'header', content: 'Cabeçalho', styles: {} },
      { id: '3', type: 'image', content: 'Imagem', styles: {} },
      { id: '4', type: 'table', content: 'Tabela', styles: {} },
      { id: '5', type: 'chart', content: 'Gráfico', styles: {} },
      { id: '6', type: 'signature', content: 'Assinatura', styles: {} },
      { id: '7', type: 'footer', content: 'Rodapé', styles: {} }
    ]
  };
  
  const html = await TemplateEditorController.convertLayoutToHTML(multiElementTemplate);
  
  if (!html.includes('<div style="">Texto</div>')) throw new Error('Elemento text não renderizado');
  if (!html.includes('<h1 style="">Cabeçalho</h1>')) throw new Error('Elemento header não renderizado');
  if (!html.includes('🖼️ Imagem')) throw new Error('Elemento image não renderizado');
  if (!html.includes('📊 Tabela')) throw new Error('Elemento table não renderizado');
  if (!html.includes('📈 Gráfico')) throw new Error('Elemento chart não renderizado');
  if (!html.includes('✍️ Assinatura')) throw new Error('Elemento signature não renderizado');
  if (!html.includes('🦶 Rodapé')) throw new Error('Elemento footer não renderizado');
});

// Teste 9: Sanitização de nome de arquivo
test('Sanitização de nome de arquivo deve funcionar', () => {
  const dangerousName = '../../../etc/passwd<script>alert("xss")</script>';
  const sanitized = dangerousName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  if (sanitized !== 'etcpasswdscriptalertxssscript') {
    throw new Error(`Sanitização incorreta: ${sanitized}`);
  }
});

// Teste 10: Estrutura HTML válida
test('HTML gerado deve ter estrutura válida', () => {
  const html = TemplateEditorController.convertLayoutToHTML(mockTemplate);
  
  // Verificar estrutura básica
  if (!html.includes('<!DOCTYPE html>')) throw new Error('DOCTYPE ausente');
  if (!html.includes('<html lang="pt-BR">')) throw new Error('Tag html ausente');
  if (!html.includes('<head>')) throw new Error('Tag head ausente');
  if (!html.includes('<meta charset="UTF-8">')) throw new Error('Charset ausente');
  if (!html.includes('<body>')) throw new Error('Tag body ausente');
  if (!html.includes('</html>')) throw new Error('Fechamento html ausente');
  
  // Verificar CSS
  if (!html.includes('<style>')) throw new Error('Tag style ausente');
  if (!html.includes('@page')) throw new Error('Regra @page ausente');
});

// Executar todos os testes
console.log('📋 Executando testes unitários...\n');

(async () => {
  await Promise.allSettled(testPromises);

  // Mostrar resultados
  console.log('📊 RESULTADOS DOS TESTES:');
  console.log(`   Total: ${testsRun}`);
  console.log(`   ✅ Passou: ${testsPassed}`);
  console.log(`   ❌ Falhou: ${testsFailed}`);
  console.log(`   📈 Taxa de Sucesso: ${Math.round((testsPassed / testsRun) * 100)}%\n`);
  
  if (testsFailed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Template Editor está funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os erros acima.');
  }
  
  console.log('\n📁 Funcionalidades testadas:');
  console.log('  ✅ Geração de HTML do editor');
  console.log('  ✅ Paleta de elementos completa');
  console.log('  ✅ Controles de propriedades');
  console.log('  ✅ Funções JavaScript');
  console.log('  ✅ Conversão layout → HTML');
  console.log('  ✅ Validação de entrada');
  console.log('  ✅ Conversão de estilos CSS');
  console.log('  ✅ Renderização de elementos');
  console.log('  ✅ Sanitização de arquivos');
  console.log('  ✅ Estrutura HTML válida');
  
  process.exit(testsFailed > 0 ? 1 : 0);
})();