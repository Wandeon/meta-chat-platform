import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
export function ConversationChart({ data }) {
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Conversations & Messages Over Time" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", tick: { fill: '#6b7280', fontSize: 12 }, tickFormatter: (value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            } }), _jsx(YAxis, { yAxisId: "left", tick: { fill: '#6b7280', fontSize: 12 }, label: { value: 'Conversations', angle: -90, position: 'insideLeft' } }), _jsx(YAxis, { yAxisId: "right", orientation: "right", tick: { fill: '#6b7280', fontSize: 12 }, label: { value: 'Messages', angle: 90, position: 'insideRight' } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                            }, labelFormatter: (value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString();
                            } }), _jsx(Legend, {}), _jsx(Line, { yAxisId: "left", type: "monotone", dataKey: "conversations", stroke: "#3b82f6", strokeWidth: 2, dot: { fill: '#3b82f6', r: 4 }, activeDot: { r: 6 }, name: "Conversations" }), _jsx(Line, { yAxisId: "right", type: "monotone", dataKey: "messages", stroke: "#10b981", strokeWidth: 2, dot: { fill: '#10b981', r: 4 }, activeDot: { r: 6 }, name: "Messages" })] }) })] }));
}
//# sourceMappingURL=ConversationChart.js.map