import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'duration';
}

export function KPICard({ title, value, trend, icon, format = 'number' }: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return `${val}%`;
      case 'duration':
        return `${val.toFixed(1)}s`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    return trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (!trend) return <Minus className="w-4 h-4" />;
    return trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-4xl font-bold text-gray-900">{formatValue(value)}</p>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
