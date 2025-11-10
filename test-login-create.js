const http = require('http');

let authToken = null;
let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:3000${path}`);
    
    const options = {
      hostname: url.hostname,
      port: 3000,
      path: url.pathname,
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
  console.log('🧪 Iniciando testes...\n');

  try {
    // 1. Login para obter token
    console.log('▶ 1. Fazendo login...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@sistema.com',
      password: 'admin123'
    });

    if (loginResponse.status === 200 && loginResponse.body.data?.accessToken) {
      authToken = loginResponse.body.data.accessToken;
      console.log('✅ Login bem-sucedido! Token obtido.\n');
    } else {
      console.error('❌ Falha no login. Resposta:', loginResponse.body);
      return;
    }

    // 2. Criar novo template (POST)
    console.log('▶ 2. Criando novo template (POST)...');
    const templateData = {
      name: "Template Teste",
      description: "Template para testes",
      category: "test",
      elements: [],
      globalStyles: {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#000000",
        backgroundColor: "#ffffff",
        lineHeight: 1.5
      },
      pageSettings: {
        size: "A4",
        orientation: "portrait",
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        backgroundColor: "#ffffff",
        showMargins: true
      },
      tags: ["teste"],
      isPublic: false
    };

    const createResponse = await makeRequest('POST', '/api/editor-templates', templateData);
    
    if (createResponse.status === 201) {
      console.log('✅ Template criado com sucesso!');
      const savedTemplate = createResponse.body.data?.template;
      if (savedTemplate?.id) {
        console.log(`   ID: ${savedTemplate.id}`);
        testsPassed++;
      } else {
        console.error('❌ Resposta sem ID válido:', createResponse.body);
        testsFailed++;
      }
    } else {
      console.error(`❌ Erro ao criar template (status ${createResponse.status}):`);
      console.error('   Resposta:', JSON.stringify(createResponse.body, null, 2));
      testsFailed++;
      return;
    }

  } catch (error) {
    console.error('❌ Erro durante testes:', error.message);
    testsFailed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Testes passaram: ${testsPassed}`);
  console.log(`❌ Testes falharam: ${testsFailed}`);
  console.log('='.repeat(60));
}

runTests().catch(console.error);
