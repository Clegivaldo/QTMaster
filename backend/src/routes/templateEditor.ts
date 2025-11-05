import { Router } from 'express';
import { TemplateEditorController } from '../controllers/templateEditorController.js';

const router = Router();

// Rota principal do editor visual (sem autenticação para facilitar testes)
router.get('/', TemplateEditorController.getEditor);

// API endpoints para o editor
router.get('/gallery', TemplateEditorController.getImageGallery);
router.post('/preview', TemplateEditorController.previewTemplate);
router.post('/save', TemplateEditorController.saveTemplate);

export default router;