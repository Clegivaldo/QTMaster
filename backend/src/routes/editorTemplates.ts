import { Router } from 'express';
import { EditorTemplateController } from '../controllers/editorTemplateController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const editorTemplateController = new EditorTemplateController();

// All routes require authentication
router.use(authenticate);

// GET /api/editor-templates - List templates with pagination and filters
router.get('/', editorTemplateController.getTemplates.bind(editorTemplateController));

// GET /api/editor-templates/search - Search templates
router.get('/search', editorTemplateController.searchTemplates.bind(editorTemplateController));

// POST /api/editor-templates/validate - Validate template data
router.post('/validate', editorTemplateController.validateTemplate.bind(editorTemplateController));

// GET /api/editor-templates/:id - Get single template
router.get('/:id', editorTemplateController.getTemplate.bind(editorTemplateController));

// POST /api/editor-templates - Create new template
router.post('/', editorTemplateController.createTemplate.bind(editorTemplateController));

// PUT /api/editor-templates/:id - Update template
router.put('/:id', editorTemplateController.updateTemplate.bind(editorTemplateController));

// DELETE /api/editor-templates/:id - Delete template
router.delete('/:id', editorTemplateController.deleteTemplate.bind(editorTemplateController));

// POST /api/editor-templates/:id/duplicate - Duplicate template
router.post('/:id/duplicate', editorTemplateController.duplicateTemplate.bind(editorTemplateController));

// POST /api/editor-templates/:id/export - Export template
router.post('/:id/export', editorTemplateController.exportTemplate.bind(editorTemplateController));

export default router;