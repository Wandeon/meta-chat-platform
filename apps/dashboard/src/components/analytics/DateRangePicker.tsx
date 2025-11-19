import { Calendar, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets: { label: string; value: DateRangePreset; days?: number }[] = [
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'Custom range', value: 'custom' },
  ];

  const handlePresetClick = (preset: DateRangePreset, days?: number) => {
    if (preset === 'custom') {
      // For custom, keep current dates
      onChange({ ...value, preset });
      setIsOpen(false);
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    if (days) {
      startDate.setDate(startDate.getDate() - days);
    }

    onChange({ preset, startDate, endDate });
    setIsOpen(false);
  };

  const getDisplayLabel = () => {
    const preset = presets.find((p) => p.value === value.preset);
    return preset?.label || 'Select range';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Calendar className="w-4 h-4" />
        <span>{getDisplayLabel()}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value, preset.days)}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  value.preset === preset.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {value.preset === 'custom' && (
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={value.startDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newStartDate = new Date(e.target.value);
                      onChange({ ...value, startDate: newStartDate });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={value.endDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newEndDate = new Date(e.target.value);
                      onChange({ ...value, endDate: newEndDate });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
