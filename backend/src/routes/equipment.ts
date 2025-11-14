import { Router } from 'express';
import { EquipmentController } from '../controllers/equipmentController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, Permission } from '../middleware/authorization.js';

const router = Router();
const controller = new EquipmentController();

router.use(authenticate);

router.get('/brands', requirePermission(Permission.SYSTEM_CONFIG), controller.getBrands.bind(controller));
router.post('/brands', requirePermission(Permission.SYSTEM_CONFIG), controller.createBrand.bind(controller));
router.put('/brands/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.updateBrand.bind(controller));
router.delete('/brands/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.deleteBrand.bind(controller));

router.get('/types', requirePermission(Permission.SYSTEM_CONFIG), controller.getEquipmentTypes.bind(controller));
router.post('/types', requirePermission(Permission.SYSTEM_CONFIG), controller.createEquipmentType.bind(controller));
router.put('/types/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.updateEquipmentType.bind(controller));
router.delete('/types/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.deleteEquipmentType.bind(controller));

router.get('/models', requirePermission(Permission.SYSTEM_CONFIG), controller.getModels.bind(controller));
router.post('/models', requirePermission(Permission.SYSTEM_CONFIG), controller.createModel.bind(controller));
router.put('/models/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.updateModel.bind(controller));
router.delete('/models/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.deleteModel.bind(controller));

router.get('/equipment', requirePermission(Permission.SYSTEM_CONFIG), controller.getClientEquipments.bind(controller));
router.get('/equipment/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.getClientEquipmentById.bind(controller));
router.post('/equipment', requirePermission(Permission.SYSTEM_CONFIG), controller.createClientEquipment.bind(controller));
router.put('/equipment/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.updateClientEquipment.bind(controller));
router.delete('/equipment/:id', requirePermission(Permission.SYSTEM_CONFIG), controller.deleteClientEquipment.bind(controller));

export default router;
