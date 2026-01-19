/**
 * Custom Nmap Scan Configuration Types
 * Defines all configurable options for the scan builder feature
 */

export type ScanProfile = 'quick' | 'balanced' | 'full' | 'custom';

export type TimingTemplate = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

export type PortMode = 'default' | 'top-100' | 'top-1000' | 'fast' | 'custom';

export type VerbosityLevel = 0 | 1 | 2;

export interface ScanConfig {
  // Basic configuration
  target: string;
  scanProfile: ScanProfile;
  
  // Timing and performance
  timingTemplate: TimingTemplate;
  hostTimeoutSeconds: number;
  maxRetries?: number;
  minRate?: number;
  maxRate?: number;
  
  // Detection options
  serviceDetection: boolean;
  osDetection: boolean;
  
  // Discovery options
  noDnsResolution: boolean;
  skipHostDiscovery: boolean;
  onlyOpenPorts: boolean;
  
  // Port configuration
  portMode: PortMode;
  portsCustom?: string;
  
  // Scan types (mutually exclusive for TCP)
  tcpSynScan: boolean;
  tcpConnectScan: boolean;
  udpScan: boolean;
  
  // Convenience alias
  treatAsOnline: boolean;
  
  // Output verbosity
  verbosity: VerbosityLevel;
}

// Profile preset configurations
export const PROFILE_PRESETS: Record<ScanProfile, Partial<ScanConfig>> = {
  quick: {
    timingTemplate: 'T4',
    serviceDetection: false,
    osDetection: false,
    skipHostDiscovery: false,
    onlyOpenPorts: true,
    portMode: 'fast',
    tcpSynScan: false,
    tcpConnectScan: true,
    udpScan: false,
    verbosity: 0,
    hostTimeoutSeconds: 300
  },
  balanced: {
    timingTemplate: 'T3',
    serviceDetection: true,
    osDetection: false,
    skipHostDiscovery: false,
    onlyOpenPorts: true,
    portMode: 'default',
    tcpSynScan: false,
    tcpConnectScan: true,
    udpScan: false,
    verbosity: 1,
    hostTimeoutSeconds: 600
  },
  full: {
    timingTemplate: 'T4',
    serviceDetection: true,
    osDetection: true,
    skipHostDiscovery: true,
    onlyOpenPorts: true,
    portMode: 'default',
    tcpSynScan: false,
    tcpConnectScan: true,
    udpScan: false,
    verbosity: 1,
    hostTimeoutSeconds: 600
  },
  custom: {}
};

// Default configuration values
export const DEFAULT_SCAN_CONFIG: Omit<ScanConfig, 'target' | 'scanProfile'> = {
  timingTemplate: 'T4',
  hostTimeoutSeconds: 600,
  serviceDetection: false,
  osDetection: false,
  noDnsResolution: true,
  skipHostDiscovery: false,
  onlyOpenPorts: true,
  portMode: 'default',
  tcpSynScan: false,
  tcpConnectScan: true,
  udpScan: false,
  treatAsOnline: false,
  verbosity: 0
};

// Validation constants
export const VALIDATION_RULES = {
  HOST_TIMEOUT_MIN: 1,
  HOST_TIMEOUT_MAX: 3600,
  MAX_RETRIES_MIN: 0,
  MAX_RETRIES_MAX: 10,
  MIN_RATE_MIN: 1,
  MIN_RATE_MAX: 100000,
  MAX_RATE_MIN: 1,
  MAX_RATE_MAX: 100000,
  PORTS_REGEX: /^[\d,-\s]+$/,
  TARGET_REGEX: /^[a-zA-Z0-9.\-:/]+$/
};