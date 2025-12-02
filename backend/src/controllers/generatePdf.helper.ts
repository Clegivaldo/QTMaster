import { pdfGenerationService } from '../services/pdfGenerationService.js';

export async function generatePDFFromTemplate(
  templateId: string,
  validationId: string,
  userId: string
): Promise<Buffer> {
  try {
    const result = await pdfGenerationService.generateFromEditorTemplate(templateId, validationId, userId);
    return result.pdfBuffer;
  } catch (error) {
    // Let caller handle logging and response
    throw error;
  }
}
