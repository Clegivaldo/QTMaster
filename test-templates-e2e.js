#!/usr/bin/env node

/**
 * Script de teste manual para validar o fluxo de salvar e exportar templates
 * 
 * Este script:
 * 1. Cria um novo template
 * 2. Testa o salvamento (POST -> novo template)
 * 3. Testa a atualização (PUT -> template existente)
 * 4. Testa a exportação
 * 5. Testa o carregamento
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/editor-templates';

// Variáveis globais para testes
let testTemplateId = null;
let testsPassed = 0;
let testsFailed = 0;

// Utilidade para fazer requests HTTP
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Template de teste
const createTestTemplate = () => ({
  name: `Template Test ${Date.now()}`,
  description: 'Template criado automaticamente para testes',
  category: 'test-automated',
  elements: [
    {
      id: 'elem-test-1',
      type: 'text',
      content: 'Test Content',
      position: { x: 10, y: 10 },
      size: { width: 100, height: 20 },
      styles: { color: '#000000' },
      locked: false,
      visible: true,
      zIndex: 1,
      pageId: 'page-1'
    }
  ],
  pages: [
    {
      id: 'page-1',
      name: 'Página 1',
      elements: [],
      pageSettings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: '#ffffff',
        showMargins: true
      },
      backgroundImage: null,
      header: null,
      footer: null
    }
  ],
  globalStyles: {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1.4
  },
  tags: ['test', 'automated'],
  isPublic: false
});

async function test(name, fn) {
  try {
    console.log(`\n▶ ${name}...`);
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Erro: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('🧪 Iniciando testes de Templates...\n');

  // Teste 1: Criar novo template (POST)
  await test('POST /api/editor-templates - Criar novo template', async () => {
    const templateData = createTestTemplate();
    const response = await makeRequest('POST', API_BASE, templateData);

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Status ${response.status} esperado 200-201. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.success) {
      throw new Error(`Resposta não sucesso: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.data?.template?.id) {
      throw new Error(`Nenhum ID de template retornado: ${JSON.stringify(response.data)}`);
    }

    testTemplateId = response.data.data.template.id;
    console.log(`  Template criado com ID: ${testTemplateId}`);
  });

  // Teste 2: Carregar template (GET)
  await test('GET /api/editor-templates/:id - Carregar template', async () => {
    if (!testTemplateId) {
      throw new Error('Nenhum ID de template para carregar');
    }

    const response = await makeRequest('GET', `${API_BASE}/${testTemplateId}`);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status} esperado 200. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.success) {
      throw new Error(`Resposta não sucesso: ${JSON.stringify(response.data)}`);
    }

    if (response.data.data?.template?.id !== testTemplateId) {
      throw new Error(`ID retornado ${response.data.data?.template?.id} não corresponde a ${testTemplateId}`);
    }

    console.log(`  Template carregado: ${response.data.data.template.name}`);
  });

  // Teste 3: Atualizar template (PUT)
  await test('PUT /api/editor-templates/:id - Atualizar template', async () => {
    if (!testTemplateId) {
      throw new Error('Nenhum ID de template para atualizar');
    }

    const updateData = {
      name: 'Template Atualizado Teste',
      description: 'Descrição atualizada',
      category: 'test-updated'
    };

    const response = await makeRequest('PUT', `${API_BASE}/${testTemplateId}`, updateData);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status} esperado 200. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.success) {
      throw new Error(`Resposta não sucesso: ${JSON.stringify(response.data)}`);
    }

    if (response.data.data?.template?.name !== updateData.name) {
      throw new Error(`Nome não atualizado. Retornou: ${response.data.data?.template?.name}`);
    }

    console.log(`  Template atualizado para: ${response.data.data.template.name}`);
  });

  // Teste 4: Exportar template (GET com query)
  await test('GET /api/editor-templates/:id/export - Exportar como JSON', async () => {
    if (!testTemplateId) {
      throw new Error('Nenhum ID de template para exportar');
    }

    const response = await makeRequest('GET', `${API_BASE}/${testTemplateId}/export?format=json`);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status} esperado 200. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`  Template exportado como JSON (${response.headers['content-length']} bytes)`);
  });

  // Teste 5: Deletar template (DELETE)
  await test('DELETE /api/editor-templates/:id - Deletar template', async () => {
    if (!testTemplateId) {
      throw new Error('Nenhum ID de template para deletar');
    }

    const response = await makeRequest('DELETE', `${API_BASE}/${testTemplateId}`);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status} esperado 200. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.success) {
      throw new Error(`Resposta não sucesso: ${JSON.stringify(response.data)}`);
    }

    console.log(`  Template deletado com sucesso`);
  });

  // Teste 6: Verificar que foi deletado (GET deve retornar 404)
  await test('GET /api/editor-templates/:id - Verificar deleção (esperado 404)', async () => {
    if (!testTemplateId) {
      throw new Error('Nenhum ID de template para verificar');
    }

    const response = await makeRequest('GET', `${API_BASE}/${testTemplateId}`);

    if (response.status !== 404) {
      throw new Error(`Status ${response.status} esperado 404. Template ainda existe!`);
    }

    console.log(`  Confirmado: Template foi deletado (404)`);
  });

  // Resumo dos testes
  console.log('\n' + '='.repeat(50));
  console.log(`✓ Testes passaram: ${testsPassed}`);
  console.log(`✗ Testes falharam: ${testsFailed}`);
  console.log('='.repeat(50) + '\n');

  if (testsFailed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM!\n');
    process.exit(1);
  }
}

// Iniciar testes
runTests().catch(error => {
  console.error('Erro ao executar testes:', error);
  process.exit(1);
});
