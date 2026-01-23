import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AdaptiveSelect } from '@/components/adaptive';
import { TimeFormat, DateFormat } from '@/hooks/useUserPreferences';

interface DisplaySettingsProps {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  onTimeFormatChange: (format: TimeFormat) => void;
  onDateFormatChange: (format: DateFormat) => void;
  disabled?: boolean;
}

export const DisplaySettings = ({
  timeFormat,
  dateFormat,
  onTimeFormatChange,
  onDateFormatChange,
  disabled = false
}: DisplaySettingsProps) => {
  const { t } = useTranslation();

  const TIME_FORMAT_OPTIONS: { value: TimeFormat; labelKey: string; exampleKey: string }[] = [
    { value: '24h', labelKey: 'display.format24h', exampleKey: 'display.example24h' },
    { value: '12h', labelKey: 'display.format12h', exampleKey: 'display.example12h' }
  ];

  const DATE_FORMAT_OPTIONS: { value: DateFormat; labelKey: string; exampleKey: string }[] = [
    { value: 'DD/MM/YYYY', labelKey: 'display.formatDMY', exampleKey: 'display.exampleDMY' },
    { value: 'MM/DD/YYYY', labelKey: 'display.formatMDY', exampleKey: 'display.exampleMDY' },
    { value: 'YYYY-MM-DD', labelKey: 'display.formatYMD', exampleKey: 'display.exampleYMD' }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        Customize how dates and times are displayed throughout the app.
      </div>
      
      {/* Time Format */}
      <div className="space-y-2 sm:space-y-3">
        <Label className="text-sm sm:text-base font-medium">{t('display.timeFormat')}</Label>
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
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm sm:text-base">{t(option.labelKey)}</div>
                  <p className="text-xs text-muted-foreground">
                    {t(option.exampleKey)}
                  </p>
                </div>
              </div>
              <RadioGroupItem 
                value={option.value} 
                id={`time-${option.value}`} 
                className="shrink-0 scale-90 sm:scale-100"
              />
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Date Format */}
      <div className="space-y-2 sm:space-y-3">
        <Label className="text-sm sm:text-base font-medium">{t('display.dateFormat')}</Label>
        <AdaptiveSelect
          value={dateFormat}
          onValueChange={(value) => onDateFormatChange(value as DateFormat)}
          disabled={disabled}
          placeholder="Select date format"
          title={t('display.dateFormat')}
          options={DATE_FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: `${t(option.labelKey)} (${t(option.exampleKey)})`
          }))}
        />
      </div>
    </div>
  );
};
