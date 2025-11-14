import { Router } from 'express';
import { SensorController } from '../controllers/sensorController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';

const router = Router();
const sensorController = new SensorController();

// All routes require authentication
router.use(authenticate);

// GET /api/sensors - List sensors with pagination and search
router.get('/', requirePermission(Permission.SENSOR_READ), sensorController.getSensors.bind(sensorController));

// GET /api/sensors/:id - Get single sensor
router.get('/:id', requirePermission(Permission.SENSOR_READ), sensorController.getSensor.bind(sensorController));

// POST /api/sensors - Create new sensor
router.post('/', requirePermission(Permission.SENSOR_CREATE), sensorController.createSensor.bind(sensorController));

// PUT /api/sensors/:id - Update sensor
router.put('/:id', requirePermission(Permission.SENSOR_UPDATE), sensorController.updateSensor.bind(sensorController));

// DELETE /api/sensors/:id - Delete sensor
router.delete('/:id', requirePermission(Permission.SENSOR_DELETE), sensorController.deleteSensor.bind(sensorController));

export default router;