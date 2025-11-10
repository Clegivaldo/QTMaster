const http = require('http');

let authToken = null;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    
    const options = {
      hostname: url.hostname,
      port: 5000,
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
  console.log('🧪 Teste de compatibilidade - elementos chave\n');

  try {
    // 1. Login
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@sistema.com',
      password: 'admin123'
    });

    if (loginResponse.status === 200 && loginResponse.body.data?.accessToken) {
      authToken = loginResponse.body.data.accessToken;
      console.log('✅ Login bem-sucedido!\n');
    } else {
      console.error('❌ Falha no login');
      return;
    }

    // Teste 1: SEM pageSettings (como o frontend está enviando)
    console.log('▶ Teste 1: SEM pageSettings (atual frontend)...');
    const dataWithoutPageSettings = {
      name: "Teste sem pageSettings",
      description: "Teste",
      category: "test",
      elements: [],
      globalStyles: {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#000000",
        backgroundColor: "#ffffff",
        lineHeight: 1.5
      },
      tags: [],
      isPublic: false
    };

    const resp1 = await makeRequest('POST', '/api/editor-templates', dataWithoutPageSettings);
    if (resp1.status === 201) {
      console.log('✅ Funcionou SEM pageSettings!');
    } else {
      console.error(`❌ Falhou com status ${resp1.status}`);
      if (resp1.body.details) {
        console.error('   Erro:', JSON.stringify(resp1.body.details, null, 2));
      } else {
        console.error('   Resposta:', JSON.stringify(resp1.body, null, 2));
      }
    }

    console.log('\n▶ Teste 2: COM pageSettings (esperado)...');
    const dataWithPageSettings = {
      name: "Teste com pageSettings",
      description: "Teste",
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
      tags: [],
      isPublic: false
    };

    const resp2 = await makeRequest('POST', '/api/editor-templates', dataWithPageSettings);
    if (resp2.status === 201) {
      console.log('✅ Funcionou COM pageSettings!');
    } else {
      console.error(`❌ Falhou com status ${resp2.status}`);
      if (resp2.body.details) {
        console.error('   Erro:', JSON.stringify(resp2.body.details, null, 2));
      } else {
        console.error('   Resposta:', JSON.stringify(resp2.body, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

runTests().catch(console.error);
