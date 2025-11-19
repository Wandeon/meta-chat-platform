import { ExternalLink } from 'lucide-react';

export interface TopQuestion {
  question: string;
  count: number;
  avgSimilarity: number;
}

export interface TopQuestionsTableProps {
  questions: TopQuestion[];
  onImproveAnswer?: (question: string) => void;
}

export function TopQuestionsTable({ questions, onImproveAnswer }: TopQuestionsTableProps) {
  const truncate = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500';
    if (similarity >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Questions</h3>
      {questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No questions yet. Start chatting to see data here!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Similarity
                </th>
                {onImproveAnswer && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((q, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-4 text-sm text-gray-900">
                    <span title={q.question}>{truncate(q.question)}</span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {q.count}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${getSimilarityColor(q.avgSimilarity)}`}
                          style={{ width: `${q.avgSimilarity}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{q.avgSimilarity.toFixed(0)}%</span>
                    </div>
                  </td>
                  {onImproveAnswer && (
                    <td className="px-3 py-4 text-sm">
                      <button
                        onClick={() => onImproveAnswer(q.question)}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                      >
                        <span>Improve</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
