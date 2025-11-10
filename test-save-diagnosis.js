/**
 * Teste de Diagnóstico: Salvamento de Templates
 * 
 * Este script simula o fluxo de salvamento de um novo template
 * para diagnosticar se o POST vs PUT está funcionando corretamente
 */

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
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
            data: parsedData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
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

async function diagnose() {
  console.log('🧪 Teste de Diagnóstico: Fluxo de Salvar Template\n');

  try {
    // Simular novo template com ID gerado pelo frontend
    const newTemplateId = `template-${Date.now()}-abc123`;
    
    console.log('📝 Simulando novo template com ID:', newTemplateId);
    console.log('   (ID começa com "template-" = novo template)\n');

    const templateData = {
      name: 'Template de Teste',
      description: 'Descrição do template',
      category: 'test',
      elements: [
        {
          id: 'elem-1',
          type: 'text',
          content: 'Test',
          position: { x: 10, y: 10 },
          size: { width: 100, height: 20 },
          styles: {},
          pageId: 'page-1'
        }
      ],
      pages: [
        {
          id: 'page-1',
          name: 'Page 1',
          elements: [],
          pageSettings: {
            size: 'A4',
            orientation: 'portrait',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            backgroundColor: '#ffffff'
          }
        }
      ],
      globalStyles: {
        fontFamily: 'Arial',
        fontSize: 12,
        color: '#000000',
        backgroundColor: '#ffffff',
        lineHeight: 1.4
      },
      tags: ['test'],
      isPublic: false
    };

    // Teste 1: Tentar PUT no ID novo (deve falhar com 404)
    console.log('❌ TESTE 1: Tentar PUT com ID novo (template-...)\n');
    console.log(`   PUT /api/editor-templates/${newTemplateId}\n`);
    
    const putResponse = await makeRequest(
      'PUT',
      `/api/editor-templates/${newTemplateId}`,
      templateData
    );
    
    console.log(`   Status: ${putResponse.status}`);
    if (putResponse.status === 404) {
      console.log('   ✓ Correto: 404 NOT FOUND (template não existe no backend)\n');
    } else if (putResponse.status === 200) {
      console.log('   ✗ ERRO: Template foi encontrado no backend!\n');
    } else {
      console.log(`   ? Resposta inesperada: ${JSON.stringify(putResponse.data)}\n`);
    }

    // Teste 2: Fazer POST para criar o template
    console.log('✅ TESTE 2: Fazer POST para criar novo template\n');
    console.log(`   POST /api/editor-templates\n`);
    
    const postResponse = await makeRequest(
      'POST',
      '/api/editor-templates',
      {
        ...templateData,
        id: undefined // Frontend envia undefined para deixar backend gerar
      }
    );
    
    console.log(`   Status: ${postResponse.status}`);
    if (postResponse.status === 201 || postResponse.status === 200) {
      const persistedTemplate = postResponse.data?.data?.template;
      if (persistedTemplate?.id && !persistedTemplate.id.startsWith('template-')) {
        console.log(`   ✓ Correto: Template criado com ID: ${persistedTemplate.id}`);
        console.log(`   ✓ Novo ID não começa com "template-"\n`);

        // Teste 3: Agora tentar PUT com o novo ID (deve funcionar)
        console.log('✅ TESTE 3: Fazer PUT com ID persistido\n');
        console.log(`   PUT /api/editor-templates/${persistedTemplate.id}\n`);
        
        const updateData = {
          ...templateData,
          name: 'Template Atualizado'
        };

        const putUpdateResponse = await makeRequest(
          'PUT',
          `/api/editor-templates/${persistedTemplate.id}`,
          updateData
        );
        
        console.log(`   Status: ${putUpdateResponse.status}`);
        if (putUpdateResponse.status === 200) {
          console.log('   ✓ Correto: Template atualizado com sucesso\n');
        } else {
          console.log(`   ✗ ERRO: Não conseguiu atualizar template\n`);
        }
      } else {
        console.log(`   ✗ ERRO: ID retornado ainda começa com "template-"\n`);
        console.log(`   Resposta: ${JSON.stringify(postResponse.data)}\n`);
      }
    } else {
      console.log(`   ✗ ERRO: Não conseguiu criar template\n`);
      console.log(`   Resposta: ${JSON.stringify(postResponse.data)}\n`);
    }

    console.log('='.repeat(60));
    console.log('🎯 CONCLUSÃO:');
    console.log('O fluxo correto é:');
    console.log('1. Frontend cria template com ID "template-..."');
    console.log('2. Frontend faz POST → Backend cria e retorna ID persistido');
    console.log('3. Frontend recebe ID persistido e atualiza seu template');
    console.log('4. Frontend faz PUT com novo ID para atualizações futuras');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro ao executar diagnóstico:', error.message);
    console.error('   Certifique-se de que o backend está rodando em localhost:3000');
  }
}

diagnose();
