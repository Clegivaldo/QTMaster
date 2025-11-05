import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/reports - List reports with pagination and filters
router.get('/', ReportController.listReports);

// GET /api/reports/:id - Get single report
router.get('/:id', ReportController.getReport);

// GET /api/reports/:id/download - Download report PDF
router.get('/:id/download', ReportController.downloadReport);

// POST /api/reports/generate/:validationId - Generate PDF for validation
router.post('/generate/:validationId', ReportController.generateReport);

// GET /api/reports/preview/:validationId - Preview report PDF
router.get('/preview/:validationId', ReportController.previewReport);

// DELETE /api/reports/:id - Delete report
router.delete('/:id', ReportController.deleteReport);

export default router;