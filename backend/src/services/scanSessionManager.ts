/**
 * Scan Session Manager
 * Manages active scan sessions with real-time log streaming capabilities
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

export type ScanStatus = 'starting' | 'running' | 'done' | 'error';

export interface ScanSession {
  id: string;
  status: ScanStatus;
  createdAt: Date;
  logs: string[];
  xmlBuffer: string;
  result: any | null;
  errorMessage: string | null;
  target: string;
  profile: string;
  userId: string;
}

export interface ScanLogEvent {
  message: string;
  timestamp: Date;
}

export interface ScanStatusEvent {
  status: ScanStatus;
  timestamp: Date;
}

export interface ScanDoneEvent {
  result: any;
  timestamp: Date;
}

export interface ScanErrorEvent {
  message: string;
  timestamp: Date;
}

export class ScanSessionManager {
  private static instance: ScanSessionManager;
  private sessions: Map<string, ScanSession>;
  private eventEmitter: EventEmitter;
  private cleanupInterval: NodeJS.Timeout | null;

  private constructor() {
    this.sessions = new Map();
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50); // Increase limit for multiple listeners
    
    // Start cleanup interval to remove completed sessions after 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute
  }

  static getInstance(): ScanSessionManager {
    if (!ScanSessionManager.instance) {
      ScanSessionManager.instance = new ScanSessionManager();
    }
    return ScanSessionManager.instance;
  }

  /**
   * Create a new scan session
   */
  createSession(sessionId: string, target: string, profile: string, userId: string): ScanSession {
    const session: ScanSession = {
      id: sessionId,
      status: 'starting',
      createdAt: new Date(),
      logs: [],
      xmlBuffer: '',
      result: null,
      errorMessage: null,
      target,
      profile,
      userId
    };

    this.sessions.set(sessionId, session);
    logger.info('Scan session created', { sessionId, target, profile, userId });
    
    // Emit status change event
    this.emitStatusEvent(sessionId, 'starting');
    
    return session;
  }

  /**
   * Get scan session by ID
   */
  getSession(sessionId: string): ScanSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update scan session status
   */
  updateStatus(sessionId: string, status: ScanStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      logger.debug('Scan session status updated', { sessionId, status });
      this.emitStatusEvent(sessionId, status);
    }
  }

  /**
   * Add log entry to session
   */
  addLog(sessionId: string, message: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Keep only last 200 log lines to prevent memory issues
      if (session.logs.length >= 200) {
        session.logs.shift();
      }
      
      session.logs.push(message);
      
      // Emit log event for real-time streaming
      this.emitLogEvent(sessionId, message);
      
      logger.debug('Log added to session', { 
        sessionId, 
        logLength: session.logs.length,
        messagePreview: message.substring(0, 100) 
      });
    }
  }

  /**
   * Append XML output to buffer
   */
  appendXmlOutput(sessionId: string, xmlChunk: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.xmlBuffer += xmlChunk;
      logger.debug('XML output appended', { 
        sessionId, 
        bufferLength: session.xmlBuffer.length 
      });
    }
  }

  /**
   * Mark scan as completed with results
   */
  completeScan(sessionId: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'done';
      session.result = result;
      session.errorMessage = null;
      
      logger.info('Scan completed successfully', { 
        sessionId, 
        hostsUp: result?.stats?.hostsUp || 0,
        totalOpenPorts: result?.stats?.totalOpenPorts || 0
      });
      
      this.emitDoneEvent(sessionId, result);
    }
  }

  /**
   * Mark scan as failed with error
   */
  failScan(sessionId: string, errorMessage: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'error';
      session.errorMessage = errorMessage;
      session.result = null;
      
      logger.error('Scan failed', { sessionId, errorMessage });
      
      this.emitErrorEvent(sessionId, errorMessage);
    }
  }

  /**
   * Remove session (cleanup)
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      logger.info('Scan session removed', { sessionId });
    }
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): ScanSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );
  }

  /**
   * Cleanup expired sessions (completed scans older than 10 minutes)
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      // Remove completed/error sessions older than 10 minutes
      if ((session.status === 'done' || session.status === 'error') && 
          session.createdAt < tenMinutesAgo) {
        this.removeSession(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned expired scan sessions', { count: cleanedCount });
    }
  }

  /**
   * Event emitter methods for real-time streaming
   */
  onLog(sessionId: string, callback: (event: ScanLogEvent) => void): void {
    this.eventEmitter.on(`log:${sessionId}`, callback);
  }

  offLog(sessionId: string, callback: (event: ScanLogEvent) => void): void {
    this.eventEmitter.off(`log:${sessionId}`, callback);
  }

  onStatus(sessionId: string, callback: (event: ScanStatusEvent) => void): void {
    this.eventEmitter.on(`status:${sessionId}`, callback);
  }

  offStatus(sessionId: string, callback: (event: ScanStatusEvent) => void): void {
    this.eventEmitter.off(`status:${sessionId}`, callback);
  }

  onDone(sessionId: string, callback: (event: ScanDoneEvent) => void): void {
    this.eventEmitter.on(`done:${sessionId}`, callback);
  }

  offDone(sessionId: string, callback: (event: ScanDoneEvent) => void): void {
    this.eventEmitter.off(`done:${sessionId}`, callback);
  }

  onError(sessionId: string, callback: (event: ScanErrorEvent) => void): void {
    this.eventEmitter.on(`error:${sessionId}`, callback);
  }

  offError(sessionId: string, callback: (event: ScanErrorEvent) => void): void {
    this.eventEmitter.off(`error:${sessionId}`, callback);
  }

  private emitLogEvent(sessionId: string, message: string): void {
    this.eventEmitter.emit(`log:${sessionId}`, {
      message,
      timestamp: new Date()
    });
  }

  private emitStatusEvent(sessionId: string, status: ScanStatus): void {
    this.eventEmitter.emit(`status:${sessionId}`, {
      status,
      timestamp: new Date()
    });
  }

  private emitDoneEvent(sessionId: string, result: any): void {
    this.eventEmitter.emit(`done:${sessionId}`, {
      result,
      timestamp: new Date()
    });
  }

  private emitErrorEvent(sessionId: string, message: string): void {
    this.eventEmitter.emit(`error:${sessionId}`, {
      message,
      timestamp: new Date()
    });
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Remove all listeners
    this.eventEmitter.removeAllListeners();
    
    // Clear all sessions
    this.sessions.clear();
    
    logger.info('Scan session manager shut down');
  }
}

// Export singleton instance
export default ScanSessionManager.getInstance();