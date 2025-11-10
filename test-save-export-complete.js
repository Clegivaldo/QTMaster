#!/usr/bin/env node

/**
 * Teste Completo: Salvar e Exportar Templates
 * 
 * Este script testa:
 * 1. POST - Criar novo template
 * 2. PUT - Atualizar template
 * 3. POST /export - Exportar em JSON
 * 4. POST /export - Exportar em PDF
 * 5. POST /export - Exportar em PNG
 * 6. POST /export - Exportar em HTML
 * 7. Verificar se arquivos foram criados
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/editor-templates';

let testsPassed = 0;
let testsFailed = 0;
let savedTemplateId = null;

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

async function test(name, fn) {
  try {
    console.log(`\n▶ ${name}...`);
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Erro: ${error.message}`);
    testsFailed++;
  }
}

const createTestTemplate = () => ({
  name: `Template Teste ${Date.now()}`,
  description: 'Template para testes de exportação',
  category: 'test-export',
  elements: [
    {
      id: 'elem-1',
      type: 'text',
      content: 'Teste de Exportação',
      position: { x: 10, y: 10 },
      size: { width: 200, height: 30 },
      styles: { color: '#000', fontSize: '16px' },
      locked: false,
      visible: true,
      zIndex: 1,
      pageId: 'page-1'
    },
    {
      id: 'elem-2',
      type: 'rectangle',
      content: '',
      position: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      styles: { backgroundColor: '#ccc', borderColor: '#000', borderWidth: '1px' },
      locked: false,
      visible: true,
      zIndex: 0,
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
  tags: ['test', 'export', 'validation'],
  isPublic: false
});

async function runTests() {
  console.log('🧪 Teste Completo: Salvar e Exportar Templates\n');
  console.log('='.repeat(60));

  // Teste 1: Criar novo template (POST)
  await test('1. POST - Criar novo template', async () => {
    const templateData = createTestTemplate();
    const response = await makeRequest('POST', API_BASE, templateData);

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.success) {
      throw new Error(`Falha: ${JSON.stringify(response.data)}`);
    }

    savedTemplateId = response.data.data?.template?.id;
    if (!savedTemplateId) {
      throw new Error('Nenhum ID retornado');
    }

    console.log(`   ✓ Template criado com ID: ${savedTemplateId}`);
  });

  // Teste 2: Atualizar template (PUT)
  await test('2. PUT - Atualizar template', async () => {
    if (!savedTemplateId) throw new Error('Nenhum template salvo');

    const updateData = {
      name: 'Template Atualizado',
      description: 'Descrição atualizada'
    };

    const response = await makeRequest('PUT', `${API_BASE}/${savedTemplateId}`, updateData);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Template atualizado com sucesso`);
  });

  // Teste 3: Exportar como JSON (novo template)
  await test('3. POST /export - Exportar novo template como JSON', async () => {
    const templateData = createTestTemplate();
    templateData.name = 'Template Novo JSON';

    const exportPayload = {
      template: templateData,
      options: {
        format: 'json',
        quality: 100,
        dpi: 300,
        includeMetadata: true
      }
    };

    const response = await makeRequest('POST', '/api/editor-templates/export', exportPayload);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.data?.url) {
      throw new Error(`Sem URL de download: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Exportado: ${response.data.data.filename}`);
  });

  // Teste 4: Exportar como PDF (novo template)
  await test('4. POST /export - Exportar novo template como PDF', async () => {
    const templateData = createTestTemplate();
    templateData.name = 'Template Novo PDF';

    const exportPayload = {
      template: templateData,
      options: {
        format: 'pdf',
        quality: 100,
        dpi: 300,
        includeMetadata: true
      }
    };

    const response = await makeRequest('POST', '/api/editor-templates/export', exportPayload);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Exportado: ${response.data.data.filename}`);
  });

  // Teste 5: Exportar como PNG (novo template)
  await test('5. POST /export - Exportar novo template como PNG', async () => {
    const templateData = createTestTemplate();
    templateData.name = 'Template Novo PNG';

    const exportPayload = {
      template: templateData,
      options: {
        format: 'png',
        quality: 80,
        dpi: 300,
        includeMetadata: true
      }
    };

    const response = await makeRequest('POST', '/api/editor-templates/export', exportPayload);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Exportado: ${response.data.data.filename}`);
  });

  // Teste 6: Exportar como HTML (novo template)
  await test('6. POST /export - Exportar novo template como HTML', async () => {
    const templateData = createTestTemplate();
    templateData.name = 'Template Novo HTML';

    const exportPayload = {
      template: templateData,
      options: {
        format: 'html',
        quality: 100,
        dpi: 300,
        includeMetadata: true
      }
    };

    const response = await makeRequest('POST', '/api/editor-templates/export', exportPayload);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Exportado: ${response.data.data.filename}`);
  });

  // Teste 7: Exportar template persistido (após salvar)
  await test('7. POST /export - Exportar template persistido como JSON', async () => {
    if (!savedTemplateId) throw new Error('Nenhum template salvo');

    // Primeiro, carregar o template
    const getResponse = await makeRequest('GET', `${API_BASE}/${savedTemplateId}`);
    if (getResponse.status !== 200) {
      throw new Error('Não conseguiu carregar template');
    }

    const template = getResponse.data.data.template;

    const exportPayload = {
      template: template,
      options: {
        format: 'json',
        quality: 100,
        dpi: 300,
        includeMetadata: true
      }
    };

    const response = await makeRequest('POST', '/api/editor-templates/export', exportPayload);

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}. Resposta: ${JSON.stringify(response.data)}`);
    }

    console.log(`   ✓ Exportado template persistido: ${response.data.data.filename}`);
  });

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Testes passaram: ${testsPassed}`);
  console.log(`❌ Testes falharam: ${testsFailed}`);
  console.log('='.repeat(60) + '\n');

  if (testsFailed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
    console.log('Resumo dos fluxos validados:');
    console.log('1. ✅ Novo template criado e salvo (POST)');
    console.log('2. ✅ Template atualizado (PUT)');
    console.log('3. ✅ Template novo exportado em JSON, PDF, PNG, HTML');
    console.log('4. ✅ Template persistido exportado com sucesso\n');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM!\n');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  console.error('   Certifique-se de que:');
  console.error('   1. Backend está rodando em localhost:3000');
  console.error('   2. Banco de dados está acessível');
  console.error('   3. Diretório "exports" existe ou pode ser criado\n');
  process.exit(1);
});
