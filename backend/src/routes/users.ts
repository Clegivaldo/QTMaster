import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/users/avatar/:filename - Servir avatar (público)
router.get('/avatar/:filename', UserController.serveAvatar);

// Todas as outras rotas requerem autenticação
router.use(authenticate);

// GET /api/users/profile - Buscar perfil do usuário
router.get('/profile', UserController.getProfile);

// PUT /api/users/profile - Atualizar perfil do usuário
router.put('/profile', UserController.updateProfile);

// POST /api/users/avatar - Upload de avatar
router.post('/avatar', UserController.uploadAvatar, UserController.updateAvatar);

export default router;