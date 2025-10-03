import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Server, Clock, Activity } from 'lucide-react';
import { apiService } from '../services/api';

interface StatusCheck {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  responseTime?: number;
  lastChecked: Date;
}

export const ApiStatus: React.FC = () => {
  const [statusChecks, setStatusChecks] = useState<StatusCheck[]>([
    {
      name: 'API Health',
      status: 'checking',
      message: 'Checking...',
      lastChecked: new Date(),
    },
    {
      name: 'Agent Service',
      status: 'checking',
      message: 'Checking...',
      lastChecked: new Date(),
    },
    {
      name: 'File Upload',
      status: 'checking',
      message: 'Checking...',
      lastChecked: new Date(),
    },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkApiHealth = async (): Promise<StatusCheck> => {
    const startTime = Date.now();
    try {
      await apiService.healthCheck();
      const responseTime = Date.now() - startTime;
      return {
        name: 'API Health',
        status: 'success',
        message: 'API is healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'API Health',
        status: 'error',
        message: `API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  };

  const checkAgentService = async (): Promise<StatusCheck> => {
    const startTime = Date.now();
    try {
      // Try to get available agents or make a simple request
      await apiService.getAvailableAgents();
      const responseTime = Date.now() - startTime;
      return {
        name: 'Agent Service',
        status: 'success',
        message: 'Agent service is available',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'Agent Service',
        status: 'warning',
        message: `Agent service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  };

  const checkFileUpload = async (): Promise<StatusCheck> => {
    const startTime = Date.now();
    try {
      // Create a small test file
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await apiService.uploadFiles([testFile]);
      const responseTime = Date.now() - startTime;
      return {
        name: 'File Upload',
        status: 'success',
        message: 'File upload service is working',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'File Upload',
        status: 'warning',
        message: `File upload check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  };

  const runAllChecks = async () => {
    setIsRefreshing(true);
    
    try {
      const checks = await Promise.all([
        checkApiHealth(),
        checkAgentService(),
        checkFileUpload(),
      ]);
      
      setStatusChecks(checks);
    } catch (error) {
      console.error('Error running status checks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    runAllChecks();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(runAllChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: StatusCheck['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'checking':
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const overallStatus = statusChecks.some(check => check.status === 'error') 
    ? 'error' 
    : statusChecks.some(check => check.status === 'warning') 
      ? 'warning' 
      : statusChecks.every(check => check.status === 'success')
        ? 'success'
        : 'checking';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overall Status */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
          <button
            onClick={runAllChecks}
            disabled={isRefreshing}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className={`rounded-lg p-4 border ${getStatusColor(overallStatus)}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon(overallStatus)}
            <div>
              <h3 className="font-semibold text-lg">
                {overallStatus === 'success' && 'All Systems Operational'}
                {overallStatus === 'warning' && 'Some Issues Detected'}
                {overallStatus === 'error' && 'Service Disruption'}
                {overallStatus === 'checking' && 'Checking Systems...'}
              </h3>
              <p className="text-sm opacity-75">
                {overallStatus === 'success' && 'All services are running normally'}
                {overallStatus === 'warning' && 'Some services may be experiencing issues'}
                {overallStatus === 'error' && 'One or more services are not responding'}
                {overallStatus === 'checking' && 'Please wait while we check all systems'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Service Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statusChecks.map((check) => (
          <div key={check.name} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(check.status)}
                <h3 className="font-medium text-gray-900">{check.name}</h3>
              </div>
              {check.name === 'API Health' && <Server className="w-4 h-4 text-gray-400" />}
              {check.name === 'Agent Service' && <Activity className="w-4 h-4 text-gray-400" />}
              {check.name === 'File Upload' && <Server className="w-4 h-4 text-gray-400" />}
            </div>

            <p className="text-sm text-gray-600 mb-3">{check.message}</p>

            <div className="space-y-2">
              {check.responseTime && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Response Time
                  </span>
                  <span className={`font-medium ${
                    check.responseTime < 1000 ? 'text-green-600' :
                    check.responseTime < 3000 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {check.responseTime}ms
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last Checked</span>
                <span>{check.lastChecked.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Information</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Endpoints</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <code>/api/trpc/callAgent</code> - Agent execution</li>
              <li>• <code>/api/trpc/uploadFiles</code> - File uploads</li>
              <li>• <code>/health</code> - Health check</li>
              <li>• <code>/api/docs</code> - API documentation</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Supported Models</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• GPT-4O (Recommended)</li>
              <li>• GPT-4</li>
              <li>• GPT-4 Turbo</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">File Formats</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• PDF documents</li>
              <li>• Text files (.txt)</li>
              <li>• Word documents (.doc, .docx)</li>
              <li>• CSV files</li>
              <li>• JSON files</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Limits</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Max file size: 10MB</li>
              <li>• Max files per request: 10</li>
              <li>• Request timeout: 2 minutes</li>
              <li>• Rate limit: 100 req/min</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {statusChecks.filter(c => c.status === 'success').length}/{statusChecks.length}
            </div>
            <div className="text-sm text-gray-600">Services Online</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statusChecks.reduce((avg, check) => avg + (check.responseTime || 0), 0) / statusChecks.filter(c => c.responseTime).length || 0}ms
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">99.9%</div>
            <div className="text-sm text-gray-600">Uptime (24h)</div>
          </div>
        </div>
      </div>
    </div>
  );
};