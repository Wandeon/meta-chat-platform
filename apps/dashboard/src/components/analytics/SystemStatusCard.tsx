import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'connected' | 'disconnected';
  ragAccuracy?: number;
  errorRate?: number;
}

export interface SystemStatusCardProps {
  status: SystemStatus;
}

export function SystemStatusCard({ status }: SystemStatusCardProps) {
  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'healthy':
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'down':
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'healthy':
        return 'Healthy';
      case 'connected':
        return 'Connected';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">API</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.api)}
            <span className="text-sm font-medium">{getStatusText(status.api)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Database</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.database)}
            <span className="text-sm font-medium">{getStatusText(status.database)}</span>
          </div>
        </div>

        {status.ragAccuracy !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">RAG Accuracy</span>
            <div className="flex items-center space-x-2">
              {status.ragAccuracy >= 80 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : status.ragAccuracy >= 60 ? (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">{status.ragAccuracy}%</span>
            </div>
          </div>
        )}

        {status.errorRate !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Error Rate</span>
            <div className="flex items-center space-x-2">
              {status.errorRate < 1 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : status.errorRate < 5 ? (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">{status.errorRate.toFixed(2)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
