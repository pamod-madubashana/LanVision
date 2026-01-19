import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ScanStatus, ScanLogEvent, ScanStatusEvent, ScanDoneEvent, ScanErrorEvent } from '../types/scanConfig';

interface LiveScanLogsProps {
  scanId: string;
  initialStatus?: ScanStatus;
  onStatusChange?: (status: ScanStatus) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const LiveScanLogs: React.FC<LiveScanLogsProps> = ({
  scanId,
  initialStatus = 'starting',
  onStatusChange,
  onComplete,
  onError
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<ScanStatus>(initialStatus);
  const [autoScroll, setAutoScroll] = useState(true);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const { token } = useAuth();
  
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Handle auto-scrolling
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      // Scroll to bottom when new logs are added
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Establish SSE connection
  useEffect(() => {
    if (!scanId) return;

    const connect = () => {
      try {
        // Include auth token in URL for SSE authentication
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const streamUrl = token 
          ? `${baseUrl}/api/scans/${scanId}/stream?token=${encodeURIComponent(token)}`
          : `${baseUrl}/api/scans/${scanId}/stream`;
        
        const es = new EventSource(streamUrl);
        
        es.addEventListener('connected', (event) => {
          const data = JSON.parse(event.data);
          console.log('Connected to scan stream:', data);
          setConnectionError(null);
        });

        es.addEventListener('log', (event) => {
          const data: ScanLogEvent = JSON.parse(event.data);
          setLogs(prev => [...prev, data.message]);
        });

        es.addEventListener('status', (event) => {
          const data: ScanStatusEvent = JSON.parse(event.data);
          setStatus(data.status);
          onStatusChange?.(data.status);
        });

        es.addEventListener('done', (event) => {
          const data: ScanDoneEvent = JSON.parse(event.data);
          onComplete?.(data.result);
          es.close();
        });

        es.addEventListener('error', (event: any) => {
          const data: ScanErrorEvent = JSON.parse(event.data);
          onError?.(data.message);
          setConnectionError(data.message);
          es.close();
        });

        es.onerror = (error) => {
          console.error('SSE connection error:', error);
          setConnectionError('Connection lost. Attempting to reconnect...');
          es.close();
        };

        setEventSource(es);

        // Cleanup function
        return () => {
          es.close();
        };
      } catch (error) {
        console.error('Failed to establish SSE connection:', error);
        setConnectionError('Failed to connect to log stream');
      }
    };

    const cleanup = connect();

    // Reconnect logic with exponential backoff
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const attemptReconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts && status !== 'done' && status !== 'error') {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
        
        reconnectTimeout = setTimeout(() => {
          console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
          connect();
        }, delay);
      }
    };

    // Handle visibility change for reconnecting when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (status === 'starting' || status === 'running') && 
          !eventSource) {
        attemptReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (cleanup) cleanup();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scanId, status, onStatusChange, onComplete, onError]);

  // Handle manual scroll detection
  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      
      if (!isAtBottom && !isUserScrollingRef.current) {
        isUserScrollingRef.current = true;
        setAutoScroll(false);
      } else if (isAtBottom && isUserScrollingRef.current) {
        isUserScrollingRef.current = false;
        setAutoScroll(true);
      }
    }
  };

  // Reset auto-scroll when user clicks the follow button
  const handleFollowLogs = () => {
    setAutoScroll(true);
    isUserScrollingRef.current = false;
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  // Copy logs to clipboard
  const copyLogsToClipboard = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      // Could add a toast notification here
      console.log('Logs copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy logs:', err);
    });
  };

  // Clear logs (frontend only)
  const clearLogs = () => {
    setLogs([]);
  };

  // Get status badge color
  const getStatusColor = (status: ScanStatus): string => {
    switch (status) {
      case 'starting': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ScanStatus): React.ReactElement => {
    switch (status) {
      case 'starting':
        return (
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'running':
        return (
          <svg className="animate-pulse h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          </svg>
        );
      case 'done':
        return (
          <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return <div className="h-4 w-4"></div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Scan Progress</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            <span className="ml-1 capitalize">{status}</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={copyLogsToClipboard}
            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Copy logs to clipboard"
          >
            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          
          <button
            onClick={clearLogs}
            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Clear logs (frontend only)"
          >
            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
          
          {!autoScroll && (
            <button
              onClick={handleFollowLogs}
              className="inline-flex items-center px-3 py-1 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Follow new logs"
            >
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Follow
            </button>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center text-sm text-red-700">
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {connectionError}
          </div>
        </div>
      )}

      {/* Logs Container */}
      <div 
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="h-96 overflow-y-auto p-4 font-mono text-sm bg-gray-900 text-green-400 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">Waiting for scan to start...</p>
              <p className="text-xs mt-1">Logs will appear here in real-time</p>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className="py-1 hover:bg-gray-800 px-2 rounded"
              >
                <span className="text-gray-500 mr-2">[{index + 1}]</span>
                {log}
              </div>
            ))}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <div>
          Lines: {logs.length} | Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </div>
        <div>
          {status === 'running' && (
            <span className="flex items-center">
              <span className="flex h-2 w-2 mr-1">
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              Live updates
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveScanLogs;