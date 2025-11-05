import { Router } from 'express';
import { FileController } from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const fileController = new FileController();

// All routes require authentication
router.use(authenticate);

// POST /api/files/upload - Upload and process files
router.post('/upload', (req, res, next) => {
  fileController.uploadMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }
    fileController.uploadFiles(req, res).catch(next);
  });
});

// GET /api/files/processing-status/:jobId - Get processing status
router.get('/processing-status/:jobId', fileController.getProcessingStatus.bind(fileController));

// GET /api/files/history - Get processing history
router.get('/history', fileController.getProcessingHistory.bind(fileController));

export default router;