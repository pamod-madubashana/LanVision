/**
 * Frontend TypeScript interfaces for Custom Nmap Scan Builder
 * Mirrors backend types for consistency
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

// Profile preset configurations matching backend
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

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Command preview response
export interface CommandPreviewResponse {
  success: boolean;
  data?: {
    command: string;
    config: ScanConfig;
  };
  error?: {
    message: string;
  };
}

// Streaming types for real-time scan logs
export type ScanStatus = 'starting' | 'running' | 'done' | 'error';

export interface ScanLogEvent {
  message: string;
}

export interface ScanStatusEvent {
  status: ScanStatus;
}

export interface ScanDoneEvent {
  result: any; // Parsed scan result
}

export interface ScanErrorEvent {
  message: string;
}

export interface ScanSession {
  id: string;
  status: ScanStatus;
  logs: string[];
  result: any | null;
  errorMessage: string | null;
}

// EventSource message types
export interface SSEMessage {
  event: 'connected' | 'log' | 'status' | 'done' | 'error';
  data: string;
}

// Parsed event data types
export interface ConnectedEventData {
  scanId: string;
  status: ScanStatus;
}

export interface LogEventData {
  message: string;
}

export interface StatusEventData {
  status: ScanStatus;
}

export interface DoneEventData {
  result: any;
}

export interface ErrorEventData {
  message: string;
}