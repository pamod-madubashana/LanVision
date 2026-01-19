import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;