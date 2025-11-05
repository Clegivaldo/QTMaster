import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const reportController = new ReportController();

// All routes require authentication
router.use(authenticate);

// GET /api/reports - List reports with pagination and search
router.get('/', reportController.getReports.bind(reportController));

// GET /api/reports/statistics - Get report statistics
router.get('/statistics', reportController.getReportStatistics.bind(reportController));

// GET /api/reports/:id - Get single report
router.get('/:id', reportController.getReport.bind(reportController));

// GET /api/reports/:id/download - Download report PDF
router.get('/:id/download', reportController.downloadReport.bind(reportController));

// POST /api/reports/:id/generate-pdf - Generate PDF for report
router.post('/:id/generate-pdf', reportController.generatePdf.bind(reportController));

// GET /api/reports/:id/preview - Preview report PDF
router.get('/:id/preview', reportController.previewPdf.bind(reportController));

// POST /api/reports - Create new report
router.post('/', reportController.createReport.bind(reportController));

// PUT /api/reports/:id - Update report
router.put('/:id', reportController.updateReport.bind(reportController));

// DELETE /api/reports/:id - Delete report
router.delete('/:id', reportController.deleteReport.bind(reportController));

export default router;