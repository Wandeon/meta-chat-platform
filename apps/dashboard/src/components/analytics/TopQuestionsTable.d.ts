export interface TopQuestion {
    question: string;
    count: number;
    avgSimilarity: number;
}
export interface TopQuestionsTableProps {
    questions: TopQuestion[];
    onImproveAnswer?: (question: string) => void;
}
export declare function TopQuestionsTable({ questions, onImproveAnswer }: TopQuestionsTableProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TopQuestionsTable.d.ts.map