import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
export function SystemStatusCard({ status }) {
    const getStatusIcon = (state) => {
        switch (state) {
            case 'healthy':
            case 'connected':
                return _jsx(CheckCircle2, { className: "w-4 h-4 text-green-500" });
            case 'degraded':
                return _jsx(AlertCircle, { className: "w-4 h-4 text-yellow-500" });
            case 'down':
            case 'disconnected':
                return _jsx(XCircle, { className: "w-4 h-4 text-red-500" });
            default:
                return _jsx(AlertCircle, { className: "w-4 h-4 text-gray-500" });
        }
    };
    const getStatusText = (state) => {
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
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "System Status" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "API" }), _jsxs("div", { className: "flex items-center space-x-2", children: [getStatusIcon(status.api), _jsx("span", { className: "text-sm font-medium", children: getStatusText(status.api) })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Database" }), _jsxs("div", { className: "flex items-center space-x-2", children: [getStatusIcon(status.database), _jsx("span", { className: "text-sm font-medium", children: getStatusText(status.database) })] })] }), status.ragAccuracy !== undefined && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "RAG Accuracy" }), _jsxs("div", { className: "flex items-center space-x-2", children: [status.ragAccuracy >= 80 ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-green-500" })) : status.ragAccuracy >= 60 ? (_jsx(AlertCircle, { className: "w-4 h-4 text-yellow-500" })) : (_jsx(XCircle, { className: "w-4 h-4 text-red-500" })), _jsxs("span", { className: "text-sm font-medium", children: [status.ragAccuracy, "%"] })] })] })), status.errorRate !== undefined && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Error Rate" }), _jsxs("div", { className: "flex items-center space-x-2", children: [status.errorRate < 1 ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-green-500" })) : status.errorRate < 5 ? (_jsx(AlertCircle, { className: "w-4 h-4 text-yellow-500" })) : (_jsx(XCircle, { className: "w-4 h-4 text-red-500" })), _jsxs("span", { className: "text-sm font-medium", children: [status.errorRate.toFixed(2), "%"] })] })] }))] })] }));
}
//# sourceMappingURL=SystemStatusCard.js.map