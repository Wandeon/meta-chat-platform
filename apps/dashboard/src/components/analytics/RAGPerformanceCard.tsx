import { FileText, TrendingUp } from 'lucide-react';

export interface TopDocument {
  title: string;
  queryCount: number;
}

export interface RAGPerformanceData {
  totalQueries: number;
  avgSimilarity: number;
  hitRate: number;
  topDocuments: TopDocument[];
}

export interface RAGPerformanceCardProps {
  data: RAGPerformanceData;
}

export function RAGPerformanceCard({ data }: RAGPerformanceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">RAG Performance</h3>

      <div className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.totalQueries}</p>
            <p className="text-xs text-gray-500">Total Queries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.avgSimilarity.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Avg Similarity</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.hitRate.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Hit Rate</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Top Documents */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Top Documents
          </h4>
          {data.topDocuments.length === 0 ? (
            <p className="text-sm text-gray-500">No documents indexed yet</p>
          ) : (
            <div className="space-y-2">
              {data.topDocuments.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate" title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                    {doc.queryCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
