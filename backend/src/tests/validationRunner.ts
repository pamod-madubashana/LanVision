/**
 * Validation utility tests for Custom Nmap Scan Builder
 * Standalone tests that can be run without test framework dependencies
 */

import { 
  validateTarget, 
  validatePortsCustom, 
  validateNumericField, 
  validateScanConfigConflicts,
  validateScanConfig,
  applyProfileDefaults
} from '../utils/scanValidation';
import { ScanConfig } from '../types/scanConfig';

// Test runner function
function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error);
    throw error;
  }
}

// Assertion helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNull(value: any, message: string) {
  assert(value === null, message);
}

function assertNotNull(value: any, message: string) {
  assert(value !== null, message);
}

function assertEqual(actual: any, expected: any, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
}

console.log('Running ScanConfig Validation Tests...\n');

// Target validation tests
runTest('validateTarget - Valid IPv4 addresses', () => {
  assertNull(validateTarget('192.168.1.1'), 'Should accept valid IPv4');
  assertNull(validateTarget('10.0.0.1'), 'Should accept private IPv4');
  assertNull(validateTarget('172.16.0.1'), 'Should accept private IPv4');
});

runTest('validateTarget - Valid CIDR ranges', () => {
  assertNull(validateTarget('192.168.1.0/24'), 'Should accept valid CIDR');
  assertNull(validateTarget('10.0.0.0/8'), 'Should accept private CIDR');
});

runTest('validateTarget - Valid IP ranges', () => {
  assertNull(validateTarget('192.168.1.1-254'), 'Should accept IP range format');
  assertNull(validateTarget('192.168.1.1-192.168.1.50'), 'Should accept full IP range');
});

runTest('validateTarget - Valid hostnames', () => {
  assertNull(validateTarget('example.com'), 'Should accept simple hostname');
  assertNull(validateTarget('sub.domain.org'), 'Should accept subdomain');
  assertNull(validateTarget('host-name.local'), 'Should accept hyphenated hostname');
});

runTest('validateTarget - Invalid targets', () => {
  assertNotNull(validateTarget(''), 'Should reject empty target');
  assertNotNull(validateTarget('invalid.format'), 'Should reject invalid format');
  assertNotNull(validateTarget('999.999.999.999'), 'Should reject invalid IP');
});

runTest('validateTarget - Public IP restriction', () => {
  assertNotNull(validateTarget('8.8.8.8'), 'Should reject public IP for security');
  assertNotNull(validateTarget('1.1.1.1/24'), 'Should reject public CIDR for security');
});

// Port validation tests
runTest('validatePortsCustom - Valid port specifications', () => {
  assertNull(validatePortsCustom('22'), 'Should accept single port');
  assertNull(validatePortsCustom('22,80,443'), 'Should accept comma-separated ports');
  assertNull(validatePortsCustom('1-1000'), 'Should accept port range');
  assertNull(validatePortsCustom('22,80,1000-2000'), 'Should accept mixed format');
  assertNull(validatePortsCustom(''), 'Should accept empty (optional)');
});

runTest('validatePortsCustom - Invalid port formats', () => {
  assertNotNull(validatePortsCustom('invalid'), 'Should reject non-numeric ports');
  assertNotNull(validatePortsCustom('22,a,443'), 'Should reject mixed alphanumeric');
});

runTest('validatePortsCustom - Invalid port numbers', () => {
  assertNotNull(validatePortsCustom('0'), 'Should reject port 0');
  assertNotNull(validatePortsCustom('65536'), 'Should reject port > 65535');
});

// Numeric field validation tests
runTest('validateNumericField - Valid ranges', () => {
  assertNull(validateNumericField(300, 'hostTimeoutSeconds', 1, 3600), 'Should accept valid timeout');
  assertNull(validateNumericField(5, 'maxRetries', 0, 10), 'Should accept valid retries');
  assertNull(validateNumericField(1000, 'minRate', 1, 100000), 'Should accept valid rate');
  assertNull(validateNumericField(undefined, 'optionalField', 1, 100), 'Should accept undefined');
});

runTest('validateNumericField - Invalid values', () => {
  assertNotNull(validateNumericField(0, 'hostTimeoutSeconds', 1, 3600), 'Should reject timeout < min');
  assertNotNull(validateNumericField(3601, 'hostTimeoutSeconds', 1, 3600), 'Should reject timeout > max');
  assertNotNull(validateNumericField(3.14, 'maxRetries', 0, 10), 'Should reject non-integer');
});

// Configuration conflict tests
runTest('validateScanConfigConflicts - TCP scan conflicts', () => {
  const config: ScanConfig = {
    target: '192.168.1.1',
    scanProfile: 'custom',
    timingTemplate: 'T4',
    hostTimeoutSeconds: 600,
    serviceDetection: false,
    osDetection: false,
    noDnsResolution: true,
    skipHostDiscovery: false,
    onlyOpenPorts: true,
    portMode: 'default',
    tcpSynScan: true,
    tcpConnectScan: true,
    udpScan: false,
    treatAsOnline: false,
    verbosity: 0
  };

  const errors = validateScanConfigConflicts(config);
  const hasConflict = errors.some(e => e.field === 'scanType');
  assert(hasConflict, 'Should detect TCP scan type conflict');
});

