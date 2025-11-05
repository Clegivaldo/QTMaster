import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate, loginRateLimit } from '../middleware/auth.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', loginRateLimit, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;