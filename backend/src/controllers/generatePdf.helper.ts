import { pdfGenerationService } from '../services/pdfGenerationService.js';

export async function generatePDFFromTemplate(
  templateId: string,
  validationId: string,
  userId: string
): Promise<Buffer> {
  try {
    const pdfBuffer = await pdfGenerationService.generateFromEditorTemplate(templateId, validationId, userId);
    return pdfBuffer;
  } catch (error) {
    // Let caller handle logging and response
    throw error;
  }
}
