export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';
export interface DateRange {
    preset: DateRangePreset;
    startDate: Date;
    endDate: Date;
}
export interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}
export declare function DateRangePicker({ value, onChange }: DateRangePickerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=DateRangePicker.d.ts.map