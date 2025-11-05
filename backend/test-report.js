import { ReportGenerationService } from './src/services/reportGenerationService.js';

async function testReportGeneration() {
  try {
    console.log('🧪 Testando geração de relatório...');
    
    const reportService = new ReportGenerationService();
    
    // Você precisará substituir este ID por um ID de validação real do seu banco
    const validationId = 'test-validation-id';
    
    console.log('📄 Gerando relatório para validação:', validationId);
    
    const pdfBuffer = await reportService.generateReport(validationId, 'test-report');
    
    console.log('✅ Relatório gerado com sucesso!');
    console.log('📊 Tamanho do PDF:', pdfBuffer.length, 'bytes');
    
    // Salvar o PDF para teste
    import fs from 'fs';
    fs.writeFileSync('test-report.pdf', pdfBuffer);
    console.log('💾 PDF salvo como test-report.pdf');
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    console.error('Stack:', error.stack);
  }
}

testReportGeneration();