import { Router } from 'express';
import { ValidationController } from '../controllers/validationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const validationController = new ValidationController();

// All routes require authentication
router.use(authenticate);

// GET /api/validations - List validations with pagination and search
router.get('/', validationController.getValidations.bind(validationController));

// GET /api/validations/:id - Get single validation
router.get('/:id', validationController.getValidation.bind(validationController));

// GET /api/validations/:id/chart-data - Get chart data for validation
router.get('/:id/chart-data', validationController.getChartData.bind(validationController));

// GET /api/validations/suitcase/:suitcaseId/sensor-data - Get sensor data for validation
router.get('/suitcase/:suitcaseId/sensor-data', validationController.getSensorDataForValidation.bind(validationController));

// POST /api/validations - Create new validation
router.post('/', validationController.createValidation.bind(validationController));

// PUT /api/validations/:id/approval - Update validation approval
router.put('/:id/approval', validationController.updateApproval.bind(validationController));

// DELETE /api/validations/:id - Delete validation
router.delete('/:id', validationController.deleteValidation.bind(validationController));

export default router;