runTest('validateScanConfigConflicts - Privilege warnings', () => {
  const config: ScanConfig = {
    target: '192.168.1.1',
    scanProfile: 'custom',
    timingTemplate: 'T4',
    hostTimeoutSeconds: 600,
    serviceDetection: false,
    osDetection: true,
    noDnsResolution: true,
    skipHostDiscovery: false,
    onlyOpenPorts: true,
    portMode: 'default',
    tcpSynScan: true,
    tcpConnectScan: false,
    udpScan: false,
    treatAsOnline: false,
    verbosity: 0
  };

  const errors = validateScanConfigConflicts(config);
  const hasOsWarning = errors.some(e => e.field === 'osDetection');
  const hasSynWarning = errors.some(e => e.field === 'tcpSynScan');
  
  assert(hasOsWarning, 'Should warn about OS detection privileges');
  assert(hasSynWarning, 'Should warn about SYN scan privileges');
});

runTest('validateScanConfigConflicts - UDP performance warning', () => {
  const config: ScanConfig = {
    target: '192.168.1.1',
    scanProfile: 'custom',
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
    udpScan: true,
    treatAsOnline: false,
    verbosity: 0
  };

  const errors = validateScanConfigConflicts(config);
  const hasUdpWarning = errors.some(e => e.field === 'udpScan');
  assert(hasUdpWarning, 'Should warn about UDP scan performance');
});

// Complete configuration validation
runTest('validateScanConfig - Valid configuration', () => {
  const validConfig: ScanConfig = {
    target: '192.168.1.1',
    scanProfile: 'custom',
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

  const errors = validateScanConfig(validConfig);
  assertEqual(errors.length, 0, 'Should pass validation for valid config');
});

runTest('validateScanConfig - Collects all errors', () => {
  const invalidConfig: ScanConfig = {
    target: 'invalid.target',
    scanProfile: 'custom',
    timingTemplate: 'T4',
    hostTimeoutSeconds: 5000, // Too high
    serviceDetection: false,
    osDetection: false,
    noDnsResolution: true,
    skipHostDiscovery: false,
    onlyOpenPorts: true,
    portMode: 'custom',
    portsCustom: 'invalid,port', // Invalid format
    tcpSynScan: true,
    tcpConnectScan: true, // Conflict
    udpScan: false,
    treatAsOnline: false,
    verbosity: 0
  };

  const errors = validateScanConfig(invalidConfig);
  assert(errors.length > 0, 'Should detect multiple validation errors');
});

// Profile defaults tests
runTest('applyProfileDefaults - Quick profile', () => {
  const config = applyProfileDefaults({ target: '192.168.1.1' }, 'quick');
  
  assertEqual(config.timingTemplate, 'T4', 'Should apply T4 timing');
  assertEqual(config.serviceDetection, false, 'Should disable service detection');
  assertEqual(config.osDetection, false, 'Should disable OS detection');
  assertEqual(config.portMode, 'fast', 'Should use fast port mode');
  assertEqual(config.hostTimeoutSeconds, 300, 'Should set 300s timeout');
});

runTest('applyProfileDefaults - Balanced profile', () => {
  const config = applyProfileDefaults({ target: '192.168.1.1' }, 'balanced');
  
  assertEqual(config.timingTemplate, 'T3', 'Should apply T3 timing');
  assertEqual(config.serviceDetection, true, 'Should enable service detection');
  assertEqual(config.osDetection, false, 'Should disable OS detection');
  assertEqual(config.portMode, 'default', 'Should use default port mode');
  assertEqual(config.hostTimeoutSeconds, 600, 'Should set 600s timeout');
});

runTest('applyProfileDefaults - Full profile', () => {
  const config = applyProfileDefaults({ target: '192.168.1.1' }, 'full');
  
  assertEqual(config.timingTemplate, 'T4', 'Should apply T4 timing');
  assertEqual(config.serviceDetection, true, 'Should enable service detection');
  assertEqual(config.osDetection, true, 'Should enable OS detection');
  assertEqual(config.skipHostDiscovery, true, 'Should skip host discovery');
  assertEqual(config.hostTimeoutSeconds, 600, 'Should set 600s timeout');
});

runTest('applyProfileDefaults - Preserves user overrides', () => {
  const userConfig = {
    target: '192.168.1.1',
    serviceDetection: true,
    osDetection: true,
    hostTimeoutSeconds: 1200
  };
  
  const config = applyProfileDefaults(userConfig, 'custom');
  
  assertEqual(config.serviceDetection, true, 'Should preserve service detection override');
  assertEqual(config.osDetection, true, 'Should preserve OS detection override');
  assertEqual(config.hostTimeoutSeconds, 1200, 'Should preserve timeout override');
  assertEqual(config.timingTemplate, 'T4', 'Should apply default timing template');
});

console.log('\nAll validation tests passed! ✅');