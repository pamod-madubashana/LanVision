import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../api/apiService';

import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ServerIcon, 
  ShieldCheckIcon, 
  ArrowsRightLeftIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ScanSummary {
  totalScans: number;
  lastScan?: {
    name: string;
    target: string;
    hostsUp: number;
    totalOpenPorts: number;
    finishedAt: string;
  };
  recentScans: Array<{
    id: string;
    name: string;
    target: string;
    status: string;
    hostsUp: number;
    totalOpenPorts: number;
    createdAt: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch recent scans (first page with limit 5)
      const response = await apiService.getScanHistory(1, 5);
      
      if (response.success) {
        const scans = response.data.scans;
        const totalScans = response.data.pagination.totalScans;
        
        const dashboardData: ScanSummary = {
          totalScans,
          recentScans: scans,
          lastScan: scans.length > 0 ? scans[0] : undefined
        };
        
        setSummary(dashboardData);
      } else {
        setError(response.error?.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.username}!</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/scan/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            data-discover="true"
          >
            <ServerIcon className="h-5 w-5 mr-2 text-white" />
            <span className="text-white">New Scan</span>
          </Link>
          <Link
            to="/scan/builder"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            data-discover="true"
          >
            <ServerIcon className="h-5 w-5 mr-2 text-gray-700" />
            <span className="text-gray-700">Advanced Builder</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 w-full">
        <div className="bg-white rounded-lg shadow overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-blue-100 truncate">Total Scans</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-white">{summary?.totalScans || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-green-100 truncate">Last Scan Hosts Up</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-white">{summary?.lastScan?.hostsUp || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowsRightLeftIcon className="h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-yellow-100 truncate">Open Ports</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-white">{summary?.lastScan?.totalOpenPorts || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-purple-100 truncate">Recent Activity</dt>
                  <dd className="flex items-baseline">
                    <div className="text-lg font-semibold text-white">{summary?.recentScans?.length || 0} scans</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg shadow overflow-hidden ">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Scans</h3>
        </div>
        <div className="px-6 py-4">
          {summary?.recentScans && summary.recentScans.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scan Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hosts Up
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Open Ports
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.recentScans.map((scan) => (
                    <tr key={scan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {scan.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {scan.target}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          scan.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : scan.status === 'running'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {scan.hostsUp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {scan.totalOpenPorts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          to={`/scan/${scan.id}`} 
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scans yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new network scan.</p>
              <div className="mt-6">
                <Link
                  to="/scan/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  data-discover="true"
                >
                  <ServerIcon className="-ml-1 mr-2 h-5 w-5" />
                  Start Your First Scan
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;