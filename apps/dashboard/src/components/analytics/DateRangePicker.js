import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Calendar, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
export function DateRangePicker({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const presets = [
        { label: 'Last 7 days', value: '7d', days: 7 },
        { label: 'Last 30 days', value: '30d', days: 30 },
        { label: 'Last 90 days', value: '90d', days: 90 },
        { label: 'Custom range', value: 'custom' },
    ];
    const handlePresetClick = (preset, days) => {
        if (preset === 'custom') {
            // For custom, keep current dates
            onChange({ ...value, preset });
            setIsOpen(false);
            return;
        }
        const endDate = new Date();
        const startDate = new Date();
        if (days) {
            startDate.setDate(startDate.getDate() - days);
        }
        onChange({ preset, startDate, endDate });
        setIsOpen(false);
    };
    const getDisplayLabel = () => {
        const preset = presets.find((p) => p.value === value.preset);
        return preset?.label || 'Select range';
    };
    return (_jsxs("div", { className: "relative", ref: dropdownRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsx("span", { children: getDisplayLabel() }), _jsx(ChevronDown, { className: "w-4 h-4" })] }), isOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10", children: [_jsx("div", { className: "py-1", children: presets.map((preset) => (_jsx("button", { onClick: () => handlePresetClick(preset.value, preset.days), className: `block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${value.preset === preset.value
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700'}`, children: preset.label }, preset.value))) }), value.preset === 'custom' && (_jsx("div", { className: "border-t border-gray-200 p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Start Date" }), _jsx("input", { type: "date", value: value.startDate.toISOString().split('T')[0], onChange: (e) => {
                                                const newStartDate = new Date(e.target.value);
                                                onChange({ ...value, startDate: newStartDate });
                                            }, className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "End Date" }), _jsx("input", { type: "date", value: value.endDate.toISOString().split('T')[0], onChange: (e) => {
                                                const newEndDate = new Date(e.target.value);
                                                onChange({ ...value, endDate: newEndDate });
                                            }, className: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm" })] })] }) }))] }))] }));
}
//# sourceMappingURL=DateRangePicker.js.map