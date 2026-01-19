import { Request, Response } from 'express';
import Scan from '../models/Scan';
import { NmapService } from '../services/nmapService';
import { NmapXmlParser } from '../services/parser/nmapXmlParser';
import logger from '../utils/logger';
import { ScanConfig, ScanProfile } from '../types/scanConfig';
import { generateCommandPreview } from '../utils/nmapArgsBuilder';
import scanSessionManager from '../services/scanSessionManager';

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

      logger.info('Scan session created', { sessionId: scan._id.toString(), target, profile, userId });

      await scan.save();

      // Create scan session for streaming
      const session = scanSessionManager.createSession(
        scan._id.toString(),
        target,
        profile,
        userId
      );

      logger.scanEvent(scan._id.toString(), 'started', { 
        target, 
        profile,
        userId,
        sessionId: session.id
      });

      // Start scan in background with streaming
      ScanController.executeScanInBackground(scan._id.toString(), session.id);

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

  // Execute scan in background with streaming support
  private static async executeScanInBackground(scanId: string, sessionId: string) {
    try {
      const scan = await Scan.findById(scanId);
      if (!scan) return;

      const nmapService = NmapService.getInstance();
      
      // Update status to running
      scan.status = 'running';
      await scan.save();

      // Update session status to running
      scanSessionManager.updateStatus(sessionId, 'running');

      // Build scan config for streaming execution
      const scanConfig: ScanConfig = {
        target: scan.target,
        scanProfile: scan.profile as ScanProfile,
        timingTemplate: 'T4',
        hostTimeoutSeconds: 600,
        serviceDetection: scan.profile === 'full',
        osDetection: scan.profile === 'full',
        noDnsResolution: true,
        skipHostDiscovery: false,
        onlyOpenPorts: true,
        portMode: 'default',
        tcpSynScan: false,
        tcpConnectScan: true,
        udpScan: false,
        treatAsOnline: false,
        verbosity: 2  // Higher verbosity for more detailed progress logs
      };

      // Execute Nmap scan with streaming
      const result = await nmapService.executeScanWithStreaming(scanConfig, scanId);

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
      
      // Calculate duration based on actual execution time if not available from nmap output
      if (parsedResult.stats.durationSeconds > 0) {
        scan.durationMs = Math.round(parsedResult.stats.durationSeconds * 1000);
      } else {
        // Fallback to time difference between start and finish
        const start = scan.startedAt ? new Date(scan.startedAt).getTime() : Date.now();
        const finish = new Date().getTime();
        scan.durationMs = finish - start;
      }
      
      scan.status = 'completed';

      await scan.save();

      // Mark session as completed
      scanSessionManager.completeScan(sessionId, parsedResult);

      logger.scanEvent(scanId, 'completed', {
        hosts: parsedResult.stats.hostsUp,
        ports: parsedResult.stats.totalOpenPorts,
        duration: parsedResult.stats.durationSeconds,
        sessionId
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

  // Start custom scan with builder configuration
  static async startCustomScan(req: Request, res: Response) {
    try {
      const scanConfig: ScanConfig = req.body;
      const userId = (req as any).user?.userId;
      const scanName = req.body.name || `Custom Scan of ${scanConfig.target}`;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      // Create initial scan record
      const scan = new Scan({
        userId,
        name: scanName,
        target: scanConfig.target,
        profile: scanConfig.scanProfile,
        startedAt: new Date(),
        status: 'pending'
      });

      logger.info('Custom scan session created', { sessionId: scan._id.toString(), target: scanConfig.target, profile: scanConfig.scanProfile, userId });

      await scan.save();

      // Create scan session BEFORE starting execution
      const sessionId = scan._id.toString();
      scanSessionManager.createSession(sessionId, scanConfig.target, scanConfig.scanProfile, userId);
      
      logger.scanEvent(sessionId, 'custom-started', { 
        target: scanConfig.target, 
        profile: scanConfig.scanProfile,
        userId 
      });

      // Start custom scan with streaming
      ScanController.executeCustomScanWithStreaming(sessionId, scanConfig, userId);

      res.status(202).json({
        success: true,
        data: {
          scanId: scan._id,
          status: 'pending',
          message: 'Custom scan started successfully'
        }
      });

    } catch (error: any) {
      logger.error('Start custom scan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to start custom scan'
        }
      });
    }
  }

  // Execute custom scan with streaming
  private static async executeCustomScanWithStreaming(scanId: string, scanConfig: ScanConfig, userId: string) {
    try {
      const scan = await Scan.findById(scanId);
      if (!scan) return;

      const nmapService = NmapService.getInstance();
      
      // Session already created in startCustomScan method
      // Debug: Verify session exists
      const session = scanSessionManager.getSession(scanId);
      logger.debug('Session verification in execution', { sessionId: scanId, sessionExists: !!session });
      
      // Update status to running
      scan.status = 'running';
      await scan.save();

      // Execute Nmap scan with streaming
      const result = await nmapService.executeScanWithStreaming(scanConfig, scanId);

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
      
      // Calculate duration
      if (parsedResult.stats.durationSeconds > 0) {
        scan.durationMs = Math.round(parsedResult.stats.durationSeconds * 1000);
      } else {
        const start = scan.startedAt ? new Date(scan.startedAt).getTime() : Date.now();
        const finish = new Date().getTime();
        scan.durationMs = finish - start;
      }
      
      scan.status = 'completed';

      await scan.save();

      logger.scanEvent(scanId, 'custom-completed', {
        hosts: parsedResult.stats.hostsUp,
        ports: parsedResult.stats.totalOpenPorts,
        duration: parsedResult.stats.durationSeconds
      });

    } catch (error: any) {
      logger.error('Background custom scan execution failed:', { 
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

  // Generate command preview for scan configuration
  static async getCommandPreview(req: Request, res: Response) {
    try {
      const scanConfig: ScanConfig = req.body;
      
      // Generate command preview
      const commandPreview = generateCommandPreview(scanConfig);
      
      res.json({
        success: true,
        data: {
          command: commandPreview,
          config: scanConfig
        }
      });

    } catch (error: any) {
      logger.error('Command preview error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate command preview'
        }
      });
    }
  }

  // Stream scan progress logs using Server-Sent Events
  static async streamScanLogs(req: Request, res: Response) {
    try {
      const scanId = Array.isArray(req.params.scanId) ? req.params.scanId[0] : req.params.scanId;
      const userId = (req as any).user?.userId;

      logger.debug('Stream endpoint called', { scanId, userId: userId || 'no-user' });

      if (!userId) {
        logger.warn('Stream request without authentication', { scanId });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required'
          }
        });
      }

      // Check if session exists
      const session = scanSessionManager.getSession(scanId as string);
      logger.debug('Session lookup result', { 
        scanId, 
        sessionFound: !!session,
        sessionStatus: session?.status,
        sessionUserId: session?.userId,
        requestedUserId: userId
      });
      
      // If session not found, check if scan exists in DB
      if (!session) {
        const dbScan = await Scan.findById(scanId);
        logger.debug('DB scan lookup result', {
          scanId,
          dbScanFound: !!dbScan,
          dbScanUserId: dbScan?.userId
        });
      }
      
      if (!session) {
        // Log all active sessions for debugging
        const userSessions = scanSessionManager.getUserSessions(userId);
        logger.debug('User sessions', { 
          userId, 
          sessionCount: userSessions.length,
          sessionIds: userSessions.map(s => s.id)
        });
        
        // Log all sessions in memory for comprehensive debugging
        const allSessions = Array.from(scanSessionManager['sessions'].entries());
        logger.debug('All sessions in memory', {
          totalSessions: allSessions.length,
          sessionDetails: allSessions.map(([id, sess]) => ({
            id,
            status: sess.status,
            userId: sess.userId,
            createdAt: sess.createdAt
          }))
        });
        
        return res.status(404).json({
          success: false,
          error: {
            message: 'Scan session not found'
          }
        });
      }

      // Verify user owns this scan
      if (session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied'
          }
        });
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable buffering for nginx
      });

      // Send initial connection confirmation
      const connectedData = { scanId: scanId as string, status: session.status };
      res.write(`event: connected\ndata: ${JSON.stringify(connectedData)}\n\n`);

      // Send existing buffered logs immediately
      if (session.logs.length > 0) {
        session.logs.forEach(log => {
          const dataObj = { message: log };
          res.write(`event: log\ndata: ${JSON.stringify(dataObj)}\n\n`);
        });
      }

      // Set up event listeners for real-time updates
      const logHandler = (event: any) => {
        const dataObj = { message: event.message };
        res.write(`event: log\ndata: ${JSON.stringify(dataObj)}\n\n`);
      };

      const statusHandler = (event: any) => {
        const dataObj = { status: event.status };
        res.write(`event: status\ndata: ${JSON.stringify(dataObj)}\n\n`);
      };

      const doneHandler = (event: any) => {
        const dataObj = { result: event.result };
        res.write(`event: done\ndata: ${JSON.stringify(dataObj)}\n\n`);
        cleanup();
      };

      const errorHandler = (event: any) => {
        const dataObj = { message: event.message };
        res.write(`event: error\ndata: ${JSON.stringify(dataObj)}\n\n`);
        cleanup();
      };

      // Register event listeners
      scanSessionManager.onLog(scanId as string, logHandler);
      scanSessionManager.onStatus(scanId as string, statusHandler);
      scanSessionManager.onDone(scanId as string, doneHandler);
      scanSessionManager.onError(scanId as string, errorHandler);

      // Cleanup function
      const cleanup = () => {
        scanSessionManager.offLog(scanId as string, logHandler);
        scanSessionManager.offStatus(scanId as string, statusHandler);
        scanSessionManager.offDone(scanId as string, doneHandler);
        scanSessionManager.offError(scanId as string, errorHandler);
        res.end();
      };

      // Handle client disconnect
      req.on('close', cleanup);
      req.on('error', cleanup);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 25000);

      // Cleanup keep-alive on disconnect
      req.on('close', () => {
        clearInterval(keepAlive);
      });

      logger.debug('SSE connection established', { scanId, userId });

    } catch (error: any) {
      logger.error('SSE stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to establish log stream'
          }
        });
      }
    }
  }
}