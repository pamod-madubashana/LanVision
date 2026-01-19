import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import type { ScanConfig } from '../types/scanConfig';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import LiveScanLogs from '../components/LiveScanLogs';
import RiskBadge from '../components/RiskBadge';
import { 
  ArrowPathIcon, 
  ClockIcon, 
  InformationCircleIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface ScanResult {
  _id: string;
  name: string;
  target: string;
  profile: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  summary: {
    totalHosts: number;
    hostsUp: number;
    totalOpenPorts: number;
  };
  results: Array<{
    _id: string;
    ip: string;
    hostname?: string;
    status: string;
    riskLevel: string;
    riskScore: number;
    riskReasons: string[];
    ports: Array<{
      port: number;
      protocol: string;
      state: string;
      service?: string;
      version?: string;
    }>;
    osGuess?: string;
  }>;
}

const ScanResults: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (scanId) {
      fetchScanResults();
    }

    // Cleanup function
    return () => {
      // Close any existing EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [scanId, isAuthenticated, navigate]);

  const fetchScanResults = async (isPolling: boolean = false) => {
    try {
      // Don't set loading to true during polling to avoid UI flickering
      if (!isPolling) {
        setLoading(true);
      }
      setError('');
      
      const response = await apiService.getScan(scanId!);
      
      if (response.success) {
        setScan(response.data.scan);
        
        // For running/pending scans, rely on SSE streaming instead of polling
        // No interval setup needed - streaming handles real-time updates
        
      } else {
        setError(response.error?.message || 'Failed to load scan results');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      // Only set loading to false on initial load, not during polling
      if (!isPolling) {
        setLoading(false);
      }
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !scan) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
        <button
          onClick={() => fetchScanResults(false)}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Scan not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested scan could not be found.</p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{scan.name}</h1>
            <p className="mt-1 text-gray-600">Target: {scan.target}</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(scan.status)}`}>
              {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
            </span>
            {(scan.status === 'running' || scan.status === 'pending') && (
              <div className="flex items-center text-blue-600">
                <ArrowPathIcon className="h-5 w-5 mr-1 animate-spin" />
                <span>Scanning...</span>
              </div>
            )}
          </div>
        </div>

        {/* Scan Summary */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <ServerIcon className="h-6 w-6 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Hosts Up</p>
                <p className="text-2xl font-semibold text-gray-900">{scan.summary.hostsUp}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">{scan.summary.totalHosts}</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Hosts</p>
                <p className="text-2xl font-semibold text-gray-900">{scan.summary.totalHosts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">{scan.summary.totalOpenPorts}</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Open Ports</p>
                <p className="text-2xl font-semibold text-gray-900">{scan.summary.totalOpenPorts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(scan.durationMs)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Scan Logs or Hosts Table */}
      {(scan.status === 'running' || scan.status === 'pending') ? (
        <LiveScanLogs 
          scanId={scanId!}
          initialStatus={scan.status as any}
          onStatusChange={(newStatus) => {
            // Update local scan status when streaming updates it
            setScan(prev => prev ? { ...prev, status: newStatus } : null);
            // Set streaming state when scan starts running
            if (newStatus === 'running' || newStatus === 'starting') {
              setIsStreaming(true);
            }
          }}
          onComplete={(_result) => {
            // Streaming completed - make one final GET request for complete data
            setIsStreaming(false);
            fetchScanResults();
          }}
          onError={(errorMessage) => {
            setError(errorMessage);
            setIsStreaming(false);
          }}
        />
      ) : (
        <Card title="Discovered Hosts">
          {scan.results && scan.results.length > 0 ? (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      IP Address
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Hostname
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Ports
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {scan.results.map((host) => (
                    <tr key={host._id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {host.ip}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {host.hostname || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          host.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {host.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {host.ports.length > 0 ? (
                          <div className="space-y-1">
                            {host.ports.slice(0, 3).map((port) => (
                              <div key={port.port} className="flex items-center">
                                <span className="font-mono text-xs">
                                  {port.port}/{port.protocol}
                                </span>
                                {port.service && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({port.service})
                                  </span>
                                )}
                              </div>
                            ))}
                            {host.ports.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{host.ports.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No open ports</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <RiskBadge level={host.riskLevel as any} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hosts discovered</h3>
              <p className="mt-1 text-sm text-gray-500">The scan completed but no hosts were found.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ScanResults;