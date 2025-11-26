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
export declare function RAGPerformanceCard({ data }: RAGPerformanceCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=RAGPerformanceCard.d.ts.map