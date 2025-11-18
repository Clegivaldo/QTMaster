import { Router } from 'express';
import { ValidationController } from '../controllers/validationController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';

const router = Router();
const validationController = new ValidationController();

// All routes require authentication
router.use(authenticate);

// GET /api/validations - List validations with pagination and search
router.get('/', requirePermission(Permission.VALIDATION_READ), validationController.getValidations.bind(validationController));

// GET /api/validations/:id - Get single validation
router.get('/:id', requirePermission(Permission.VALIDATION_READ), validationController.getValidation.bind(validationController));

// GET /api/validations/:id/chart-data - Get chart data for validation
router.get('/:id/chart-data', requirePermission(Permission.VALIDATION_READ), validationController.getChartData.bind(validationController));

// GET /api/validations/:id/acceptance-windows - Get acceptance windows for validation
router.get('/:id/acceptance-windows', requirePermission(Permission.VALIDATION_READ), validationController.getAcceptanceWindows.bind(validationController));

// GET /api/validations/suitcase/:suitcaseId/sensor-data - Get sensor data for validation
router.get('/suitcase/:suitcaseId/sensor-data', requirePermission(Permission.VALIDATION_READ), validationController.getSensorDataForValidation.bind(validationController));

// POST /api/validations - Create new validation
router.post('/', requirePermission(Permission.VALIDATION_CREATE), validationController.createValidation.bind(validationController));

// PUT /api/validations/:id/approval - Update validation approval
router.put('/:id/approval', requirePermission(Permission.VALIDATION_APPROVE), validationController.updateApproval.bind(validationController));

// PUT /api/validations/:id/hidden-sensors - Update hidden sensors
router.put('/:id/hidden-sensors', requirePermission(Permission.VALIDATION_UPDATE), validationController.updateHiddenSensors.bind(validationController));

// PUT /api/validations/:validationId/imported-items/:itemId/visibility - Toggle visibility for imported data
router.put(
	'/:validationId/imported-items/:itemId/visibility',
	requirePermission(Permission.VALIDATION_UPDATE),
	validationController.toggleImportedItemVisibility.bind(validationController)
);

// DELETE /api/validations/:id - Delete validation
router.delete('/:id', requirePermission(Permission.VALIDATION_DELETE), validationController.deleteValidation.bind(validationController));

export default router;