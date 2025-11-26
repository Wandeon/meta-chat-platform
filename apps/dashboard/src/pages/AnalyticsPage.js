import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { MessageSquare, Users, FileText, CheckCircle2 } from 'lucide-react';
import { KPICard, SystemStatusCard, ResponseTimeGauge, ConversationChart, TopQuestionsTable, RAGPerformanceCard, DateRangePicker, ExportButton, } from '../components/analytics';
export function AnalyticsPage() {
    const api = useApi();
    // Date range state - default to last 7 days
    const [dateRange, setDateRange] = useState(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        return { preset: '7d', startDate, endDate };
    });
    // Tenant selection
    const [selectedTenantId, setSelectedTenantId] = useState('');
    // Fetch tenants
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: () => api.get('/api/tenants'),
    });
    // Auto-select first active tenant if none selected
    const activeTenants = useMemo(() => {
        return tenants?.filter((t) => t.active) || [];
    }, [tenants]);
    const currentTenantId = selectedTenantId || activeTenants[0]?.id || '';
    // Fetch analytics overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['analytics', 'overview', currentTenantId, dateRange.startDate, dateRange.endDate],
        queryFn: () => api.get('/api/analytics/overview', {
            tenantId: currentTenantId,
        }),
        enabled: !!currentTenantId,
        refetchInterval: 30000, // Refresh every 30 seconds
    });
    // Fetch RAG performance
    const { data: ragPerformance } = useQuery({
        queryKey: ['analytics', 'rag-performance', currentTenantId, dateRange.preset],
        queryFn: () => api.get('/api/analytics/rag-performance', {
            tenantId: currentTenantId,
            days: dateRange.preset === '7d' ? '7' : dateRange.preset === '30d' ? '30' : '90',
        }),
        enabled: !!currentTenantId,
    });
    // Fetch top questions
    const { data: topQuestions } = useQuery({
        queryKey: ['analytics', 'top-questions', currentTenantId],
        queryFn: () => api.get('/api/analytics/top-questions', {
            tenantId: currentTenantId,
            limit: '10',
        }),
        enabled: !!currentTenantId,
    });
    // Fetch response times
    const { data: responseTimes } = useQuery({
        queryKey: ['analytics', 'response-times', currentTenantId, dateRange.preset],
        queryFn: () => api.get('/api/analytics/response-times', {
            tenantId: currentTenantId,
            range: dateRange.preset,
        }),
        enabled: !!currentTenantId,
    });
    // Fetch health status
    const { data: healthStatus } = useQuery({
        queryKey: ['health'],
        queryFn: () => api.get('/api/health'),
        refetchInterval: 10000, // Refresh every 10 seconds
    });
    // Transform data for charts
    const chartData = useMemo(() => {
        if (!overview?.period)
            return [];
        const conversationMap = new Map(overview.period.conversations.map((c) => [c.date, c.count]));
        const messageMap = new Map(overview.period.messages.map((m) => [m.date, m.count]));
        const allDates = Array.from(new Set([
            ...overview.period.conversations.map((c) => c.date),
            ...overview.period.messages.map((m) => m.date),
        ])).sort();
        return allDates.map((date) => ({
            date,
            conversations: conversationMap.get(date) || 0,
            messages: messageMap.get(date) || 0,
        }));
    }, [overview]);
    // System status
    const systemStatus = useMemo(() => {
        return {
            api: healthStatus?.status === 'ok' ? 'healthy' : 'down',
            database: healthStatus?.database?.connected ? 'connected' : 'disconnected',
            ragAccuracy: ragPerformance?.avgSimilarity || 0,
            errorRate: 0.1, // Placeholder - would need actual error tracking
        };
    }, [healthStatus, ragPerformance]);
    // RAG performance data
    const ragData = useMemo(() => {
        return {
            totalQueries: ragPerformance?.totalQueries || 0,
            avgSimilarity: ragPerformance?.avgSimilarity || 0,
            hitRate: ragPerformance?.hitRate || 0,
            topDocuments: ragPerformance?.topDocuments || [],
        };
    }, [ragPerformance]);
    // Export handlers
    const handleExportCSV = () => {
        if (!overview)
            return;
        const csvData = [
            ['Date', 'Conversations', 'Messages'],
            ...chartData.map((d) => [d.date, d.conversations, d.messages]),
        ];
        const csvContent = csvData.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange.preset}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    if (!currentTenantId) {
        return (_jsxs("section", { className: "dashboard-section", children: [_jsx("h1", { children: "Analytics Dashboard" }), _jsxs("div", { className: "text-center py-12", children: [_jsx(MessageSquare, { className: "w-16 h-16 mx-auto text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium", children: "No Active Tenants" }), _jsx("p", { className: "text-gray-500 mt-2", children: "Create and activate a tenant to view analytics." })] })] }));
    }
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { children: "Analytics Dashboard" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Comprehensive insights into business value, performance, and optimization opportunities" })] }), _jsxs("div", { className: "flex items-center space-x-4", children: [activeTenants.length > 1 && (_jsx("select", { value: currentTenantId, onChange: (e) => setSelectedTenantId(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: activeTenants.map((tenant) => (_jsx("option", { value: tenant.id, children: tenant.name }, tenant.id))) })), _jsx(DateRangePicker, { value: dateRange, onChange: setDateRange }), _jsx(ExportButton, { onExportCSV: handleExportCSV })] })] }), overviewLoading ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "Loading analytics..." }) })) : !overview?.current ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(MessageSquare, { className: "w-16 h-16 mx-auto text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium", children: "No Data Yet" }), _jsx("p", { className: "text-gray-500 mt-2", children: "Start chatting to see analytics appear here!" })] })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(KPICard, { title: "Conversations", value: overview.current.totalConversations, trend: 12, icon: _jsx(MessageSquare, { className: "w-5 h-5" }), format: "number" }), _jsx(KPICard, { title: "Messages", value: overview.current.totalMessages, trend: 8, icon: _jsx(FileText, { className: "w-5 h-5" }), format: "number" }), _jsx(KPICard, { title: "Active Users", value: overview.current.activeUsers, trend: 5, icon: _jsx(Users, { className: "w-5 h-5" }), format: "number" }), _jsx(KPICard, { title: "Resolution Rate", value: overview.current.resolutionRate, trend: 3, icon: _jsx(CheckCircle2, { className: "w-5 h-5" }), format: "percentage" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(SystemStatusCard, { status: systemStatus }), _jsx(ResponseTimeGauge, { averageTime: responseTimes?.average || overview.current.avgResponseTime || 1.2 })] }), _jsx(ConversationChart, { data: chartData }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(TopQuestionsTable, { questions: topQuestions || [], onImproveAnswer: (question) => {
                                    console.log('Improve answer for:', question);
                                    // Could navigate to documents page or open a modal
                                } }), _jsx(RAGPerformanceCard, { data: ragData })] })] }))] }));
}
//# sourceMappingURL=AnalyticsPage.js.map