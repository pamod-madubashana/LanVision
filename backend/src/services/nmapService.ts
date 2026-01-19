import { spawn } from 'child_process';
import { sanitizeIP, validateScanArgs, escapeShellArg } from '../utils/sanitize';
import logger from '../utils/logger';

export interface NmapScanConfig {
  target: string;
  profile: 'quick' | 'full';
  customPorts?: string;
  timeout?: number;
}

export interface NmapScanResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export class NmapService {
  private static instance: NmapService;
  
  private constructor() {}

  static getInstance(): NmapService {
    if (!NmapService.instance) {
      NmapService.instance = new NmapService();
    }
    return NmapService.instance;
  }

  // Execute Nmap scan with safety checks
  async executeScan(config: NmapScanConfig): Promise<NmapScanResult> {
    const startTime = Date.now();
    
    try {
      // Validate target
      const sanitizedTarget = sanitizeIP(config.target);
      if (!sanitizedTarget) {
        throw new Error(`Invalid target format: ${config.target}`);
      }

      // Build Nmap arguments based on profile
      const args = this.buildNmapArguments(config, sanitizedTarget);
      
      // Validate arguments for security
      if (!validateScanArgs(args)) {
        throw new Error('Invalid or unsafe Nmap arguments detected');
      }

      logger.info('Starting Nmap scan', { 
        target: sanitizedTarget, 
        profile: config.profile,
        args 
      });

      // Execute Nmap
      const result = await this.runNmapCommand(args, config.timeout);
      
      const duration = Date.now() - startTime;
      
      logger.scanEvent('nmap-scan', 'completed', {
        target: sanitizedTarget,
        duration,
        exitCode: result.exitCode
      });

      return {
        ...result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Nmap scan failed', {
        target: config.target,
        error: error.message,
        duration
      });

      throw new Error(`Nmap scan failed: ${error.message}`);
    }
  }

  // Build Nmap arguments based on scan profile
  private buildNmapArguments(config: NmapScanConfig, target: string): string[] {
    const args: string[] = ['-oX', '-']; // Output as XML to stdout

    // Add timing template
    args.push('-T4');

    switch (config.profile) {
      case 'quick':
        args.push('-F'); // Fast scan (fewer ports)
        break;
        
      case 'full':
        args.push('-sV'); // Service version detection
        args.push('-O');  // OS detection
        break;
    }

    // Add custom ports if specified
    if (config.customPorts) {
      args.push(`-p${config.customPorts}`);
    }

    // Disable DNS resolution for speed
    args.push('-n');
    
    // Treat all hosts as online
    args.push('-Pn');

    // Only show open ports
    args.push('--open');

    // Set host timeout
    const timeout = config.timeout || 600000; // 10 minutes default
    args.push(`--host-timeout=${Math.floor(timeout / 1000)}s`);

    // Add target
    args.push(target);

    return args;
  }

  // Execute Nmap command safely
  private runNmapCommand(args: string[], timeoutMs?: number): Promise<NmapScanResult> {
    return new Promise((resolve, reject) => {
      const timeout = timeoutMs || 600000; // 10 minutes default
      
      // Determine Nmap executable based on OS
      const nmapExecutable = process.platform === 'win32' ? 'nmap.exe' : 'nmap';
      
      logger.debug('Executing Nmap command', { 
        executable: nmapExecutable,
        args: args.map(escapeShellArg)
      });

      const nmapProcess = spawn(nmapExecutable, args, {
        windowsHide: true,
        timeout: timeout
      });

      let stdout = '';
      let stderr = '';

      nmapProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      nmapProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      nmapProcess.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code,
          duration: 0 // Will be set by caller
        });
      });

      nmapProcess.on('error', (error) => {
        if (error.message.includes('spawn nmap')) {
          reject(new Error('Nmap is not installed or not in PATH. Please install Nmap to use this feature.'));
        } else {
          reject(new Error(`Nmap execution error: ${error.message}`));
        }
      });

      // Handle timeout
      setTimeout(() => {
        if (!nmapProcess.killed) {
          nmapProcess.kill();
          reject(new Error(`Nmap scan timed out after ${timeout}ms`));
        }
      }, timeout);
    });
  }

  // Check if Nmap is available
  async isNmapAvailable(): Promise<boolean> {
    try {
      const result = await this.runNmapCommand(['--version'], 5000);
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  // Get Nmap version
  async getNmapVersion(): Promise<string> {
    try {
      const result = await this.runNmapCommand(['--version'], 5000);
      if (result.exitCode === 0) {
        const versionLine = result.stdout.split('\n')[0];
        return versionLine || 'Unknown version';
      }
      return 'Unable to determine version';
    } catch (error) {
      return 'Nmap not available';
    }
  }
}