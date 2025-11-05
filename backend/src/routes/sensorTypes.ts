import { Router } from 'express';
import { SensorTypeController } from '../controllers/sensorTypeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const sensorTypeController = new SensorTypeController();

// All routes require authentication
router.use(authenticate);

// GET /api/sensor-types - List sensor types
router.get('/', sensorTypeController.getSensorTypes.bind(sensorTypeController));

// GET /api/sensor-types/:id - Get single sensor type
router.get('/:id', sensorTypeController.getSensorType.bind(sensorTypeController));

// POST /api/sensor-types - Create new sensor type
router.post('/', sensorTypeController.createSensorType.bind(sensorTypeController));

// PUT /api/sensor-types/:id - Update sensor type
router.put('/:id', sensorTypeController.updateSensorType.bind(sensorTypeController));

// DELETE /api/sensor-types/:id - Delete sensor type
router.delete('/:id', sensorTypeController.deleteSensorType.bind(sensorTypeController));

export default router;