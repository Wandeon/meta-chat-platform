import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ExternalLink } from 'lucide-react';
export function TopQuestionsTable({ questions, onImproveAnswer }) {
    const truncate = (text, maxLength = 50) => {
        if (text.length <= maxLength)
            return text;
        return text.slice(0, maxLength) + '...';
    };
    const getSimilarityColor = (similarity) => {
        if (similarity >= 80)
            return 'bg-green-500';
        if (similarity >= 60)
            return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Top Questions" }), questions.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: _jsx("p", { children: "No questions yet. Start chatting to see data here!" }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Question" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Count" }), _jsx("th", { className: "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Avg Similarity" }), onImproveAnswer && (_jsx("th", { className: "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Action" }))] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: questions.map((q, idx) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-3 py-4 text-sm text-gray-900", children: _jsx("span", { title: q.question, children: truncate(q.question) }) }), _jsx("td", { className: "px-3 py-4 text-sm text-gray-900", children: _jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800", children: q.count }) }), _jsx("td", { className: "px-3 py-4 text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]", children: _jsx("div", { className: `h-2 rounded-full ${getSimilarityColor(q.avgSimilarity)}`, style: { width: `${q.avgSimilarity}%` } }) }), _jsxs("span", { className: "text-xs font-medium", children: [q.avgSimilarity.toFixed(0), "%"] })] }) }), onImproveAnswer && (_jsx("td", { className: "px-3 py-4 text-sm", children: _jsxs("button", { onClick: () => onImproveAnswer(q.question), className: "inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800", children: [_jsx("span", { children: "Improve" }), _jsx(ExternalLink, { className: "w-3 h-3" })] }) }))] }, idx))) })] }) }))] }));
}
//# sourceMappingURL=TopQuestionsTable.js.map