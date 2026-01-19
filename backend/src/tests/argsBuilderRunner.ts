/**
 * Nmap Arguments Builder Tests
 * Standalone tests for argument generation and safety validation
 */

import { buildNmapArgs, generateCommandPreview, validateGeneratedArgs } from '../utils/nmapArgsBuilder';
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

function assertEqual(actual: any, expected: any, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
}

function assertTrue(condition: boolean, message: string) {
  assert(condition, message);
}

function assertFalse(condition: boolean, message: string) {
  assert(!condition, message);
}

console.log('Running Nmap Arguments Builder Tests...\n');

// Helper function to create base config
function createBaseConfig(overrides: Partial<ScanConfig> = {}): ScanConfig {
  return {
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
    verbosity: 0,
    ...overrides
  };
}

// Arguments building tests
runTest('buildNmapArgs - Basic configuration', () => {
  const config = createBaseConfig();
  const args = buildNmapArgs(config);
  
  // Should always include XML output
  assertEqual(args.slice(0, 2), ['-oX', '-'], 'Should start with XML output flags');
  
  // Should include timing template
  assertTrue(args.includes('-T4'), 'Should include timing template');
  
  // Should include target at the end
  assertEqual(args[args.length - 1], '192.168.1.1', 'Should end with target');
});

runTest('buildNmapArgs - Service detection', () => {
  const config = createBaseConfig({ serviceDetection: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('-sV'), 'Should include service detection flag');
});

runTest('buildNmapArgs - OS detection', () => {
  const config = createBaseConfig({ osDetection: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('-O'), 'Should include OS detection flag');
});

runTest('buildNmapArgs - DNS resolution disabled', () => {
  const config = createBaseConfig({ noDnsResolution: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('-n'), 'Should include no DNS resolution flag');
});

runTest('buildNmapArgs - Skip host discovery', () => {
  const config = createBaseConfig({ skipHostDiscovery: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('-Pn'), 'Should include skip host discovery flag');
});

runTest('buildNmapArgs - Treat as online (alias)', () => {
  const config = createBaseConfig({ treatAsOnline: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('-Pn'), 'Should include -Pn for treatAsOnline');
});

runTest('buildNmapArgs - Only open ports', () => {
  const config = createBaseConfig({ onlyOpenPorts: true });
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('--open'), 'Should include only open ports flag');
});

runTest('buildNmapArgs - Port modes', () => {
  // Fast mode
  const fastConfig = createBaseConfig({ portMode: 'fast' });
  const fastArgs = buildNmapArgs(fastConfig);
  assertTrue(fastArgs.includes('-F'), 'Should include -F for fast mode');
  
  // Top 100
  const top100Config = createBaseConfig({ portMode: 'top-100' });
  const top100Args = buildNmapArgs(top100Config);
  assertTrue(top100Args.includes('--top-ports=100'), 'Should include top-ports for top-100');
  
  // Top 1000
  const top1000Config = createBaseConfig({ portMode: 'top-1000' });
  const top1000Args = buildNmapArgs(top1000Config);
  assertTrue(top1000Args.includes('--top-ports=1000'), 'Should include top-ports for top-1000');
  
  // Custom ports
  const customConfig = createBaseConfig({ 
    portMode: 'custom', 
    portsCustom: '22,80,443' 
  });
  const customArgs = buildNmapArgs(customConfig);
  assertTrue(customArgs.includes('-p22,80,443'), 'Should include custom ports');
});

runTest('buildNmapArgs - Scan types', () => {
  // TCP Connect scan
  const connectConfig = createBaseConfig({ tcpConnectScan: true });
  const connectArgs = buildNmapArgs(connectConfig);
  assertTrue(connectArgs.includes('-sT'), 'Should include TCP connect scan');
  
  // TCP SYN scan
  const synConfig = createBaseConfig({ tcpSynScan: true, tcpConnectScan: false });
  const synArgs = buildNmapArgs(synConfig);
  assertTrue(synArgs.includes('-sS'), 'Should include TCP SYN scan');
  
  // UDP scan
  const udpConfig = createBaseConfig({ udpScan: true });
  const udpArgs = buildNmapArgs(udpConfig);
  assertTrue(udpArgs.includes('-sU'), 'Should include UDP scan');
});

runTest('buildNmapArgs - Performance settings', () => {
  const config = createBaseConfig({
    hostTimeoutSeconds: 1200,
    maxRetries: 3,
    minRate: 100,
    maxRate: 1000
  });
  
  const args = buildNmapArgs(config);
  
  assertTrue(args.includes('--host-timeout=1200s'), 'Should include host timeout');
  assertTrue(args.includes('--max-retries=3'), 'Should include max retries');
  assertTrue(args.includes('--min-rate=100'), 'Should include min rate');
  assertTrue(args.includes('--max-rate=1000'), 'Should include max rate');
});

runTest('buildNmapArgs - Verbosity levels', () => {
  // Normal (0)
  const normalConfig = createBaseConfig({ verbosity: 0 });
  const normalArgs = buildNmapArgs(normalConfig);
  assertFalse(normalArgs.includes('-v'), 'Should not include verbosity for level 0');
  assertFalse(normalArgs.includes('-vv'), 'Should not include verbosity for level 0');
  
  // Verbose (1)
  const verboseConfig = createBaseConfig({ verbosity: 1 });
  const verboseArgs = buildNmapArgs(verboseConfig);
  assertTrue(verboseArgs.includes('-v'), 'Should include -v for level 1');
  assertFalse(verboseArgs.includes('-vv'), 'Should not include -vv for level 1');
  
  // Very verbose (2)
  const veryVerboseConfig = createBaseConfig({ verbosity: 2 });
  const veryVerboseArgs = buildNmapArgs(veryVerboseConfig);
  assertFalse(veryVerboseArgs.includes('-v'), 'Should not include -v for level 2');
  assertTrue(veryVerboseArgs.includes('-vv'), 'Should include -vv for level 2');
});

// Command preview tests
runTest('generateCommandPreview - Basic preview', () => {
  const config = createBaseConfig();
  const preview = generateCommandPreview(config);
  
  assertTrue(preview.startsWith('nmap'), 'Should start with nmap command');
  assertTrue(preview.includes('<target>'), 'Should end with target placeholder');
  assertFalse(preview.includes(config.target), 'Should not include actual target');
});

runTest('generateCommandPreview - With various options', () => {
  const config = createBaseConfig({
    serviceDetection: true,
    osDetection: true,
    portMode: 'fast',
    verbosity: 1
  });
  
  const preview = generateCommandPreview(config);
  
  assertTrue(preview.includes('-sV'), 'Should include service detection');
  assertTrue(preview.includes('-O'), 'Should include OS detection');
  assertTrue(preview.includes('-F'), 'Should include fast scan');
  assertTrue(preview.includes('-v'), 'Should include verbosity');
});

// Safety validation tests
runTest('validateGeneratedArgs - Safe arguments', () => {
  const safeArgs = ['-oX', '-', '-T4', '-sV', '-O', '-n', '-Pn', '--open', '--host-timeout=600s', '192.168.1.1'];
  assertTrue(validateGeneratedArgs(safeArgs), 'Should accept safe arguments');
});

runTest('validateGeneratedArgs - Dangerous flags rejected', () => {
  // Script execution flags
  const scriptArgs = ['-oX', '-', '--script=vuln', '192.168.1.1'];
  assertFalse(validateGeneratedArgs(scriptArgs), 'Should reject script flags');
  
  // Privileged flags
  const privilegedArgs = ['-oX', '-', '--privileged', '192.168.1.1'];
  assertFalse(validateGeneratedArgs(privilegedArgs), 'Should reject privileged flags');
  
  // Shell metacharacters
  const shellArgs = ['-oX', '-', '$(malicious)', '192.168.1.1'];
  assertFalse(validateGeneratedArgs(shellArgs), 'Should reject shell metacharacters');
});

runTest('validateGeneratedArgs - Profile-based configurations', () => {
  // Quick profile
  const quickConfig = createBaseConfig({
    scanProfile: 'quick',
    timingTemplate: 'T4',
    portMode: 'fast',
    serviceDetection: false,
    osDetection: false
  });
  const quickArgs = buildNmapArgs(quickConfig);
  assertTrue(validateGeneratedArgs(quickArgs), 'Should validate quick profile args');
  
  // Full profile
  const fullConfig = createBaseConfig({
    scanProfile: 'full',
    timingTemplate: 'T4',
    serviceDetection: true,
    osDetection: true,
    skipHostDiscovery: true
  });
  const fullArgs = buildNmapArgs(fullConfig);
  assertTrue(validateGeneratedArgs(fullArgs), 'Should validate full profile args');
});

// Integration tests with profiles
runTest('Profile integration - Quick scan', () => {
  const quickConfig = createBaseConfig({
    scanProfile: 'quick',
    timingTemplate: 'T4',
    portMode: 'fast',
    serviceDetection: false,
    osDetection: false,
    hostTimeoutSeconds: 300
  });
  
  const args = buildNmapArgs(quickConfig);
  
  assertTrue(args.includes('-T4'), 'Should use T4 timing');
  assertTrue(args.includes('-F'), 'Should use fast port scanning');
  assertFalse(args.includes('-sV'), 'Should not include service detection');
  assertFalse(args.includes('-O'), 'Should not include OS detection');
  assertTrue(args.includes('--host-timeout=300s'), 'Should use 300s timeout');
});

runTest('Profile integration - Balanced scan', () => {
  const balancedConfig = createBaseConfig({
    scanProfile: 'balanced',
    timingTemplate: 'T3',
    portMode: 'default',
    serviceDetection: true,
    osDetection: false,
    hostTimeoutSeconds: 600
  });
  
  const args = buildNmapArgs(balancedConfig);
  
  assertTrue(args.includes('-T3'), 'Should use T3 timing');
  assertTrue(args.includes('-sV'), 'Should include service detection');
  assertFalse(args.includes('-O'), 'Should not include OS detection');
  assertTrue(args.includes('--host-timeout=600s'), 'Should use 600s timeout');
});

runTest('Profile integration - Full scan', () => {
  const fullConfig = createBaseConfig({
    scanProfile: 'full',
    timingTemplate: 'T4',
    portMode: 'default',
    serviceDetection: true,
    osDetection: true,
    skipHostDiscovery: true,
    hostTimeoutSeconds: 600
  });
  
  const args = buildNmapArgs(fullConfig);
  
  assertTrue(args.includes('-T4'), 'Should use T4 timing');
  assertTrue(args.includes('-sV'), 'Should include service detection');
  assertTrue(args.includes('-O'), 'Should include OS detection');
  assertTrue(args.includes('-Pn'), 'Should skip host discovery');
  assertTrue(args.includes('--host-timeout=600s'), 'Should use 600s timeout');
});

console.log('\nAll nmap arguments builder tests passed! ✅');