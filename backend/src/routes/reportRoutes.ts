import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de relatórios
router.post('/generate/:validationId', ReportController.generateReport);
router.get('/preview/:validationId', ReportController.previewReport);
router.get('/', ReportController.listReports);
router.get('/:id', ReportController.getReport);
router.get('/:id/download', ReportController.downloadReport);
router.delete('/:id', ReportController.deleteReport);

export default router;