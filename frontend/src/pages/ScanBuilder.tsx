import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import type { 
  ScanConfig, 
  ScanProfile, 
  ValidationError
} from '../types/scanConfig';
import { 
  PROFILE_PRESETS, 
  DEFAULT_SCAN_CONFIG
} from '../types/scanConfig';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

const ScanBuilder: React.FC = () => {
  const [config, setConfig] = useState<ScanConfig>({
    target: '',
    scanProfile: 'balanced',
    ...DEFAULT_SCAN_CONFIG
  });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    discovery: false,
    detection: false,
    ports: false,
    speed: false,
    scanTypes: false,
    output: false
  });
  
  const [commandPreview, setCommandPreview] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanName, setScanName] = useState('');
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Apply profile defaults when profile changes
  useEffect(() => {
    if (config.scanProfile !== 'custom') {
      const profileDefaults = PROFILE_PRESETS[config.scanProfile];
      setConfig(prev => ({
        ...prev,
        ...profileDefaults,
        scanProfile: prev.scanProfile,
        target: prev.target
      }));
    }
  }, [config.scanProfile]);

  // Update command preview when config changes
  useEffect(() => {
    const updatePreview = async () => {
      if (config.target.trim()) {
        try {
          const response = await apiService.getCommandPreview(config);
          if (response.success && response.data?.command) {
            setCommandPreview(response.data.command);
          }
        } catch (error) {
          console.error('Failed to get command preview:', error);
        }
      } else {
        setCommandPreview('');
      }
    };

    const debounceTimer = setTimeout(updatePreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [config]);

  // Handle profile change
  const handleProfileChange = (profile: ScanProfile) => {
    setConfig(prev => ({
      ...prev,
      scanProfile: profile
    }));
  };

  // Reset to profile defaults
  const resetToProfileDefaults = () => {
    const profileDefaults = PROFILE_PRESETS[config.scanProfile];
    setConfig(prev => ({
      target: prev.target,
      scanProfile: prev.scanProfile,
      ...DEFAULT_SCAN_CONFIG,
      ...profileDefaults
    }));
    setErrors([]);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const response = await apiService.startCustomScan(config, scanName.trim() || undefined);
      
      if (response.success) {
        // Redirect to scan results page
        setTimeout(() => {
          navigate(`/scan/${response.data.scanId}`);
        }, 1000);
      } else {
        setErrors([{ field: 'general', message: response.error?.message || 'Failed to start scan' }]);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'An error occurred while starting the scan';
      setErrors([{ field: 'general', message: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  // Render section header with toggle
  const renderSectionHeader = (section: string, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full py-3 text-left font-medium text-gray-900 hover:text-blue-600"
    >
      <div className="flex items-center">
        {icon}
        <span className="ml-2">{title}</span>
      </div>
      <svg 
        className={`w-5 h-5 transform transition-transform ${expandedSections[section] ? 'rotate-180' : ''}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  // Render warning badge
  const renderWarning = (message: string) => (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  );

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Custom Nmap Scan Builder</h1>
        <p className="mt-2 text-gray-600">
          Configure advanced Nmap scan options with fine-grained control over every parameter
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration Panel */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Errors */}
              {errors.filter(e => e.field === 'general').map((error, idx) => (
                <div key={idx} className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Scan Name */}
              <div>
                <label htmlFor="scanName" className="block text-sm font-medium text-gray-700">
                  Scan Name (Optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="scanName"
                    value={scanName}
                    onChange={(e) => setScanName(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                    placeholder="My Custom Scan"
                  />
                </div>
              </div>

              {/* Target Input */}
              <div>
                <label htmlFor="target" className="block text-sm font-medium text-gray-700">
                  Target *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="target"
                    required
                    value={config.target}
                    onChange={(e) => setConfig(prev => ({ ...prev, target: e.target.value }))}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black ${
                      errors.some(e => e.field === 'target') ? 'border-red-300' : ''
                    }`}
                    placeholder="192.168.1.0/24 or 192.168.1.1-254"
                  />
                </div>
                {errors.filter(e => e.field === 'target').map((error, idx) => (
                  <p key={idx} className="mt-2 text-sm text-red-600">{error.message}</p>
                ))}
                <p className="mt-2 text-sm text-gray-500">
                  Enter an IP address, CIDR range, or IP range. Only private networks are allowed.
                </p>
              </div>

              {/* Profile Selection */}
              <div>
                <label htmlFor="profile" className="block text-sm font-medium text-gray-700">
                  Scan Profile
                </label>
                <div className="mt-1">
                  <select
                    id="profile"
                    value={config.scanProfile}
                    onChange={(e) => handleProfileChange(e.target.value as ScanProfile)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                  >
                    <option value="quick">Quick Scan (Fast, fewer ports)</option>
                    <option value="balanced">Balanced Scan (Service detection)</option>
                    <option value="full">Full Scan (Service + OS detection)</option>
                    <option value="custom">Custom (Manual configuration)</option>
                  </select>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {config.scanProfile === 'quick' && 'Performs a fast scan with common ports only'}
                    {config.scanProfile === 'balanced' && 'Balanced approach with service detection'}
                    {config.scanProfile === 'full' && 'Comprehensive scan with service and OS detection'}
                    {config.scanProfile === 'custom' && 'Manual configuration - all options available'}
                  </p>
                  {config.scanProfile !== 'custom' && (
                    <button
                      type="button"
                      onClick={resetToProfileDefaults}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Reset to Profile Defaults
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced Options Sections */}
              <div className="border-t border-gray-200 pt-6 space-y-6">
                {/* Discovery Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('discovery', 'Discovery Options', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.discovery && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          id="skipHostDiscovery"
                          type="checkbox"
                          checked={config.skipHostDiscovery}
                          onChange={(e) => setConfig(prev => ({ ...prev, skipHostDiscovery: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="skipHostDiscovery" className="ml-2 block text-sm text-gray-900">
                          Skip Host Discovery (-Pn)
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="noDnsResolution"
                          type="checkbox"
                          checked={config.noDnsResolution}
                          onChange={(e) => setConfig(prev => ({ ...prev, noDnsResolution: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="noDnsResolution" className="ml-2 block text-sm text-gray-900">
                          No DNS Resolution (-n)
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="treatAsOnline"
                          type="checkbox"
                          checked={config.treatAsOnline}
                          onChange={(e) => setConfig(prev => ({ ...prev, treatAsOnline: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="treatAsOnline" className="ml-2 block text-sm text-gray-900">
                          Treat All Hosts as Online (Alias for -Pn)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detection Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('detection', 'Detection Options', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.detection && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          id="serviceDetection"
                          type="checkbox"
                          checked={config.serviceDetection}
                          onChange={(e) => setConfig(prev => ({ ...prev, serviceDetection: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="serviceDetection" className="ml-2 block text-sm text-gray-900">
                          Service Detection (-sV)
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="osDetection"
                          type="checkbox"
                          checked={config.osDetection}
                          onChange={(e) => setConfig(prev => ({ ...prev, osDetection: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="osDetection" className="ml-2 block text-sm text-gray-900">
                          OS Detection (-O)
                        </label>
                        {config.osDetection && renderWarning('May require admin/root privileges')}
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="onlyOpenPorts"
                          type="checkbox"
                          checked={config.onlyOpenPorts}
                          onChange={(e) => setConfig(prev => ({ ...prev, onlyOpenPorts: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="onlyOpenPorts" className="ml-2 block text-sm text-gray-900">
                          Show Only Open Ports (--open)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ports Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('ports', 'Port Configuration', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.ports && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label htmlFor="portMode" className="block text-sm font-medium text-gray-700">
                          Port Mode
                        </label>
                        <select
                          id="portMode"
                          value={config.portMode}
                          onChange={(e) => setConfig(prev => ({ ...prev, portMode: e.target.value as any }))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black"
                        >
                          <option value="default">Default (1000 most common ports)</option>
                          <option value="top-100">Top 100 Ports</option>
                          <option value="top-1000">Top 1000 Ports</option>
                          <option value="fast">Fast Scan (-F, top 100)</option>
                          <option value="custom">Custom Ports</option>
                        </select>
                      </div>
                      
                      {config.portMode === 'custom' && (
                        <div>
                          <label htmlFor="portsCustom" className="block text-sm font-medium text-gray-700">
                            Custom Ports
                          </label>
                          <input
                            type="text"
                            id="portsCustom"
                            value={config.portsCustom || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, portsCustom: e.target.value }))}
                            className={`mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md text-black ${
                              errors.some(e => e.field === 'portsCustom') ? 'border-red-300' : ''
                            }`}
                            placeholder="22,80,443,8000-8100"
                          />
                          {errors.filter(e => e.field === 'portsCustom').map((error, idx) => (
                            <p key={idx} className="mt-1 text-sm text-red-600">{error.message}</p>
                          ))}
                          <p className="mt-1 text-sm text-gray-500">
                            Enter ports separated by commas, use hyphens for ranges (e.g., "22,80,443,8000-8100")
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Speed Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('speed', 'Performance Settings', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.speed && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label htmlFor="timingTemplate" className="block text-sm font-medium text-gray-700">
                          Timing Template
                        </label>
                        <select
                          id="timingTemplate"
                          value={config.timingTemplate}
                          onChange={(e) => setConfig(prev => ({ ...prev, timingTemplate: e.target.value as any }))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black"
                        >
                          <option value="T0">T0 - Paranoid (very slow)</option>
                          <option value="T1">T1 - Sneaky (slow)</option>
                          <option value="T2">T2 - Polite (medium-slow)</option>
                          <option value="T3">T3 - Normal (default)</option>
                          <option value="T4">T4 - Aggressive (fast)</option>
                          <option value="T5">T5 - Insane (very fast)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="hostTimeoutSeconds" className="block text-sm font-medium text-gray-700">
                          Host Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          id="hostTimeoutSeconds"
                          min="1"
                          max="3600"
                          value={config.hostTimeoutSeconds}
                          onChange={(e) => setConfig(prev => ({ ...prev, hostTimeoutSeconds: parseInt(e.target.value) || 600 }))}
                          className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md text-black"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="maxRetries" className="block text-sm font-medium text-gray-700">
                            Max Retries (optional)
                          </label>
                          <input
                            type="number"
                            id="maxRetries"
                            min="0"
                            max="10"
                            value={config.maxRetries || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md text-black"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="minRate" className="block text-sm font-medium text-gray-700">
                            Min Packet Rate (optional)
                          </label>
                          <input
                            type="number"
                            id="minRate"
                            min="1"
                            max="100000"
                            value={config.minRate || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, minRate: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md text-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scan Types Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('scanTypes', 'Scan Types', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.scanTypes && (
                    <div className="p-4 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="tcpConnectScan"
                            type="checkbox"
                            checked={config.tcpConnectScan}
                            onChange={(e) => setConfig(prev => ({ ...prev, tcpConnectScan: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="tcpConnectScan" className="ml-2 block text-sm text-gray-900">
                            TCP Connect Scan (-sT)
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="tcpSynScan"
                            type="checkbox"
                            checked={config.tcpSynScan}
                            onChange={(e) => setConfig(prev => ({ ...prev, tcpSynScan: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="tcpSynScan" className="ml-2 block text-sm text-gray-900">
                            TCP SYN Scan (-sS)
                          </label>
                          {config.tcpSynScan && renderWarning('Requires privileged access')}
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            id="udpScan"
                            type="checkbox"
                            checked={config.udpScan}
                            onChange={(e) => setConfig(prev => ({ ...prev, udpScan: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="udpScan" className="ml-2 block text-sm text-gray-900">
                            UDP Scan (-sU)
                          </label>
                          {config.udpScan && renderWarning('Significantly slower than TCP scanning')}
                        </div>
                      </div>
                      
                      {(config.tcpSynScan && config.tcpConnectScan) && (
                        <div className="rounded-md bg-red-50 p-3">
                          <div className="flex">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-2">
                              <p className="text-sm text-red-700">
                                Cannot enable both SYN scan (-sS) and Connect scan (-sT). Choose one.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Output Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    {renderSectionHeader('output', 'Output Settings', (
                      <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ))}
                  </div>
                  {expandedSections.output && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label htmlFor="verbosity" className="block text-sm font-medium text-gray-700">
                          Verbosity Level
                        </label>
                        <select
                          id="verbosity"
                          value={config.verbosity}
                          onChange={(e) => setConfig(prev => ({ ...prev, verbosity: parseInt(e.target.value) as any }))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black"
                        >
                          <option value="0">Normal (no extra output)</option>
                          <option value="1">Verbose (-v)</option>
                          <option value="2">Very Verbose (-vv)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <p>Note: Scans may take several minutes to complete depending on target size and configuration.</p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !config.target.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Starting Scan...
                    </>
                  ) : (
                    'Start Custom Scan'
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Command Preview Panel */}
        <div className="lg:col-span-1">
          <Card title="Command Preview">
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
              {commandPreview ? (
                <>
                  <div className="text-gray-400"># Generated Nmap command:</div>
                  <div className="mt-2 text-white break-all">{commandPreview}</div>
                  <div className="mt-3 text-gray-400 text-xs">
                    # This preview updates automatically as you configure options<br/>
                    # Target will be appended when scan starts
                  </div>
                </>
              ) : (
                <div className="text-gray-500 italic">
                  Configure scan options to see command preview
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-medium mb-2">Security Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All commands are validated server-side for safety</li>
                <li>No shell injection or arbitrary flag execution</li>
                <li>Only private IP ranges are permitted by default</li>
                <li>Privileged operations show appropriate warnings</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScanBuilder;