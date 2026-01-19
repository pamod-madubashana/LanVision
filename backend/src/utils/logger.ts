import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}

class Logger {
  private logFilePath: string;
  private logLevel: LogLevel;

  constructor() {
    this.logFilePath = path.join(__dirname, '../../logs/app.log');
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    
    // Create logs directory if it doesn't exist
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLogEntry(level: LogLevel, message: string, meta?: any): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };
    
    return JSON.stringify(entry);
  }

  private writeLog(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLogEntry(level, message, meta);
    
    // Write to file
    fs.appendFileSync(this.logFilePath, logEntry + '\n');
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${level}] ${message}`, meta || '');
    }
  }

  error(message: string, meta?: any): void {
    this.writeLog(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.writeLog(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.writeLog(LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.writeLog(LogLevel.DEBUG, message, meta);
  }

  // Audit logging for security events
  audit(userId: string, action: string, details?: any): void {
    const message = `AUDIT: User ${userId} performed ${action}`;
    this.info(message, details);
  }

  // Scan logging
  scanEvent(scanId: string, event: string, details?: any): void {
    const message = `SCAN: ${scanId} - ${event}`;
    this.info(message, details);
  }
}

export default new Logger();