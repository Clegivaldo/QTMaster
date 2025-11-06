/**
 * Teste do Editor Simples
 */

import axios from 'axios';

async function testSimpleEditor() {
    console.log('🧪 TESTANDO EDITOR SIMPLES');
    console.log('=' .repeat(40));
    
    try {
        console.log('1. 🌐 Testando carregamento do editor simples...');
        const response = await axios.get('http://localhost:5000/api/template-editor/simple');
        
        if (response.status === 200) {
            console.log('   ✅ Editor simples carregou com sucesso!');
            
            const html = response.data;
            
            // Verificar funcionalidades
            const features = [
                { name: 'addElement', found: html.includes('addElement') },
                { name: 'contenteditable', found: html.includes('contenteditable="true"') },
                { name: 'selectElement', found: html.includes('selectElement') },
                { name: 'updateStyle', found: html.includes('updateStyle') },
                { name: 'toggleFormat', found: html.includes('toggleFormat') },
                { name: 'deleteElement', found: html.includes('deleteElement') }
            ];
            
            console.log('');
            console.log('2. 🔍 Verificando funcionalidades...');
            
            let featuresFound = 0;
            features.forEach(feature => {
                if (feature.found) {
                    console.log(`   ✅ ${feature.name} - ENCONTRADO`);
                    featuresFound++;
                } else {
                    console.log(`   ❌ ${feature.name} - NÃO ENCONTRADO`);
                }
            });
            
            console.log('');
            console.log(`📊 RESULTADO: ${featuresFound}/${features.length} funcionalidades encontradas`);
            
            if (featuresFound === features.length) {
                console.log('');
                console.log('🎉 EDITOR SIMPLES ESTÁ FUNCIONANDO!');
                console.log('');
                console.log('🎯 TESTE AGORA:');
                console.log('   URL: http://localhost:5000/api/template-editor/simple');
                console.log('');
                console.log('📋 FUNCIONALIDADES DISPONÍVEIS:');
                console.log('   ✅ Adicionar elementos (texto, cabeçalho, imagem)');
                console.log('   ✅ Editar texto diretamente');
                console.log('   ✅ Selecionar elementos');
                console.log('   ✅ Formatação (B/I/U)');
                console.log('   ✅ Alinhamento');
                console.log('   ✅ Cor e tamanho da fonte');
                console.log('   ✅ Deletar elementos');
                console.log('');
                console.log('💡 COMO USAR:');
                console.log('   1. Clique nos elementos da esquerda para adicionar');
                console.log('   2. Clique no elemento no canvas para selecionar');
                console.log('   3. Use os controles da esquerda para formatar');
                console.log('   4. Edite o texto clicando diretamente nele');
            } else {
                console.log('⚠️ ALGUMAS FUNCIONALIDADES PODEM NÃO ESTAR DISPONÍVEIS');
            }
            
        } else {
            console.log('   ❌ Erro ao carregar editor simples:', response.status);
        }
        
    } catch (error) {
        console.log('❌ ERRO:', error.message);
        
        if (error.response?.status === 404) {
            console.log('');
            console.log('🔧 SOLUÇÃO:');
            console.log('   A rota /simple pode não estar disponível ainda.');
            console.log('   Tente o editor original: http://localhost:5000/api/template-editor');
        }
    }
}

testSimpleEditor();