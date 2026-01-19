/**
 * Validation utilities for Custom Nmap Scan Builder
 * Provides robust validation for all scan configuration options
 */

import { ScanConfig, VALIDATION_RULES, ScanProfile } from '../types/scanConfig';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate target format (IPv4, CIDR, hostname)
 */
export const validateTarget = (target: string): ValidationError | null => {
  if (!target || target.trim().length === 0) {
    return { field: 'target', message: 'Target is required' };
  }

  const trimmedTarget = target.trim();
  
  // IPv4 address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // CIDR notation
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  // IP range
  const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
  // Hostname
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!ipv4Regex.test(trimmedTarget) && 
      !cidrRegex.test(trimmedTarget) && 
      !rangeRegex.test(trimmedTarget) && 
      !hostnameRegex.test(trimmedTarget)) {
    return { 
      field: 'target', 
      message: 'Invalid target format. Use IP address, CIDR, IP range, or hostname' 
    };
  }

  // Validate private IP ranges for security
  if (ipv4Regex.test(trimmedTarget) || cidrRegex.test(trimmedTarget)) {
    const isPrivateRange = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(trimmedTarget);
    if (!isPrivateRange) {
      return { 
        field: 'target', 
        message: 'Public IP scanning is restricted. Only private networks allowed (10.x.x.x, 172.16-31.x.x, 192.168.x.x)' 
      };
    }
  }

  return null;
};

/**
 * Validate port specification format
 */
export const validatePortsCustom = (ports: string): ValidationError | null => {
  if (!ports || ports.trim().length === 0) {
    return null; // Optional field
  }

  const normalizedPorts = ports.replace(/\s+/g, '');
  
  // Check against strict regex pattern
  if (!VALIDATION_RULES.PORTS_REGEX.test(normalizedPorts)) {
    return { 
      field: 'portsCustom', 
      message: 'Invalid port format. Use numbers, commas, and hyphens only (e.g., "22,80,443" or "1-1000")' 
    };
  }

  // Validate individual port numbers
  const parts = normalizedPorts.split(/[,-]/);
  for (const part of parts) {
    if (part === '') continue;
    
    const portNum = parseInt(part, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return { 
        field: 'portsCustom', 
        message: `Invalid port number: ${part}. Ports must be between 1-65535` 
      };
    }
  }

  return null;
};

/**
 * Validate numeric fields with range checking
 */
export const validateNumericField = (
  value: number | undefined, 
  fieldName: string, 
  min: number, 
  max: number
): ValidationError | null => {
  if (value === undefined) {
    return null; // Optional fields
  }

  if (!Number.isInteger(value)) {
    return { field: fieldName, message: `${fieldName} must be a whole number` };
  }

  if (value < min || value > max) {
    return { field: fieldName, message: `${fieldName} must be between ${min}-${max}` };
  }

  return null;
};

/**
 * Validate scan configuration for conflicts and inconsistencies
 */
export const validateScanConfigConflicts = (config: ScanConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check for conflicting TCP scan types
  if (config.tcpSynScan && config.tcpConnectScan) {
    errors.push({
      field: 'scanType',
      message: 'Cannot enable both SYN scan (-sS) and Connect scan (-sT). Choose one.'
    });
  }

  // Warn about OS detection requiring privileges
  if (config.osDetection) {
    errors.push({
      field: 'osDetection',
      message: 'OS detection (-O) may require administrative privileges'
    });
  }

  // Warn about SYN scan requiring privileges
  if (config.tcpSynScan) {
    errors.push({
      field: 'tcpSynScan',
      message: 'SYN scan (-sS) requires privileged access'
    });
  }

  // Warn about UDP scan performance
  if (config.udpScan) {
    errors.push({
      field: 'udpScan',
      message: 'UDP scan is significantly slower than TCP scanning'
    });
  }

  // Validate port mode and custom ports combination
  if (config.portMode === 'custom' && (!config.portsCustom || config.portsCustom.trim().length === 0)) {
    errors.push({
      field: 'portsCustom',
      message: 'Custom port mode requires specifying ports'
    });
  }

  if (config.portMode !== 'custom' && config.portsCustom) {
    errors.push({
      field: 'portsCustom',
      message: 'Ports custom field should be empty when not using custom port mode'
    });
  }

  return errors;
};

/**
 * Validate complete scan configuration
 */
export const validateScanConfig = (config: ScanConfig): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate required fields
  const targetError = validateTarget(config.target);
  if (targetError) {
    errors.push(targetError);
  }

  // Validate numeric fields
  const timeoutError = validateNumericField(
    config.hostTimeoutSeconds, 
    'hostTimeoutSeconds', 
    VALIDATION_RULES.HOST_TIMEOUT_MIN, 
    VALIDATION_RULES.HOST_TIMEOUT_MAX
  );
  if (timeoutError) errors.push(timeoutError);

  if (config.maxRetries !== undefined) {
    const retriesError = validateNumericField(
      config.maxRetries, 
      'maxRetries', 
      VALIDATION_RULES.MAX_RETRIES_MIN, 
      VALIDATION_RULES.MAX_RETRIES_MAX
    );
    if (retriesError) errors.push(retriesError);
  }

  if (config.minRate !== undefined) {
    const minRateError = validateNumericField(
      config.minRate, 
      'minRate', 
      VALIDATION_RULES.MIN_RATE_MIN, 
      VALIDATION_RULES.MIN_RATE_MAX
    );
    if (minRateError) errors.push(minRateError);
  }

  if (config.maxRate !== undefined) {
    const maxRateError = validateNumericField(
      config.maxRate, 
      'maxRate', 
      VALIDATION_RULES.MAX_RATE_MIN, 
      VALIDATION_RULES.MAX_RATE_MAX
    );
    if (maxRateError) errors.push(maxRateError);
  }

  // Validate ports if custom mode
  if (config.portMode === 'custom' && config.portsCustom) {
    const portsError = validatePortsCustom(config.portsCustom);
    if (portsError) errors.push(portsError);
  }

  // Check for configuration conflicts
  const conflictErrors = validateScanConfigConflicts(config);
  errors.push(...conflictErrors);

  return errors;
};

/**
 * Apply profile defaults to configuration
 */
export const applyProfileDefaults = (config: Partial<ScanConfig>, profile: ScanProfile): ScanConfig => {
  // Import here to avoid circular dependency
  const { PROFILE_PRESETS, DEFAULT_SCAN_CONFIG } = require('./scanConfig');
  
  const profileDefaults = PROFILE_PRESETS[profile];
  
  // Merge defaults: profile defaults -> user config -> required fields
  return {
    ...DEFAULT_SCAN_CONFIG,
    ...profileDefaults,
    ...config,
    scanProfile: profile
  } as ScanConfig;
};