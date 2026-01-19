import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import Card from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ServerIcon, 
  ClockIcon, 
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ScanResult {
  id: string;
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
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (scanId) {
      fetchScanResults();
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [scanId, isAuthenticated, navigate]);

  const fetchScanResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getScan(scanId!);
      
      if (response.success) {
        setScan(response.data.scan);
        
        // Auto-refresh if scan is still running
        if (response.data.scan.status === 'running' || response.data.scan.status === 'pending') {
          const interval = setInterval(fetchScanResults, 5000);
          setRefreshInterval(interval);
        } else if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      } else {
        setError(response.error?.message || 'Failed to load scan results');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setLoading(false);
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
          onClick={fetchScanResults}
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

      {/* Hosts Table */}
      <Card title="Discovered Hosts">
        {scan.results && scan.results.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Ports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OS Guess
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scan.results.map((host) => (
                  <tr key={host._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{host.ip}</div>
                        {host.hostname && (
                          <div className="text-sm text-gray-500">{host.hostname}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        host.status === 'up' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {host.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RiskBadge level={host.riskLevel as any} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {host.ports.filter(p => p.state === 'open').length} open
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {host.osGuess || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        to={`/scan/${scan.id}/host/${host._id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
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
            <p className="mt-1 text-sm text-gray-500">
              {scan.status === 'completed' 
                ? 'No hosts were found during this scan.'
                : 'Scan is still in progress...'
              }
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScanResults;