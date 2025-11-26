export interface SystemStatus {
    api: 'healthy' | 'degraded' | 'down';
    database: 'connected' | 'disconnected';
    ragAccuracy?: number;
    errorRate?: number;
}
export interface SystemStatusCardProps {
    status: SystemStatus;
}
export declare function SystemStatusCard({ status }: SystemStatusCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SystemStatusCard.d.ts.map