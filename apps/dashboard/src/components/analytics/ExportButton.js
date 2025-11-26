import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Download, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
export function ExportButton({ onExportCSV, onExportPNG }) {
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
    const handleExport = (type) => {
        if (type === 'csv') {
            onExportCSV();
        }
        else if (type === 'png' && onExportPNG) {
            onExportPNG();
        }
        setIsOpen(false);
    };
    return (_jsxs("div", { className: "relative", ref: dropdownRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { children: "Export" }), _jsx(ChevronDown, { className: "w-4 h-4" })] }), isOpen && (_jsx("div", { className: "absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10", children: _jsxs("div", { className: "py-1", children: [_jsx("button", { onClick: () => handleExport('csv'), className: "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100", children: "Export as CSV" }), onExportPNG && (_jsx("button", { onClick: () => handleExport('png'), className: "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100", children: "Export as PNG" }))] }) }))] }));
}
//# sourceMappingURL=ExportButton.js.map