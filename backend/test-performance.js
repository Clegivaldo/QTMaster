import { performance } from 'perf_hooks';

async function testPerformance() {
  console.log('🚀 Iniciando teste de performance...\n');

  const tests = [
    { name: 'Template Simples', url: 'http://localhost:5000/api/test/mock-report' },
    { name: 'Template Avançado', url: 'http://localhost:5000/api/test/advanced-report' },
    { name: 'Template Default', url: 'http://localhost:5000/api/test/templates/default-report' }
  ];

  for (const test of tests) {
    console.log(`📊 Testando: ${test.name}`);
    
    const times = [];
    
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      
      try {
        const response = await fetch(test.url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const end = performance.now();
          const time = end - start;
          times.push(time);
          
          console.log(`  Tentativa ${i + 1}: ${time.toFixed(2)}ms (${buffer.byteLength} bytes)`);
        } else {
          console.log(`  Tentativa ${i + 1}: Erro ${response.status}`);
        }
      } catch (error) {
        console.log(`  Tentativa ${i + 1}: Erro - ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`  📈 Média: ${avgTime.toFixed(2)}ms`);
      console.log(`  ⚡ Mínimo: ${minTime.toFixed(2)}ms`);
      console.log(`  🐌 Máximo: ${maxTime.toFixed(2)}ms`);
    }
    
    console.log('');
  }
  
  console.log('✅ Teste de performance concluído!');
}

testPerformance().catch(console.error);