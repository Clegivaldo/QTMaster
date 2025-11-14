import { Router } from 'express';
import { EditorTemplateController } from '../controllers/editorTemplateController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';

const router = Router();
const editorTemplateController = new EditorTemplateController();

// All routes require authentication
router.use(authenticate);

// GET /api/editor-templates - List templates with pagination and filters
router.get('/', requirePermission(Permission.TEMPLATE_READ), editorTemplateController.getTemplates.bind(editorTemplateController));

// GET /api/editor-templates/search - Search templates
router.get('/search', requirePermission(Permission.TEMPLATE_READ), editorTemplateController.searchTemplates.bind(editorTemplateController));

// POST /api/editor-templates/validate - Validate template data
router.post('/validate', requirePermission(Permission.TEMPLATE_CREATE, Permission.TEMPLATE_UPDATE), editorTemplateController.validateTemplate.bind(editorTemplateController));

// POST /api/editor-templates/export - Export template (without ID, for new templates)
router.post('/export', requirePermission(Permission.TEMPLATE_READ), editorTemplateController.exportTemplateData.bind(editorTemplateController));

// GET /api/editor-templates/:id - Get single template
router.get('/:id', requirePermission(Permission.TEMPLATE_READ), editorTemplateController.getTemplate.bind(editorTemplateController));

// POST /api/editor-templates - Create new template
router.post('/', requirePermission(Permission.TEMPLATE_CREATE), editorTemplateController.createTemplate.bind(editorTemplateController));

// PUT /api/editor-templates/:id - Update template
router.put('/:id', requirePermission(Permission.TEMPLATE_UPDATE), editorTemplateController.updateTemplate.bind(editorTemplateController));

// DELETE /api/editor-templates/:id - Delete template
router.delete('/:id', requirePermission(Permission.TEMPLATE_DELETE), editorTemplateController.deleteTemplate.bind(editorTemplateController));

// POST /api/editor-templates/:id/duplicate - Duplicate template
router.post('/:id/duplicate', requirePermission(Permission.TEMPLATE_CREATE), editorTemplateController.duplicateTemplate.bind(editorTemplateController));

// POST /api/editor-templates/:id/export - Export template
router.post('/:id/export', requirePermission(Permission.TEMPLATE_READ), editorTemplateController.exportTemplate.bind(editorTemplateController));

export default router;