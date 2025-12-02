import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { AuditService } from '../services/auditService.js';
import { prisma } from '../lib/prisma.js';

/**
 * Generate PDF from editor template with validation data
 * Separated module to avoid editing large controller file
 */
export async function generatePDFFromTemplate(req: Request, res: Response): Promise<void> {
    try {
        const authReq = req as AuthenticatedRequest;
        const { id } = req.params;
        const { validationId } = req.body;

        // Validate required fields
        if (!id) {
            res.status(400).json({
                success: false,
                error: 'ID do template é obrigatório',
            });
            return;
        }

        if (!validationId) {
            res.status(400).json({
                success: false,
                error: 'validationId é obrigatório',
            });
            return;
        }

        // Import PDF generation service dynamically
        const { pdfGenerationService } = await import('../services/pdfGenerationService.js');

        logger.info('Generating PDF from editor template', {
            templateId: id,
            validationId,
            userId: authReq.user!.id,
        });

        // Generate PDF from editor template
        const result = await pdfGenerationService.generateFromEditorTemplate(
            id,
            validationId,
            authReq.user!.id
        );

        const pdfBuffer = result.pdfBuffer;

        // Get template name for filename
        const template = await prisma.editorTemplate.findUnique({
            where: { id },
            select: { name: true },
        });

        const filename = `${template?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'relatorio'}_${Date.now()}.pdf`;

        // Audit log
        await AuditService.logUserAction(
            'generate_pdf_from_template',
            'editor_template',
            authReq.user!.id,
            authReq.user!.email || '',
            req.ip || '',
            req.get('User-Agent'),
            id,
            undefined,
            undefined,
            {
                validationId,
                filename,
                size: pdfBuffer.length,
            }
        );

        logger.info('PDF generated successfully from editor template', {
            templateId: id,
            validationId,
            filename,
            size: pdfBuffer.length,
            processingTime: 'tracked_in_service',
        });

        // Return PDF as download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error('Generate PDF from template error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            templateId: req.params.id,
            validationId: req.body.validationId,
        });

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
        });
    }
}
