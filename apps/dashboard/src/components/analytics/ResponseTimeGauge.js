import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
export function ResponseTimeGauge({ averageTime, maxTime = 5 }) {
    // Calculate percentage (0-100) based on max time
    const percentage = Math.min((averageTime / maxTime) * 100, 100);
    // Determine color based on response time
    const getColor = () => {
        if (averageTime < 1)
            return '#10b981'; // green
        if (averageTime < 2)
            return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };
    const data = [
        {
            name: 'Response Time',
            value: percentage,
            fill: getColor(),
        },
    ];
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Response Time" }), _jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "relative w-48 h-48", children: [_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadialBarChart, { cx: "50%", cy: "50%", innerRadius: "60%", outerRadius: "90%", data: data, startAngle: 180, endAngle: 0, children: [_jsx(PolarAngleAxis, { type: "number", domain: [0, 100], angleAxisId: 0, tick: false }), _jsx(RadialBar, { background: true, dataKey: "value", cornerRadius: 10, fill: getColor() })] }) }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsxs("span", { className: "text-3xl font-bold text-gray-900", children: [averageTime.toFixed(1), "s"] }), _jsx("span", { className: "text-sm text-gray-500", children: "avg" })] })] }) }), _jsxs("div", { className: "mt-4 flex justify-between text-xs text-gray-500", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-green-500" }), _jsx("span", { children: "<1s" })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-500" }), _jsx("span", { children: "1-2s" })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-500" }), _jsx("span", { children: ">2s" })] })] })] }));
}
//# sourceMappingURL=ResponseTimeGauge.js.map