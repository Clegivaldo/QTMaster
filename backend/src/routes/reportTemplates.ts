import { Router } from 'express';
import { ReportTemplateController } from '../controllers/reportTemplateController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const reportTemplateController = new ReportTemplateController();

// All routes require authentication
router.use(authenticate);

// GET /api/report-templates - List templates with pagination and search
router.get('/', reportTemplateController.getTemplates.bind(reportTemplateController));

// GET /api/report-templates/active - Get only active templates
router.get('/active', reportTemplateController.getActiveTemplates.bind(reportTemplateController));

// GET /api/report-templates/:id - Get single template
router.get('/:id', reportTemplateController.getTemplate.bind(reportTemplateController));

// GET /api/report-templates/:id/preview - Preview template
router.get('/:id/preview', reportTemplateController.previewTemplate.bind(reportTemplateController));

// GET /api/report-templates/:id/versions - Get template versions
router.get('/:id/versions', reportTemplateController.getTemplateVersions.bind(reportTemplateController));

// POST /api/report-templates - Create new template
router.post('/', reportTemplateController.createTemplate.bind(reportTemplateController));

// POST /api/report-templates/upload - Upload template file
router.post('/upload', reportTemplateController.uploadTemplate.bind(reportTemplateController));

// PUT /api/report-templates/:id - Update template
router.put('/:id', reportTemplateController.updateTemplate.bind(reportTemplateController));

// DELETE /api/report-templates/:id - Delete template
router.delete('/:id', reportTemplateController.deleteTemplate.bind(reportTemplateController));

export default router;