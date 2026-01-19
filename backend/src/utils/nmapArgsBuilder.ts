/**
 * Nmap Arguments Builder for Custom Scan Builder
 * Safely constructs nmap command arguments from ScanConfig
 */

import { ScanConfig, PortMode, TimingTemplate, VerbosityLevel } from '../types/scanConfig';

/**
 * Build nmap arguments array from ScanConfig
 * @param config - The scan configuration
 * @returns Array of nmap arguments ready for spawn()
 */
export const buildNmapArgs = (config: ScanConfig): string[] => {
  const args: string[] = [];
  
  // Always include XML output to stdout
  args.push('-oX', '-');
  
  // Timing template
  args.push(`-${config.timingTemplate}`);
  
  // Discovery options
  if (config.noDnsResolution) {
    args.push('-n');
  }
  
  if (config.skipHostDiscovery || config.treatAsOnline) {
    args.push('-Pn');
  }
  
  // Detection options
  if (config.serviceDetection) {
    args.push('-sV');
  }
  
  if (config.osDetection) {
    args.push('-O');
  }
  
  // Port configuration
  args.push(...buildPortArgs(config));
  
  // Scan types (mutually exclusive TCP types handled in validation)
  if (config.tcpSynScan) {
    args.push('-sS');
  } else if (config.tcpConnectScan) {
    args.push('-sT');
  }
  
  if (config.udpScan) {
    args.push('-sU');
  }
  
  // Output filtering
  if (config.onlyOpenPorts) {
    args.push('--open');
  }
  
  // Performance options
  args.push(`--host-timeout=${config.hostTimeoutSeconds}s`);
  
  if (config.maxRetries !== undefined) {
    args.push(`--max-retries=${config.maxRetries}`);
  }
  
  if (config.minRate !== undefined) {
    args.push(`--min-rate=${config.minRate}`);
  }
  
  if (config.maxRate !== undefined) {
    args.push(`--max-rate=${config.maxRate}`);
  }
  
  // Verbosity
  args.push(...buildVerbosityArgs(config.verbosity));
  
  // Add stats every 2 seconds for streaming progress updates
  args.push('--stats-every', '2s');
  
  // Add target last
  args.push(config.target);
  
  return args;
};

/**
 * Build port-related arguments
 */
const buildPortArgs = (config: ScanConfig): string[] => {
  const args: string[] = [];
  
  switch (config.portMode) {
    case 'top-100':
      args.push('--top-ports=100');
      break;
    case 'top-1000':
      args.push('--top-ports=1000');
      break;
    case 'fast':
      args.push('-F');
      break;
    case 'custom':
      if (config.portsCustom) {
        // Normalize whitespace and validate format
        const cleanPorts = config.portsCustom.replace(/\s+/g, '');
        if (cleanPorts.length > 0) {
          args.push(`-p${cleanPorts}`);
        }
      }
      break;
    case 'default':
    default:
      // Nmap default port scanning
      break;
  }
  
  return args;
};

/**
 * Build verbosity arguments
 */
const buildVerbosityArgs = (verbosity: VerbosityLevel): string[] => {
  switch (verbosity) {
    case 1:
      return ['-v'];
    case 2:
      return ['-vv'];
    case 0:
    default:
      return [];
  }
};

/**
 * Generate human-readable command preview
 * Used for UI display and logging
 */
export const generateCommandPreview = (config: ScanConfig): string => {
  const args = buildNmapArgs(config);
  // Remove the target to show the command structure
  const argsWithoutTarget = args.slice(0, -1);
  return `nmap ${argsWithoutTarget.join(' ')} <target>`;
};

/**
 * Validate that generated arguments are safe
 * Double-checks that no dangerous flags are present
 */
export const validateGeneratedArgs = (args: string[]): boolean => {
  const dangerousFlags = [
    '--script', '--script-args', '--script-help', '--script-trace',
    '--reason', '--packet-trace', '--send-eth', '--send-ip',
    '--privileged', '--unprivileged', '--release-memory',
    '--datadir', '--servicedb', '--versiondb'
  ];
  
  // Check for dangerous flags
  for (const arg of args) {
    if (dangerousFlags.some(dangerous => arg.startsWith(dangerous))) {
      return false;
    }
    
    // Check for shell metacharacters
    if (/[\$\`\|\&\;\(\)\{\}\[\]<>]/.test(arg)) {
      return false;
    }
  }
  
  return true;
};