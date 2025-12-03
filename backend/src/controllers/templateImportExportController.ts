import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { AuditService } from '../services/auditService.js';
import { prisma } from '../lib/prisma.js';

export class TemplateImportExportController {
    /**
     * Export template as JSON file
     */
    static exportTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({ success: false, error: 'ID do template é obrigatório' });
                return;
            }

            if (!req.user?.id) {
                res.status(401).json({ success: false, error: 'Usuário não autenticado' });
                return;
            }

            // Fetch template with all related data
            const template = await prisma.editorTemplate.findUnique({
                where: { id },
                include: {
                    versions: {
                        orderBy: { version: 'desc' },
                        take: 1,
                    },
                },
            });

            if (!template) {
                res.status(404).json({ success: false, error: 'Template não encontrado' });
                return;
            }

            // Create export data
            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                exportedBy: req.user.id,
                template: {
                    name: template.name,
                    description: template.description,
                    category: template.category,
                    elements: template.elements,
                    globalStyles: template.globalStyles,
                    pageSettings: template.pageSettings,
                    pages: template.pages,
                    tags: template.tags,
                    isPublic: template.isPublic,
                },
            };

            // Set headers for file download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="template_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json"`);

            res.json(exportData);

            logger.info('Template exported', { templateId: id, userId: req.user.id });
        } catch (error) {
            logger.error('Export template error:', { error: error instanceof Error ? error.message : error });
            res.status(500).json({ success: false, error: 'Erro ao exportar template' });
        }
    }

    /**
     * Import template from JSON file
     */
    static importTemplate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user?.id) {
                res.status(401).json({ success: false, error: 'Usuário não autenticado' });
                return;
            }

            const importData = req.body;

            // Validate import data structure
            if (!importData.version || !importData.template) {
                res.status(400).json({
                    success: false,
                    error: 'Formato de arquivo inválido. Certifique-se de que está importando um arquivo exportado pelo sistema.'
                });
                return;
            }

            // Check version compatibility
            if (importData.version !== '1.0') {
                res.status(400).json({
                    success: false,
                    error: `Versão do arquivo não suportada: ${importData.version}. Versão esperada: 1.0`
                });
                return;
            }

            const templateData = importData.template;

            // Validate required fields
            if (!templateData.name) {
                res.status(400).json({ success: false, error: 'Nome do template é obrigatório' });
                return;
            }

            // Check if template with same name already exists
            const existingTemplate = await prisma.editorTemplate.findFirst({
                where: {
                    name: templateData.name,
                    createdBy: req.user.id,
                },
            });

            if (existingTemplate) {
                res.status(409).json({
                    success: false,
                    error: `Já existe um template com o nome "${templateData.name}". Por favor, renomeie antes de importar.`
                });
                return;
            }

            // Create new template from imported data
            const newTemplate = await prisma.editorTemplate.create({
                data: {
                    name: templateData.name,
                    description: templateData.description || '',
                    category: templateData.category || 'imported',
                    elements: templateData.elements || [],
                    globalStyles: templateData.globalStyles || {},
                    pageSettings: templateData.pageSettings || {},
                    tags: templateData.tags || [],
                    isPublic: false, // Always import as private
                    createdBy: req.user.id,
                    version: 1,
                    revision: 1,
                    // `pages` is stored as JSON in the `EditorTemplate` model
                    pages: templateData.pages || null,
                },
            });

            // Log audit
            await AuditService.logEvent({
                action: 'TEMPLATE_IMPORTED',
                resource: 'EditorTemplate',
                resourceId: newTemplate.id,
                userId: req.user?.id ?? null,
                userEmail: (req.user as any)?.email ?? null,
                ip: req.ip ?? null,
                userAgent: typeof req.get === 'function' ? (req.get('user-agent') ?? null) : null,
                metadata: {
                    templateName: newTemplate.name,
                    importedFrom: importData.exportedBy || 'unknown',
                },
                success: true,
            });

            res.status(201).json({
                success: true,
                data: {
                    template: newTemplate,
                    message: 'Template importado com sucesso!',
                },
            });

            logger.info('Template imported', {
                templateId: newTemplate.id,
                userId: req.user.id,
                templateName: newTemplate.name,
            });
        } catch (error) {
            logger.error('Import template error:', { error: error instanceof Error ? error.message : error });
            res.status(500).json({ success: false, error: 'Erro ao importar template' });
        }
    }
}
