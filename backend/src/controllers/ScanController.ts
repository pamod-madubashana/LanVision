import { Request, Response } from 'express';
import Scan from '../models/Scan';
import { NmapService } from '../services/nmapService';
import { NmapXmlParser } from '../services/parser/nmapXmlParser';
import logger from '../utils/logger';

interface ScanRequest {
  target: string;
  profile: 'quick' | 'full';
  name?: string;
}

export class ScanController {
  private nmapService: NmapService;
  private xmlParser: NmapXmlParser;

  constructor() {
    this.nmapService = NmapService.getInstance();
    this.xmlParser = new NmapXmlParser();
  }

  // Start a new scan
  static async startScan(req: Request, res: Response) {
    try {
      const { target, profile, name }: ScanRequest = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      if (!target || !profile) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Target and profile are required'
          }
        });
      }

      // Create initial scan record
      const scan = new Scan({
        userId,
        name: name || `Scan of ${target}`,
        target,
        profile,
        startedAt: new Date(),
        status: 'pending'
      });

      await scan.save();

      logger.scanEvent(scan._id.toString(), 'started', { 
        target, 
        profile,
        userId 
      });

      // Start scan in background
      ScanController.executeScanInBackground(scan._id.toString());

      res.status(202).json({
        success: true,
        data: {
          scanId: scan._id,
          status: 'pending',
          message: 'Scan started successfully'
        }
      });

    } catch (error: any) {
      logger.error('Start scan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start scan'
        }
      });
    }
  }

  // Execute scan in background
  private static async executeScanInBackground(scanId: string) {
    try {
      const scan = await Scan.findById(scanId);
      if (!scan) return;

      const nmapService = NmapService.getInstance();
      
      // Update status to running
      scan.status = 'running';
      await scan.save();

      // Execute Nmap scan
      const result = await nmapService.executeScan({
        target: scan.target,
        profile: scan.profile
      });

      // Parse results
      const parsedResult = new NmapXmlParser().parse(result.stdout);

      // Update scan with results
      scan.results = parsedResult.hosts;
      scan.summary = {
        totalHosts: parsedResult.stats.totalHosts,
        hostsUp: parsedResult.stats.hostsUp,
        totalOpenPorts: parsedResult.stats.totalOpenPorts
      };
      scan.finishedAt = new Date();
      scan.durationMs = Math.round(parsedResult.stats.durationSeconds * 1000);
      scan.status = 'completed';

      await scan.save();

      logger.scanEvent(scanId, 'completed', {
        hosts: parsedResult.stats.hostsUp,
        ports: parsedResult.stats.totalOpenPorts,
        duration: parsedResult.stats.durationSeconds
      });

    } catch (error: any) {
      logger.error('Background scan execution failed:', { 
        scanId, 
        error: error.message 
      });

      // Update scan status to failed
      try {
        const scan = await Scan.findById(scanId);
        if (scan) {
          scan.status = 'failed';
          scan.finishedAt = new Date();
          await scan.save();
        }
      } catch (updateError) {
        logger.error('Failed to update scan status after error:', updateError);
      }
    }
  }

  // Get scan by ID
  static async getScan(req: Request, res: Response) {
    try {
      const { scanId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      const scan = await Scan.findOne({ _id: scanId, userId });

      if (!scan) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Scan not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          scan: {
            id: scan._id,
            name: scan.name,
            target: scan.target,
            profile: scan.profile,
            status: scan.status,
            startedAt: scan.startedAt,
            finishedAt: scan.finishedAt,
            durationMs: scan.durationMs,
            summary: scan.summary,
            results: scan.results
          }
        }
      });

    } catch (error: any) {
      logger.error('Get scan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Get scan history (paginated)
  static async getScanHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      const total = await Scan.countDocuments({ userId });
      const scans = await Scan.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name target profile status startedAt finishedAt summary');

      res.json({
        success: true,
        data: {
          scans: scans.map(scan => ({
            id: scan._id,
            name: scan.name,
            target: scan.target,
            profile: scan.profile,
            status: scan.status,
            startedAt: scan.startedAt,
            finishedAt: scan.finishedAt,
            summary: scan.summary
          })),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalScans: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error: any) {
      logger.error('Get scan history error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Get host details from scan - simplified approach
  static async getHostDetails(req: Request, res: Response) {
    try {
      const { scanId, hostId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      const scan = await Scan.findOne({ _id: scanId, userId });

      if (!scan) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Scan not found'
          }
        });
      }

      // Since we can't reliably find by _id in the results array,
      // we'll return the host by index or implement a different approach
      const hostIndex = parseInt(Array.isArray(hostId) ? hostId[0] : hostId);
      if (isNaN(hostIndex) || hostIndex < 0 || hostIndex >= scan.results.length) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Host not found'
          }
        });
      }

      const host = scan.results[hostIndex];

      res.json({
        success: true,
        data: {
          host
        }
      });

    } catch (error: any) {
      logger.error('Get host details error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }

  // Check Nmap availability
  static async checkNmapAvailability(req: Request, res: Response) {
    try {
      const nmapService = NmapService.getInstance();
      
      const isAvailable = await nmapService.isNmapAvailable();
      const version = await nmapService.getNmapVersion();
      
      res.json({
        success: true,
        data: {
          nmapAvailable: isAvailable,
          version: version
        }
      });
    } catch (error: any) {
      logger.error('Check Nmap availability error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to check Nmap availability'
        }
      });
    }
  }

  // Compare two scans
  static async compareScans(req: Request, res: Response) {
    try {
      const { scanAId, scanBId } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      if (!scanAId || !scanBId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Both scan IDs are required'
          }
        });
      }

      const [scanA, scanB] = await Promise.all([
        Scan.findOne({ _id: scanAId, userId }),
        Scan.findOne({ _id: scanBId, userId })
      ]);

      if (!scanA || !scanB) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'One or both scans not found'
          }
        });
      }

      // Simple comparison logic - can be enhanced
      const comparison = {
        scanA: {
          id: scanA._id,
          name: scanA.name,
          target: scanA.target,
          hostsUp: scanA.summary.hostsUp,
          totalOpenPorts: scanA.summary.totalOpenPorts
        },
        scanB: {
          id: scanB._id,
          name: scanB.name,
          target: scanB.target,
          hostsUp: scanB.summary.hostsUp,
          totalOpenPorts: scanB.summary.totalOpenPorts
        },
        differences: {
          hostsUpDiff: scanB.summary.hostsUp - scanA.summary.hostsUp,
          portsDiff: scanB.summary.totalOpenPorts - scanA.summary.totalOpenPorts
        }
      };

      res.json({
        success: true,
        data: {
          comparison
        }
      });

    } catch (error: any) {
      logger.error('Compare scans error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    }
  }
}