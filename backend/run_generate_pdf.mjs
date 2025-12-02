#!/usr/bin/env node

(async () => {
  try {
    console.log('Starting PDF generation test');
    const { prisma } = await import('./dist/lib/prisma.js');
    const { pdfGenerationService } = await import('./dist/services/pdfGenerationService.js');

    // Example IDs from logs
    const templateId = process.env.TEST_TEMPLATE_ID || '90d40721-03e5-4bd4-b891-ab4d52976fcd';
    const validationId = process.env.TEST_VALIDATION_ID || 'cmij6y6ag0001mg07zgl6cvyd';

    // Find a user to run as
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No user found in DB. Aborting.');
      process.exit(2);
    }
    console.log('Using user id:', user.id);

    // Ensure PDF service is initialized
    await pdfGenerationService.initialize();

    console.log('Generating PDF for template', templateId, 'validation', validationId);
    const pdfBuffer = await pdfGenerationService.generateFromEditorTemplate(templateId, validationId, user.id);

    const outPath = '/tmp/generated_report.pdf';
    const fs = await import('fs/promises');
    await fs.writeFile(outPath, pdfBuffer);

    console.log('PDF saved to', outPath);
    process.exit(0);
  } catch (e) {
    console.error('ERROR generating PDF:', e);
    process.exit(3);
  }
})();
