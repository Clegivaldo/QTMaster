import { pdfGenerationService } from './dist/services/pdfGenerationService.js';

async function testPDF() {
  try {
    console.log('Testando geração de PDF com dados reais...');
    await pdfGenerationService.initialize();
    console.log('Serviço inicializado');

    // IDs encontrados no banco
    const templateId = '1deca820-11cf-49ac-9c2f-37853d9206ce';
    const validationId = '7153ca90-8bec-47e8-9a71-7a051b06a944';
    const userId = 'user-id'; // Usando um ID fictício para usuário

    console.log('Iniciando geração de PDF...');
    const result = await pdfGenerationService.generateFromEditorTemplate(
      templateId,
      validationId,
      userId
    );

    console.log('Resultado obtido:', typeof result);
    console.log('Propriedades do resultado:', Object.keys(result || {}));
    if (result && result.pdfBuffer) {
      console.log('PDF gerado com sucesso!');
      console.log('Tamanho do buffer:', result.pdfBuffer.length);
      console.log('Metadata:', result.metadata);

      // Verificar se o PDF é válido (bytes iniciais devem ser %PDF-)
      const firstBytes = result.pdfBuffer.subarray(0, 5).toString();
      console.log('Primeiros bytes:', firstBytes);

      if (firstBytes === '%PDF-') {
        console.log('✅ PDF válido detectado!');
      } else {
        console.log('❌ PDF pode estar corrompido');
      }
    } else {
      console.log('❌ Resultado não tem pdfBuffer');
      console.log('Resultado completo:', result);
    }

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPDF();