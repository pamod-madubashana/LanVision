import { Router } from 'express';
import { ScanController } from '../controllers/ScanController';
import { authenticateToken } from '../middleware/auth';
import { validateRequiredFields, validateTargetFormat, validateScanProfile } from '../middleware/validate';

const router = Router();

// All scan routes require authentication
router.use(authenticateToken);

// Health check for nmap availability
router.get('/health/nmap', ScanController.checkNmapAvailability);

// Traditional scan routes
router.post('/start', 
  validateRequiredFields(['target', 'profile']),
  validateTargetFormat,
  validateScanProfile,
  ScanController.startScan
);

// Custom scan builder routes
router.post('/builder/start', 
  authenticateToken,
  ScanController.startCustomScan
);

router.post('/builder/preview', 
  authenticateToken,
  ScanController.getCommandPreview
);

router.get('/:scanId', ScanController.getScan);

// Stream scan logs using Server-Sent Events
router.get('/:scanId/stream', ScanController.streamScanLogs);

router.get('/', ScanController.getScanHistory);

router.get('/:scanId/hosts/:hostId', ScanController.getHostDetails);

router.post('/compare', 
  validateRequiredFields(['scanAId', 'scanBId']),
  ScanController.compareScans
);

export default router;