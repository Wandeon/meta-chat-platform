import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export interface ResponseTimeGaugeProps {
  averageTime: number; // in seconds
  maxTime?: number; // max scale, default 5
}

export function ResponseTimeGauge({ averageTime, maxTime = 5 }: ResponseTimeGaugeProps) {
  // Calculate percentage (0-100) based on max time
  const percentage = Math.min((averageTime / maxTime) * 100, 100);

  // Determine color based on response time
  const getColor = () => {
    if (averageTime < 1) return '#10b981'; // green
    if (averageTime < 2) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const data = [
    {
      name: 'Response Time',
      value: percentage,
      fill: getColor(),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Time</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={10}
                fill={getColor()}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {averageTime.toFixed(1)}s
            </span>
            <span className="text-sm text-gray-500">avg</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>&lt;1s</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>1-2s</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>&gt;2s</span>
        </div>
      </div>
    </div>
  );
}
