import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeFormat, DateFormat } from '@/hooks/useUserPreferences';

interface DisplaySettingsProps {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  onTimeFormatChange: (format: TimeFormat) => void;
  onDateFormatChange: (format: DateFormat) => void;
  disabled?: boolean;
}

const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string; example: string }[] = [
  { value: '24h', label: '24-hour', example: '14:30' },
  { value: '12h', label: '12-hour', example: '2:30 PM' }
];

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'Day/Month/Year', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'Month/Day/Year', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'Year-Month-Day', example: '2024-12-31' }
];

export const DisplaySettings = ({
  timeFormat,
  dateFormat,
  onTimeFormatChange,
  onDateFormatChange,
  disabled = false
}: DisplaySettingsProps) => {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Customize how dates and times are displayed throughout the app.
      </div>
      
      {/* Time Format */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Time Format</Label>
        <RadioGroup
          value={timeFormat}
          onValueChange={(value) => onTimeFormatChange(value as TimeFormat)}
          disabled={disabled}
          className="space-y-2"
        >
          {TIME_FORMAT_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`time-${option.value}`}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{option.label}</div>
                  <p className="text-xs text-muted-foreground">
                    Example: {option.example}
                  </p>
                </div>
              </div>
              <RadioGroupItem value={option.value} id={`time-${option.value}`} />
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Date Format */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Date Format</Label>
        <Select
          value={dateFormat}
          onValueChange={(value) => onDateFormatChange(value as DateFormat)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select date format" />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMAT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.example}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
