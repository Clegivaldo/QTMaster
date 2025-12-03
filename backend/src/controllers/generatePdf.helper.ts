import { pdfGenerationService } from '../services/pdfGenerationService.js';
import { logger } from '../utils/logger.js';

export async function generatePDFFromTemplate(
  templateId: string,
  validationId: string,
  userId: string
): Promise<Buffer> {
  try {
    // Check cache first
    const cachedPDF = await pdfGenerationService.getCachedPDF(templateId, validationId);

    if (cachedPDF) {
      logger.info('Returning cached PDF', { templateId, validationId, size: cachedPDF.length });
      return cachedPDF;
    }

    // Generate PDF if not in cache
    logger.info('Generating new PDF (cache miss)', { templateId, validationId });
    const result = await pdfGenerationService.generateFromEditorTemplate(templateId, validationId, userId);

    // Cache the generated PDF (TTL: 1 hour = 3600 seconds)
    await pdfGenerationService.cachePDF(templateId, validationId, result.pdfBuffer, 3600);

    return result.pdfBuffer;
  } catch (error) {
    // Let caller handle logging and response
    throw error;
  }
}

