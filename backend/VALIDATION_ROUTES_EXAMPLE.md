import { Router } from 'express';
import { EditorTemplateController } from '../controllers/editorTemplateController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const controller = new EditorTemplateController();

// Existing routes
router.get('/', authenticate, controller.getTemplates.bind(controller));
router.get('/:id', authenticate, controller.getTemplate.bind(controller));
router.post('/', authenticate, controller.createTemplate.bind(controller));
router.put('/:id', authenticate, controller.updateTemplate.bind(controller));
router.delete('/:id', authenticate, controller.deleteTemplate.bind(controller));
router.post('/:id/duplicate', authenticate, controller.duplicateTemplate.bind(controller));
router.get('/search', authenticate, controller.searchTemplates.bind(controller));
router.post('/export-data', authenticate, controller.exportTemplateData.bind(controller));
router.post('/:id/export', authenticate, controller.exportTemplate.bind(controller));
router.post('/:id/generate-pdf', authenticate, controller.generatePDF);
router.post('/:id/preview-html', authenticate, controller.previewHTML);
router.get('/job/:jobId/status', authenticate, controller.getPDFJobStatus);

// NEW: Validation routes
router.post('/:id/validate', authenticate, controller.validateTemplate.bind(controller));
router.post('/:id/test', authenticate, controller.testTemplate.bind(controller));
router.get('/sample-data', authenticate, controller.getSampleData.bind(controller));

export default router;
