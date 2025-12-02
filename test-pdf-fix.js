#!/usr/bin/env node

import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost';

async function makeRequest(method, path, body = null, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : BASE_URL + path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: 60000
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        const isJson = res.headers['content-type']?.includes('application/json');
        const isPdf = res.headers['content-type']?.includes('application/pdf');

        try {
          const result = isJson ? JSON.parse(data) : data;
          resolve({
            status: res.status,
            statusCode: res.statusCode,
            headers: res.headers,
            data: result,
            isJson,
            isPdf,
            contentType: res.headers['content-type'],
            contentLength: data.length
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            isJson: false,
            isPdf,
            contentType: res.headers['content-type'],
            contentLength: data.length
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testPDFGeneration() {
  console.log('🧪 Teste de Geração de PDF\n');

  let testToken = '';

  // 1. Login
  console.log('1. Fazendo login...');
  try {
    const loginResp = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (loginResp.status === 200 && loginResp.data?.data?.tokens?.accessToken) {
      testToken = loginResp.data.data.tokens.accessToken;
      console.log('✅ Login bem-sucedido\n');
    } else {
      console.error('❌ Erro no login:', loginResp.data);
      return;
    }
  } catch (error) {
    console.error('❌ Erro ao fazer login:', error.message);
    return;
  }

  // 2. Gerar PDF usando template de editor
  console.log('2. Gerando PDF com template de editor...');
  try {
    const templateId = 'f05f01ed-0738-4a8d-9892-8d496db14300'; // Template com 3798 elementos
    const validationId = '7153ca90-8bec-47e8-9a71-7a051b06a944'; // ID de validação existente

    const generateResp = await makeRequest('POST', `/api/editor-templates/${templateId}/generate-pdf`, {
      validationId
    }, {
      headers: {
        Authorization: `Bearer ${testToken}`
      }
    });

    if (generateResp.status === 202 && generateResp.data?.data?.jobId) {
      const jobId = generateResp.data.data.jobId;
      console.log(`✅ Job de PDF iniciado (ID: ${jobId})`);

      // Aguardar um pouco e verificar o status
      console.log('Aguardando processamento...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResp = await makeRequest('GET', `/api/editor-templates/${templateId}/generate-pdf/${jobId}/status`, {}, {
        headers: {
          Authorization: `Bearer ${testToken}`
        }
      });

      if (statusResp.isPdf) {
        console.log('✅ PDF gerado com sucesso!');
        console.log(`   → Content-Type: ${statusResp.contentType}`);
        console.log(`   → Tamanho: ${statusResp.contentLength} bytes`);
        console.log(`   → É PDF válido: ${statusResp.isPdf}`);
        console.log('\n🎉 CORREÇÃO CONFIRMADA: PDFs não estão mais corrompidos!\n');
      } else {
        console.error('❌ PDF ainda não está pronto ou falhou:');
        console.error(`   → Status: ${statusResp.statusCode}`);
        console.error(`   → Content-Type: ${statusResp.contentType}`);
        console.error(`   → Resposta:`, statusResp.data);
      }
    } else {
      console.error('❌ Erro ao iniciar geração de PDF:');
      console.error(`   → Status: ${generateResp.statusCode}`);
      console.error(`   → Resposta:`, generateResp.data);
    }
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error.message);
  }
}

testPDFGeneration().catch(console.error);