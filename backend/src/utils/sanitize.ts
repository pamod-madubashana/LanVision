// Sanitize user input to prevent injection attacks
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters while preserving valid network input
  // Allow: digits, dots, dashes, slashes (for CIDR), commas (for port lists)
  return input.replace(/[^0-9.\-\/,\s]/g, '');
};

// Validate and sanitize IP addresses
export const sanitizeIP = (ip: string): string | null => {
  const sanitized = sanitizeInput(ip);
  
  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(sanitized)) {
    const parts = sanitized.split('.').map(Number);
    if (parts.every(part => part >= 0 && part <= 255)) {
      return sanitized;
    }
  }
  
  // CIDR notation validation
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (cidrRegex.test(sanitized)) {
    const [ipPart, prefixPart] = sanitized.split('/');
    const prefix = parseInt(prefixPart);
    if (prefix >= 0 && prefix <= 32) {
      const ipParts = ipPart.split('.').map(Number);
      if (ipParts.every(part => part >= 0 && part <= 255)) {
        return sanitized;
      }
    }
  }
  
  // IP range validation (e.g., 192.168.1.1-254)
  const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$/;
  if (rangeRegex.test(sanitized)) {
    const [startIp, endRange] = sanitized.split('-');
    const endNum = parseInt(endRange);
    if (endNum >= 0 && endNum <= 255) {
      const ipParts = startIp.split('.').map(Number);
      if (ipParts.every(part => part >= 0 && part <= 255)) {
        return sanitized;
      }
    }
  }
  
  return null;
};

// Validate port numbers
export const sanitizePort = (port: string | number): number | null => {
  const num = typeof port === 'string' ? parseInt(port, 10) : port;
  
  if (isNaN(num) || num < 1 || num > 65535) {
    return null;
  }
  
  return num;
};

// Validate port list/range
export const sanitizePortList = (ports: string): string | null => {
  // Allow comma-separated ports and ranges
  const portRegex = /^[\d,-]+$/;
  
  if (!portRegex.test(ports)) {
    return null;
  }
  
  // Validate each port/range
  const parts = ports.split(',');
  for (const part of parts) {
    if (part.includes('-')) {
      // Port range
      const [start, end] = part.split('-').map(p => parseInt(p.trim(), 10));
      if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
        return null;
      }
    } else {
      // Single port
      const portNum = parseInt(part.trim(), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return null;
      }
    }
  }
  
  return ports;
};

// Escape shell arguments to prevent command injection
export const escapeShellArg = (arg: string): string => {
  // For Windows PowerShell compatibility
  return `"${arg.replace(/"/g, '""')}"`;
};

// Validate scan arguments to ensure they're safe
export const validateScanArgs = (args: string[]): boolean => {
  const allowedFlags = [
    '-T4', '-F', '-sV', '-O', '-p', '--top-ports',
    '-n', '-Pn', '--open', '--host-timeout'
  ];
  
  const allowedPatterns = [
    /^-p\d+(,\d+)*(-\d+)?$/,  // Port specification
    /^--top-ports=\d+$/,       // Top ports
    /^--host-timeout=\d+[smh]?$/  // Timeout values
  ];
  
  for (const arg of args) {
    // Skip empty arguments
    if (!arg) continue;
    
    // Check if it's an allowed flag
    if (allowedFlags.includes(arg)) continue;
    
    // Check if it matches allowed patterns
    if (allowedPatterns.some(pattern => pattern.test(arg))) continue;
    
    // If it starts with -, it might be a dangerous flag
    if (arg.startsWith('-') && !arg.startsWith('--')) {
      return false;
    }
  }
  
  return true;
};