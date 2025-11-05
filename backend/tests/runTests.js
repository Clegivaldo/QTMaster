/**
 * Script para executar todos os testes do Template Editor
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Iniciando Testes Unitários do Template Editor\n');

// Verificar se as dependências de teste estão instaladas
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const devDeps = packageJson.devDependencies || {};

const requiredTestDeps = [
  'jest',
  'ts-jest',
  '@types/jest',
  'jest-html-reporters'
];

const missingDeps = requiredTestDeps.filter(dep => !devDeps[dep]);

if (missingDeps.length > 0) {
  console.log('📦 Instalando dependências de teste...');
  try {
    execSync(`npm install --save-dev ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ Dependências instaladas com sucesso!\n');
  } catch (error) {
    console.error('❌ Erro ao instalar dependências:', error.message);
    process.exit(1);
  }
}

// Executar testes
try {
  console.log('🏃 Executando testes...\n');
  
  // Executar testes com cobertura
  execSync('npx jest --coverage --verbose', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  console.log('\n✅ Todos os testes foram executados com sucesso!');
  console.log('📊 Relatório de cobertura disponível em: ./coverage/index.html');
  console.log('📋 Relatório de testes disponível em: ./coverage/test-report.html');
  
} catch (error) {
  console.error('\n❌ Alguns testes falharam. Verifique os detalhes acima.');
  process.exit(1);
}

// Mostrar resumo dos arquivos de teste
console.log('\n📁 Arquivos de teste executados:');
const testFiles = [
  'tests/templateEditor.test.ts',
  'tests/reportGeneration.test.ts', 
  'tests/templateEditorIntegration.test.ts'
];

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (não encontrado)`);
  }
});

console.log('\n🎉 Execução de testes concluída!');