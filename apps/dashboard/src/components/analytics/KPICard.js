import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
export function KPICard({ title, value, trend, icon, format = 'number' }) {
    const formatValue = (val) => {
        if (typeof val === 'string')
            return val;
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
        if (!trend)
            return 'text-gray-500';
        return trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500';
    };
    const getTrendIcon = () => {
        if (!trend)
            return _jsx(Minus, { className: "w-4 h-4" });
        return trend > 0 ? _jsx(ArrowUp, { className: "w-4 h-4" }) : _jsx(ArrowDown, { className: "w-4 h-4" });
    };
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: title }), icon && _jsx("div", { className: "text-gray-400", children: icon })] }), _jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("p", { className: "text-4xl font-bold text-gray-900", children: formatValue(value) }), trend !== undefined && (_jsxs("div", { className: `flex items-center space-x-1 text-sm font-medium ${getTrendColor()}`, children: [getTrendIcon(), _jsxs("span", { children: [Math.abs(trend), "%"] })] }))] })] }));
}
//# sourceMappingURL=KPICard.js.map