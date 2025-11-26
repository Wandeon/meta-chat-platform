export interface ChartDataPoint {
    date: string;
    conversations: number;
    messages: number;
}
export interface ConversationChartProps {
    data: ChartDataPoint[];
}
export declare function ConversationChart({ data }: ConversationChartProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ConversationChart.d.ts.map