import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { MessageSquare, Users, FileText, CheckCircle2 } from 'lucide-react';
import {
  KPICard,
  SystemStatusCard,
  ResponseTimeGauge,
  ConversationChart,
  TopQuestionsTable,
  RAGPerformanceCard,
  DateRangePicker,
  ExportButton,
  type DateRange,
  type ChartDataPoint,
  type SystemStatus,
  type TopQuestion,
  type RAGPerformanceData,
} from '../components/analytics';

interface Tenant {
  id: string;
  name: string;
  active: boolean;
}

interface AnalyticsOverview {
  current: {
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    resolutionRate: number;
    avgResponseTime: number;
  };
  period: {
    conversations: Array<{ date: string; count: number }>;
    messages: Array<{ date: string; count: number }>;
  };
}

interface RAGPerformance {
  totalQueries: number;
  avgSimilarity: number;
  hitRate: number;
  topDocuments: Array<{ title: string; queryCount: number }>;
}

interface ResponseTimeStats {
  average: number;
  p50: number;
  p95: number;
  p99: number;
}

interface HealthStatus {
  status: string;
  database: {
    connected: boolean;
  };
}

export function AnalyticsPage() {
  const api = useApi();

  // Date range state - default to last 7 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    return { preset: '7d', startDate, endDate };
  });

  // Tenant selection
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Fetch tenants
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  // Auto-select first active tenant if none selected
  const activeTenants = useMemo(() => {
    return tenants?.filter((t) => t.active) || [];
  }, [tenants]);

  const currentTenantId = selectedTenantId || activeTenants[0]?.id || '';

  // Fetch analytics overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', currentTenantId, dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      api.get<AnalyticsOverview>('/api/analytics/overview', {
        tenantId: currentTenantId,
      }),
    enabled: !!currentTenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch RAG performance
  const { data: ragPerformance } = useQuery({
    queryKey: ['analytics', 'rag-performance', currentTenantId, dateRange.preset],
    queryFn: () =>
      api.get<RAGPerformance>('/api/analytics/rag-performance', {
        tenantId: currentTenantId,
        days: dateRange.preset === '7d' ? '7' : dateRange.preset === '30d' ? '30' : '90',
      }),
    enabled: !!currentTenantId,
  });

  // Fetch top questions
  const { data: topQuestions } = useQuery({
    queryKey: ['analytics', 'top-questions', currentTenantId],
    queryFn: () =>
      api.get<TopQuestion[]>('/api/analytics/top-questions', {
        tenantId: currentTenantId,
        limit: '10',
      }),
    enabled: !!currentTenantId,
  });

  // Fetch response times
  const { data: responseTimes } = useQuery({
    queryKey: ['analytics', 'response-times', currentTenantId, dateRange.preset],
    queryFn: () =>
      api.get<ResponseTimeStats>('/api/analytics/response-times', {
        tenantId: currentTenantId,
        range: dateRange.preset,
      }),
    enabled: !!currentTenantId,
  });

  // Fetch health status
  const { data: healthStatus } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthStatus>('/api/health'),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Transform data for charts
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!overview?.period) return [];

    const conversationMap = new Map(
      overview.period.conversations.map((c) => [c.date, c.count])
    );
    const messageMap = new Map(overview.period.messages.map((m) => [m.date, m.count]));

    const allDates = Array.from(
      new Set([
        ...overview.period.conversations.map((c) => c.date),
        ...overview.period.messages.map((m) => m.date),
      ])
    ).sort();

    return allDates.map((date) => ({
      date,
      conversations: conversationMap.get(date) || 0,
      messages: messageMap.get(date) || 0,
    }));
  }, [overview]);

  // System status
  const systemStatus: SystemStatus = useMemo(() => {
    return {
      api: healthStatus?.status === 'ok' ? 'healthy' : 'down',
      database: healthStatus?.database?.connected ? 'connected' : 'disconnected',
      ragAccuracy: ragPerformance?.avgSimilarity || 0,
      errorRate: 0.1, // Placeholder - would need actual error tracking
    };
  }, [healthStatus, ragPerformance]);

  // RAG performance data
  const ragData: RAGPerformanceData = useMemo(() => {
    return {
      totalQueries: ragPerformance?.totalQueries || 0,
      avgSimilarity: ragPerformance?.avgSimilarity || 0,
      hitRate: ragPerformance?.hitRate || 0,
      topDocuments: ragPerformance?.topDocuments || [],
    };
  }, [ragPerformance]);

  // Export handlers
  const handleExportCSV = () => {
    if (!overview) return;

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
    return (
      <section className="dashboard-section">
        <h1>Analytics Dashboard</h1>
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No Active Tenants</h3>
          <p className="text-gray-500 mt-2">
            Create and activate a tenant to view analytics.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into business value, performance, and optimization opportunities
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {activeTenants.length > 1 && (
            <select
              value={currentTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {activeTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportButton onExportCSV={handleExportCSV} />
        </div>
      </div>

      {overviewLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      ) : !overview?.current ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No Data Yet</h3>
          <p className="text-gray-500 mt-2">
            Start chatting to see analytics appear here!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: BUSINESS VALUE - KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Conversations"
              value={overview.current.totalConversations}
              trend={12}
              icon={<MessageSquare className="w-5 h-5" />}
              format="number"
            />
            <KPICard
              title="Messages"
              value={overview.current.totalMessages}
              trend={8}
              icon={<FileText className="w-5 h-5" />}
              format="number"
            />
            <KPICard
              title="Active Users"
              value={overview.current.activeUsers}
              trend={5}
              icon={<Users className="w-5 h-5" />}
              format="number"
            />
            <KPICard
              title="Resolution Rate"
              value={overview.current.resolutionRate}
              trend={3}
              icon={<CheckCircle2 className="w-5 h-5" />}
              format="percentage"
            />
          </div>

          {/* SECTION 2: REAL-TIME HEALTH */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemStatusCard status={systemStatus} />
            <ResponseTimeGauge averageTime={responseTimes?.average || overview.current.avgResponseTime || 1.2} />
          </div>

          {/* SECTION 3: TRENDS */}
          <ConversationChart data={chartData} />

          {/* SECTION 4: OPTIMIZATION OPPORTUNITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopQuestionsTable
              questions={topQuestions || []}
              onImproveAnswer={(question) => {
                // Could navigate to documents page or open a modal
              }}
            />
            <RAGPerformanceCard data={ragData} />
          </div>
        </div>
      )}
    </section>
  );
}
