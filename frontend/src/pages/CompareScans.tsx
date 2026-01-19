import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ArrowsRightLeftIcon,
  ServerIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface ScanComparison {
  scanA: {
    id: string;
    name: string;
    target: string;
    hostsUp: number;
    totalOpenPorts: number;
  };
  scanB: {
    id: string;
    name: string;
    target: string;
    hostsUp: number;
    totalOpenPorts: number;
  };
  differences: {
    hostsUpDiff: number;
    portsDiff: number;
  };
}

const CompareScans: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [scanAId, setScanAId] = useState('');
  const [scanBId, setScanBId] = useState('');
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentScans, setRecentScans] = useState<Array<{id: string; name: string}>>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect handled by App component
      return;
    }
    
    fetchRecentScans();
  }, [isAuthenticated]);

  const fetchRecentScans = async () => {
    try {
      const response = await apiService.getScanHistory(1, 20);
      if (response.success) {
        const scanOptions = response.data.scans
          .filter((scan: any) => scan.status === 'completed')
          .map((scan: any) => ({
            id: scan.id,
            name: scan.name
          }));
        setRecentScans(scanOptions);
      }
    } catch (err) {
      console.error('Failed to fetch recent scans:', err);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setComparison(null);
    
    if (!scanAId || !scanBId) {
      setError('Please select both scans to compare');
      return;
    }

    if (scanAId === scanBId) {
      setError('Please select two different scans');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.compareScans(scanAId, scanBId);
      
      if (response.success) {
        setComparison(response.data.comparison);
      } else {
        setError(response.error?.message || 'Failed to compare scans');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred during comparison');
    } finally {
      setLoading(false);
    }
  };

  const getDifferenceClass = (diff: number): string => {
    if (diff > 0) return 'text-green-600 bg-green-50';
    if (diff < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff > 0) return <ArrowTrendingUpIcon className="h-5 w-5" />;
    if (diff < 0) return <ArrowTrendingDownIcon className="h-5 w-5" />;
    return null;
  };

  if (!isAuthenticated) {
    return null; // Redirect handled by App component
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compare Scans</h1>
          <p className="mt-2 text-gray-600">
            Analyze differences between two network scans
          </p>
        </div>
        <Link
          to="/history"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ServerIcon className="h-5 w-5 mr-2" />
          Scan History
        </Link>
      </div>

      {/* Selection Form */}
      <Card title="Select Scans to Compare">
        <form onSubmit={handleCompare} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="scanA" className="block text-sm font-medium text-gray-700 mb-2">
                First Scan (A)
              </label>
              <select
                id="scanA"
                value={scanAId}
                onChange={(e) => setScanAId(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a scan...</option>
                {recentScans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {scan.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scanB" className="block text-sm font-medium text-gray-700 mb-2">
                Second Scan (B)
              </label>
              <select
                id="scanB"
                value={scanBId}
                onChange={(e) => setScanBId(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a scan...</option>
                {recentScans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {scan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !scanAId || !scanBId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Comparing...
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                  Compare Scans
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          <Card title="Scan Comparison Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scan A Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Scan A: {comparison.scanA.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Target:</span>
                    <span className="font-medium">{comparison.scanA.target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Hosts Up:</span>
                    <span className="font-medium">{comparison.scanA.hostsUp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Open Ports:</span>
                    <span className="font-medium">{comparison.scanA.totalOpenPorts}</span>
                  </div>
                </div>
              </div>

              {/* Scan B Details */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-900 mb-3">Scan B: {comparison.scanB.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-700">Target:</span>
                    <span className="font-medium">{comparison.scanB.target}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Hosts Up:</span>
                    <span className="font-medium">{comparison.scanB.hostsUp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Open Ports:</span>
                    <span className="font-medium">{comparison.scanB.totalOpenPorts}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Differences */}
          <Card title="Key Differences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-lg p-4 ${getDifferenceClass(comparison.differences.hostsUpDiff)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">Hosts Up Difference</h4>
                    <p className="text-sm mt-1">
                      Change in number of active hosts between scans
                    </p>
                  </div>
                  <div className="flex items-center">
                    {getDifferenceIcon(comparison.differences.hostsUpDiff)}
                    <span className="ml-2 text-2xl font-bold">
                      {comparison.differences.hostsUpDiff > 0 ? '+' : ''}
                      {comparison.differences.hostsUpDiff}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${getDifferenceClass(comparison.differences.portsDiff)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">Open Ports Difference</h4>
                    <p className="text-sm mt-1">
                      Change in total open ports between scans
                    </p>
                  </div>
                  <div className="flex items-center">
                    {getDifferenceIcon(comparison.differences.portsDiff)}
                    <span className="ml-2 text-2xl font-bold">
                      {comparison.differences.portsDiff > 0 ? '+' : ''}
                      {comparison.differences.portsDiff}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Analysis Summary</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    {comparison.differences.hostsUpDiff > 0 ? (
                      <span>New hosts discovered in the network</span>
                    ) : comparison.differences.hostsUpDiff < 0 ? (
                      <span>Some hosts are no longer accessible</span>
                    ) : (
                      <span>No change in the number of active hosts</span>
                    )}
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    {comparison.differences.portsDiff > 0 ? (
                      <span>More services are now accessible</span>
                    ) : comparison.differences.portsDiff < 0 ? (
                      <span>Fewer services are accessible</span>
                    ) : (
                      <span>No change in accessible services</span>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Help Section */}
      {!comparison && (
        <Card title="How to Use">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-600">
              Select two completed scans from the dropdown menus above to compare them. 
              The comparison will show differences in:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-2">
              <li>Number of active hosts discovered</li>
              <li>Total count of open ports</li>
              <li>Network changes and trends</li>
            </ul>
            <p className="text-gray-600 mt-3">
              This feature helps you track network changes over time and identify 
              new security concerns or improvements.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CompareScans;