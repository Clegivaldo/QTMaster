/**
 * Teste REAL das Funcionalidades do Editor (Após Restart do Container)
 */

import axios from 'axios';

async function testEditorFunctionalities() {
    console.log('🧪 TESTANDO FUNCIONALIDADES REAIS DO EDITOR');
    console.log('=' .repeat(60));
    
    try {
        // Teste 1: Verificar se o editor carrega
        console.log('1. 🌐 Testando carregamento do editor...');
        const response = await axios.get('http://localhost:5000/api/template-editor');
        
        if (response.status === 200) {
            console.log('   ✅ Editor carregou com sucesso');
            
            // Verificar se contém as correções implementadas
            const html = response.data;
            
            // Teste 2: Verificar se contém as novas funções
            console.log('2. 🔍 Verificando se as correções estão presentes...');
            
            const corrections = [
                { name: 'makeElementDraggable', found: html.includes('makeElementDraggable') },
                { name: 'contentEditable', found: html.includes('contentEditable = true') },
                { name: 'showMessage', found: html.includes('showMessage') },
                { name: 'setupCanvasInteractions', found: html.includes('setupCanvasInteractions') },
                { name: 'deselectAllElements', found: html.includes('deselectAllElements') },
                { name: 'applyStyle', found: html.includes('applyStyle') }
            ];
            
            let correctionsFound = 0;
            corrections.forEach(correction => {
                if (correction.found) {
                    console.log(`   ✅ ${correction.name} - ENCONTRADO`);
                    correctionsFound++;
                } else {
                    console.log(`   ❌ ${correction.name} - NÃO ENCONTRADO`);
                }
            });
            
            console.log('');
            console.log(`📊 RESULTADO: ${correctionsFound}/${corrections.length} correções encontradas`);
            
            if (correctionsFound === corrections.length) {
                console.log('🎉 TODAS AS CORREÇÕES ESTÃO ATIVAS!');
                console.log('');
                console.log('🎯 AGORA VOCÊ PODE TESTAR:');
                console.log('   1. Acesse: http://localhost:5000/api/template-editor');
                console.log('   2. Abra o Console (F12)');
                console.log('   3. Teste as funcionalidades:');
                console.log('      - Arrastar elementos para o canvas');
                console.log('      - Clicar para selecionar elementos');
                console.log('      - Editar texto diretamente');
                console.log('      - Usar botões B/I/U para formatação');
                console.log('      - Testar alinhamento');
                console.log('      - Mover elementos arrastando');
                console.log('      - Duplicar e deletar elementos');
                console.log('');
                console.log('💬 Você deve ver mensagens de feedback no canto superior direito');
                console.log('🔍 E logs detalhados no console do navegador');
            } else {
                console.log('⚠️ ALGUMAS CORREÇÕES PODEM NÃO ESTAR ATIVAS');
                console.log('   Pode ser necessário um rebuild do container');
            }
            
        } else {
            console.log('   ❌ Erro ao carregar editor:', response.status);
        }
        
    } catch (error) {
        console.log('❌ ERRO ao testar:', error.message);
        console.log('');
        console.log('🔧 POSSÍVEIS SOLUÇÕES:');
        console.log('   1. Verificar se o container está rodando');
        console.log('   2. Fazer rebuild do container se necessário');
        console.log('   3. Verificar logs do container');
    }
}

// Executar teste
testEditorFunctionalities();