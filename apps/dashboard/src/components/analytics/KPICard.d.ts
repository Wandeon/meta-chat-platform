export interface KPICardProps {
    title: string;
    value: number | string;
    trend?: number;
    icon?: React.ReactNode;
    format?: 'number' | 'percentage' | 'duration';
}
export declare function KPICard({ title, value, trend, icon, format }: KPICardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=KPICard.d.ts.map