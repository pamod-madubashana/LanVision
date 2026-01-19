import { XMLParser } from 'fast-xml-parser';

export interface ParsedNmapResult {
  hosts: any[];
  stats: {
    totalHosts: number;
    hostsUp: number;
    hostsDown: number;
    totalOpenPorts: number;
    durationSeconds: number;
  };
}

export interface NmapRun {
  '@_scanner'?: string;
  '@_args'?: string;
  '@_start'?: string;
  '@_startstr'?: string;
  '@_version'?: string;
  '@_xmloutputversion'?: string;
  host?: any | any[];
  runstats?: {
    finished?: {
      '@_time'?: string;
      '@_timestr'?: string;
      '@_elapsed'?: string;
      '@_summary'?: string;
      '@_exit'?: string;
    };
    hosts?: {
      '@_up'?: string;
      '@_down'?: string;
      '@_total'?: string;
    };
  };
}

export class NmapXmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTagValue: true,
    });
  }

  parse(xmlOutput: string): ParsedNmapResult {
    try {
      // Handle edge case where XML output is empty or invalid
      if (!xmlOutput || typeof xmlOutput !== 'string' || xmlOutput.trim() === '') {
        return {
          hosts: [],
          stats: {
            totalHosts: 0,
            hostsUp: 0,
            hostsDown: 0,
            totalOpenPorts: 0,
            durationSeconds: 0
          }
        };
      }

      // Parse the XML output
      const parsed: NmapRun = this.parser.parse(xmlOutput);

      // Extract hosts
      let hosts: any[] = [];
      if (parsed.host) {
        // If there's only one host, fast-xml-parser returns an object instead of an array
        hosts = Array.isArray(parsed.host) ? parsed.host : [parsed.host];
        
        // Process hosts to extract ports and calculate risk scores
        hosts = hosts.map(this.processHost.bind(this));
      }

      // Extract statistics
      const stats = {
        totalHosts: 0,
        hostsUp: 0,
        hostsDown: 0,
        totalOpenPorts: 0,
        durationSeconds: 0
      };

      // Extract host counts from runstats
      if (parsed.runstats?.hosts) {
        stats.totalHosts = parseInt(parsed.runstats.hosts['@_total'] || '0', 10);
        stats.hostsUp = parseInt(parsed.runstats.hosts['@_up'] || '0', 10);
        stats.hostsDown = parseInt(parsed.runstats.hosts['@_down'] || '0', 10);
      }

      // Calculate total open ports across all hosts
      stats.totalOpenPorts = hosts.reduce((total, host) => {
        const openPorts = host.ports?.port?.filter((port: any) => port.state?.['@_state'] === 'open')?.length || 0;
        return total + openPorts;
      }, 0);

      // Extract scan duration
      if (parsed.runstats?.finished?.['@_elapsed']) {
        stats.durationSeconds = parseFloat(parsed.runstats.finished['@_elapsed']);
      }

      return {
        hosts,
        stats
      };
    } catch (error) {
      console.error('Error parsing Nmap XML output:', error);
      
      // Return default values in case of parsing error
      return {
        hosts: [],
        stats: {
          totalHosts: 0,
          hostsUp: 0,
          hostsDown: 0,
          totalOpenPorts: 0,
          durationSeconds: 0
        }
      };
    }
  }

  private processHost(rawHost: any): any {
    // Process a single host to extract and organize data
    const processedHost = { ...rawHost };
    
    // Extract IP address from address array
    if (Array.isArray(rawHost.address)) {
      const ipAddress = rawHost.address.find((addr: any) => addr['@_addrtype'] === 'ipv4');
      if (ipAddress) {
        processedHost.ip = ipAddress['@_addr'];
      }
    } else if (rawHost.address && rawHost.address['@_addrtype'] === 'ipv4') {
      processedHost.ip = rawHost.address['@_addr'];
    }
    
    // Extract hostname if available
    if (rawHost.hostnames?.hostname) {
      const hostname = Array.isArray(rawHost.hostnames.hostname) 
        ? rawHost.hostnames.hostname[0]
        : rawHost.hostnames.hostname;
      processedHost.hostname = hostname['@_name'];
    }
    
    // Extract status
    processedHost.status = rawHost.status?.['@_state'] || 'unknown';
    
    // Process ports
    if (rawHost.ports?.port) {
      let ports = Array.isArray(rawHost.ports.port) 
        ? rawHost.ports.port 
        : [rawHost.ports.port];
        
      // Process ports
      processedHost.ports = ports.map((port: any) => ({
        port: parseInt(port['@_portid']),
        protocol: port['@_protocol'],
        state: port.state?.['@_state'],
        service: port.service?.['@_name'],
        version: port.service?.['@_version']
      }));
    } else {
      processedHost.ports = [];
    }
    
    // Calculate risk level
    processedHost.riskLevel = this.calculateRiskLevel(processedHost);
    processedHost.riskScore = this.calculateRiskScore(processedHost);
    processedHost.riskReasons = this.calculateRiskReasons(processedHost);
    
    return processedHost;
  }
  
  private calculateRiskLevel(host: any): string {
    const score = this.calculateRiskScore(host);
    
    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
  
  private calculateRiskScore(host: any): number {
    let score = 0;
    
    if (host.ports && Array.isArray(host.ports)) {
      for (const port of host.ports) {
        if (port.state === 'open') {
          const portNumber = parseInt(port.port);
          
          // High-risk ports
          if ([21, 23, 135, 139, 445, 1433, 3306, 3389, 5985, 5986, 27017].includes(portNumber)) {
            score += 3;
          }
          // Medium-risk ports
          else if ([22, 25, 110, 143, 993, 995, 1337, 1338, 3389, 5432].includes(portNumber)) {
            score += 2;
          }
          // Low-risk but administrative ports
          else if ([20, 21, 53, 80, 443, 8080, 8443].includes(portNumber)) {
            score += 1;
          }
        }
      }
    }
    
    return score;
  }
  
  private calculateRiskReasons(host: any): string[] {
    const reasons: string[] = [];
    
    if (host.ports && Array.isArray(host.ports)) {
      for (const port of host.ports) {
        if (port.state === 'open') {
          const portNumber = parseInt(port.port);
          
          switch (portNumber) {
            case 21:
              reasons.push('FTP service - unencrypted file transfer');
              break;
            case 22:
              reasons.push('SSH service - remote administration');
              break;
            case 23:
              reasons.push('Telnet service - unencrypted remote access');
              break;
            case 25:
              reasons.push('SMTP service - email server');
              break;
            case 110:
              reasons.push('POP3 service - email access');
              break;
            case 143:
              reasons.push('IMAP service - email access');
              break;
            case 135:
              reasons.push('RPC Endpoint Mapper - Windows service');
              break;
            case 139:
              reasons.push('NetBIOS Session Service - Windows networking');
              break;
            case 445:
              reasons.push('SMB over TCP - Windows file sharing');
              break;
            case 1433:
              reasons.push('Microsoft SQL Server - database access');
              break;
            case 3306:
              reasons.push('MySQL - database access');
              break;
            case 3389:
              reasons.push('Remote Desktop Protocol - remote desktop access');
              break;
            case 5432:
              reasons.push('PostgreSQL - database access');
              break;
            case 27017:
              reasons.push('MongoDB - database access');
              break;
          }
        }
      }
    }
    
    return reasons;
  }
}