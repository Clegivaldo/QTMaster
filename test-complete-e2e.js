#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

let authToken = null;
let testsPassed = 0;
let testsFailed = 0;
let savedTemplateId = null;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            body: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: responseData,
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

async function runTests() {
  console.log('\n🧪 TESTE COMPLETO: Salvar e Exportar Templates\n');

  try {
    // 1. Login
    console.log('▶ 1. Fazendo login...');
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@sistema.com',
      password: 'admin123'
    });

    if (loginResp.status === 200 && loginResp.body.data?.accessToken) {
      authToken = loginResp.body.data.accessToken;
      console.log('✅ 1. Login bem-sucedido!\n');
      testsPassed++;
    } else {
      console.error('❌ Falha no login');
      testsFailed++;
      return;
    }

    // 2. Salvar novo template
    console.log('▶ 2. Salvando novo template (POST)...');
    const templateData = {
      name: "Template Teste Completo",
      description: "Template para teste E2E",
      category: "teste",
      elements: [
        {
          id: "elem1",
          type: "text",
          content: "Título do Template",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          styles: {
            fontSize: 24,
            fontWeight: "bold",
            color: "#000000"
          },
          zIndex: 1
        }
      ],
      globalStyles: {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#000000",
        backgroundColor: "#ffffff",
        lineHeight: 1.5
      },
      tags: ["teste", "E2E"],
      isPublic: false
    };

    const saveResp = await makeRequest('POST', '/editor-templates', templateData);
    
    if (saveResp.status === 201 && saveResp.body.data?.template?.id) {
      savedTemplateId = saveResp.body.data.template.id;
      console.log(`✅ 2. Template salvo com sucesso! ID: ${savedTemplateId}\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao salvar (status ${saveResp.status})`);
      console.error('   Resposta:', JSON.stringify(saveResp.body, null, 2));
      testsFailed++;
      return;
    }

    // 3. Exportar como JSON
    console.log('▶ 3. Exportando como JSON...');
    const jsonExportResp = await makeRequest('POST', '/editor-templates/export', {
      template: {
        ...templateData,
        id: savedTemplateId,
        createdBy: 'test-user'
      },
      options: {
        format: 'json'
      }
    });

    if (jsonExportResp.status === 200 && jsonExportResp.body.data?.filename) {
      console.log(`✅ 3. Exportado como JSON: ${jsonExportResp.body.data.filename}\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao exportar JSON (status ${jsonExportResp.status})`);
      if (jsonExportResp.body.details) {
        console.error('   Erro:', JSON.stringify(jsonExportResp.body.details, null, 2));
      }
      testsFailed++;
    }

    // 4. Exportar como PDF
    console.log('▶ 4. Exportando como PDF...');
    const pdfExportResp = await makeRequest('POST', '/editor-templates/export', {
      template: {
        ...templateData,
        id: savedTemplateId,
        createdBy: 'test-user'
      },
      options: {
        format: 'pdf'
      }
    });

    if (pdfExportResp.status === 200 && pdfExportResp.body.data?.filename) {
      console.log(`✅ 4. Exportado como PDF: ${pdfExportResp.body.data.filename}\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao exportar PDF (status ${pdfExportResp.status})`);
      testsFailed++;
    }

    // 5. Exportar como PNG
    console.log('▶ 5. Exportando como PNG...');
    const pngExportResp = await makeRequest('POST', '/editor-templates/export', {
      template: {
        ...templateData,
        id: savedTemplateId,
        createdBy: 'test-user'
      },
      options: {
        format: 'png'
      }
    });

    if (pngExportResp.status === 200 && pngExportResp.body.data?.filename) {
      console.log(`✅ 5. Exportado como PNG: ${pngExportResp.body.data.filename}\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao exportar PNG (status ${pngExportResp.status})`);
      testsFailed++;
    }

    // 6. Exportar como HTML
    console.log('▶ 6. Exportando como HTML...');
    const htmlExportResp = await makeRequest('POST', '/editor-templates/export', {
      template: {
        ...templateData,
        id: savedTemplateId,
        createdBy: 'test-user'
      },
      options: {
        format: 'html'
      }
    });

    if (htmlExportResp.status === 200 && htmlExportResp.body.data?.filename) {
      console.log(`✅ 6. Exportado como HTML: ${htmlExportResp.body.data.filename}\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao exportar HTML (status ${htmlExportResp.status})`);
      testsFailed++;
    }

    // 7. Atualizar template
    console.log('▶ 7. Atualizando template (PUT)...');
    const updatedData = {
      ...templateData,
      name: "Template Teste Completo - Atualizado",
      description: "Template atualizado para teste E2E"
    };

    const updateResp = await makeRequest('PUT', `/editor-templates/${savedTemplateId}`, updatedData);
    
    if (updateResp.status === 200) {
      console.log(`✅ 7. Template atualizado com sucesso!\n`);
      testsPassed++;
    } else {
      console.error(`❌ Erro ao atualizar (status ${updateResp.status})`);
      console.error('   Resposta:', JSON.stringify(updateResp.body, null, 2));
      testsFailed++;
    }

  } catch (error) {
    console.error('❌ Erro durante testes:', error.message);
    testsFailed++;
  }

  console.log('='.repeat(70));
  console.log(`\n📊 RESULTADO FINAL:\n`);
  console.log(`   ✅ Testes passaram: ${testsPassed}`);
  console.log(`   ❌ Testes falharam: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log(`\n🎉 TODOS OS TESTES PASSARAM! Sistema está 100% funcional!\n`);
  } else {
    console.log(`\n⚠️  Há ${testsFailed} erro(s) a corrigir.\n`);
  }
  
  console.log('='.repeat(70) + '\n');
}

runTests().catch(console.error);
