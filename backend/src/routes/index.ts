import { Router } from 'express';
import authRoutes from './auth.routes';
import scanRoutes from './scan.routes';
import { NmapService } from '../services/nmapService';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/scans', scanRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
router.get('/health/detail', async (req, res) => {
  try {
    const nmapService = NmapService.getInstance();
    const nmapAvailable = await nmapService.isNmapAvailable();
    const nmapVersion = await nmapService.getNmapVersion();
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'API is running',
      details: {
        nmap: {
          available: nmapAvailable,
          version: nmapVersion
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'OK', 
      message: 'API is running',
      details: {
        nmap: {
          available: false,
          version: 'Error checking Nmap'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;