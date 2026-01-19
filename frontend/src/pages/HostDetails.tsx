import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import Card from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ArrowLeftIcon,
  ServerIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

interface HostDetail {
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
  lastSeenAt: string;
}

const HostDetails: React.FC = () => {
  const { scanId, hostId } = useParams<{ scanId: string; hostId: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [host, setHost] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (scanId && hostId) {
      fetchHostDetails();
    }
  }, [scanId, hostId, isAuthenticated, navigate]);

  const fetchHostDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getHostDetails(scanId!, hostId!);
      
      if (response.success) {
        setHost(response.data.host);
      } else {
        setError(response.error?.message || 'Failed to load host details');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPortStateColor = (state: string): string => {
    switch (state) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'filtered': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
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
          onClick={fetchHostDetails}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="text-center py-12">
        <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Host not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested host details could not be found.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Host Details</h1>
            <p className="text-gray-600">{host.ip}{host.hostname && ` (${host.hostname})`}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            host.status === 'up' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {host.status.toUpperCase()}
          </span>
          <RiskBadge level={host.riskLevel as any} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Host Information */}
        <Card title="Host Information" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">IP Address</h4>
              <p className="mt-1 text-sm text-gray-900">{host.ip}</p>
            </div>
            
            {host.hostname && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Hostname</h4>
                <p className="mt-1 text-sm text-gray-900">{host.hostname}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  host.status === 'up' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {host.status.toUpperCase()}
                </span>
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">OS Detection</h4>
              <p className="mt-1 text-sm text-gray-900">
                {host.osGuess || 'Not detected'}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Last Seen</h4>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(host.lastSeenAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Risk Assessment */}
        <Card title="Risk Assessment" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Risk Score</h4>
                <p className="text-sm text-gray-500">Overall security risk assessment</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{host.riskScore}/100</div>
                <RiskBadge level={host.riskLevel as any} className="mt-1" />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Risk Factors</h4>
              <div className="space-y-2">
                {host.riskReasons && host.riskReasons.length > 0 ? (
                  host.riskReasons.map((reason, index) => (
                    <div key={index} className="flex items-start">
                      <ShieldExclamationIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center text-green-600">
                    <ShieldExclamationIcon className="h-5 w-5 mr-2" />
                    <span className="text-sm">No significant risk factors identified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Open Ports */}
      <Card title="Open Ports">
        {host.ports && host.ports.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Port
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Protocol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {host.ports
                  .filter(port => port.state === 'open')
                  .map((port, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {port.port}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {port.protocol.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPortStateColor(port.state)}`}>
                          {port.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {port.service || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {port.version || 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No open ports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This host appears to have no accessible services.
            </p>
          </div>
        )}
      </Card>

      {/* All Ports (including closed/filtered) */}
      <Card title="All Port States">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-800">Open Ports</div>
            <div className="text-2xl font-bold text-green-600">
              {host.ports.filter(p => p.state === 'open').length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-red-800">Closed Ports</div>
            <div className="text-2xl font-bold text-red-600">
              {host.ports.filter(p => p.state === 'closed').length}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-yellow-800">Filtered Ports</div>
            <div className="text-2xl font-bold text-yellow-600">
              {host.ports.filter(p => p.state === 'filtered').length}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Total scanned ports: {host.ports.length}</p>
        </div>
      </Card>
    </div>
  );
};

export default HostDetails;