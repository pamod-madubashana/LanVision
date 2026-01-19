import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { ServerIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NewScan: React.FC = () => {
  const [target, setTarget] = useState('');
  const [profile, setProfile] = useState<'quick' | 'full'>('quick');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const validateTarget = (target: string): boolean => {
    // Basic validation for IP, CIDR, or range format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    
    return ipRegex.test(target) || cidrRegex.test(target) || rangeRegex.test(target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!target.trim()) {
      setError('Target is required');
      return;
    }

    if (!validateTarget(target)) {
      setError('Invalid target format. Use IP (192.168.1.1), CIDR (192.168.1.0/24), or range (192.168.1.1-254)');
      return;
    }

    // Check for public IP ranges (basic check)
    const isPrivateRange = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(target);
    if (!isPrivateRange) {
      setError('Warning: Scanning public IP ranges is restricted. Only private networks allowed.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.startScan(
        target.trim(),
        profile,
        name.trim() || undefined
      );
      
      if (response.success) {
        setSuccess(true);
        // Redirect to scan results page after a short delay
        setTimeout(() => {
          navigate(`/scan/${response.data.scanId}`);
        }, 2000);
      } else {
        setError(response.error?.message || 'Failed to start scan');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred while starting the scan');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Network Scan</h1>
        <p className="mt-2 text-gray-600">
          Scan IP addresses, ranges, or CIDR blocks to discover hosts and open ports
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Scan Started Successfully!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Redirecting to scan results...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Scan Name (Optional)
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="My Network Scan"
              />
            </div>
          </div>

          <div>
            <label htmlFor="target" className="block text-sm font-medium text-gray-700">
              Target
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="target"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="192.168.1.0/24 or 192.168.1.1-254"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter an IP address, CIDR range, or IP range. Only private networks are allowed.
            </p>
          </div>

          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-gray-700">
              Scan Profile
            </label>
            <div className="mt-1">
              <select
                id="profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value as 'quick' | 'full')}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="quick">Quick Scan (Fast, fewer ports)</option>
                <option value="full">Full Scan (Service detection, OS detection)</option>
              </select>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {profile === 'quick' ? (
                <p>Performs a fast scan with common ports only (-T4 -F)</p>
              ) : (
                <p>Performs comprehensive scan with service and OS detection (-sV -O)</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <p>Note: Scans may take several minutes to complete depending on target size and profile.</p>
            </div>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Starting Scan...
                </>
              ) : (
                <>
                  <ServerIcon className="h-5 w-5 mr-2" />
                  Start Scan
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Help Section */}
      <Card title="Help" className="mt-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-gray-900">Target Format Examples:</h4>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>Single IP:</strong> 192.168.1.100</li>
            <li><strong>CIDR Range:</strong> 192.168.1.0/24</li>
            <li><strong>IP Range:</strong> 192.168.1.1-254</li>
            <li><strong>Multiple IPs:</strong> 192.168.1.10,192.168.1.20</li>
          </ul>
          
          <h4 className="text-gray-900 mt-4">Security Note:</h4>
          <p className="text-gray-600">
            This tool is designed for authorized network scanning only. Only private IP ranges 
            (10.x.x.x, 172.16-31.x.x, 192.168.x.x) are permitted by default.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default NewScan;