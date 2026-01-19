import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequiredFields, validateEmail } from '../middleware/validate';

const router = Router();

// Public routes
router.post('/register', 
  validateRequiredFields(['username', 'email', 'password', 'confirmPassword']),
  validateEmail,
  AuthController.register
);

router.post('/login', 
  validateRequiredFields(['username', 'password']),
  AuthController.login
);

// Admin route for initial setup
router.post('/create-admin', AuthController.createAdmin);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;