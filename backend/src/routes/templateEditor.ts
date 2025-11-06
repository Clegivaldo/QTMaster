import { Router } from 'express';
import { TemplateEditorController } from '../controllers/templateEditorController.js';
import { TemplateEditorControllerSimple } from '../controllers/templateEditorControllerSimple.js';

const router = Router();

// ⚠️ ROTAS LEGADAS - Editor externo (mantidas para compatibilidade/testes)
// O novo editor integrado (EditorLayoutProfissional) não usa essas rotas

// Rota principal do editor visual legado (sem autenticação para facilitar testes)
router.get('/', TemplateEditorController.getEditor);

// Rota para o editor simples e funcional legado
router.get('/simple', TemplateEditorControllerSimple.getEditor);

// API endpoints legados para o editor externo
router.get('/gallery', TemplateEditorController.getImageGallery);
router.post('/preview', TemplateEditorController.previewTemplate);
router.post('/save', TemplateEditorController.saveTemplate);

export default router;