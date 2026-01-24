import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isIOSPWA } from '@/lib/platformUtils';
import { IOSDatePickerSheet } from '@/components/ios/IOSDatePickerSheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface AdaptiveDatePickerProps {
  // Single date mode
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  // Range mode
  mode?: 'single' | 'range';
  selectedRange?: DateRange;
  onRangeChange?: (range: DateRange | undefined) => void;
  // Common props
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  title?: string;
  showQuickActions?: boolean;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
}

export const AdaptiveDatePicker: React.FC<AdaptiveDatePickerProps> = ({
  selectedDate,
  onDateChange,
  mode = 'single',
  selectedRange,
  onRangeChange,
  placeholder,
  disabled,
  className,
  triggerClassName,
  title,
  showQuickActions = true,
  minDate,
  maxDate,
  dateFormat = 'PPP',
}) => {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Get display text
  const getDisplayText = () => {
    if (mode === 'single') {
      return selectedDate ? format(selectedDate, dateFormat) : (placeholder || t('datePicker.pickDate'));
    } else {
      if (selectedRange?.from) {
        if (selectedRange.to) {
          return `${format(selectedRange.from, 'LLL dd')} - ${format(selectedRange.to, 'LLL dd')}`;
        }
        return format(selectedRange.from, 'LLL dd');
      }
      return placeholder || t('datePicker.pickDateRange');
    }
  };

  const displayText = getDisplayText();
  const hasValue = mode === 'single' ? !!selectedDate : !!selectedRange?.from;

  // Use iOS sheet on iOS PWA
  if (isIOSPWA()) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => setSheetOpen(true)}
          inputMode="none"
          className={cn(
            "w-full justify-start text-left font-normal touch-manipulation",
            !hasValue && "text-muted-foreground",
            triggerClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{displayText}</span>
        </Button>
        <IOSDatePickerSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          mode={mode}
          selectedRange={selectedRange}
          onRangeChange={onRangeChange}
          showQuickActions={showQuickActions}
          title={title}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    );
  }

  // Standard Popover/Calendar for non-iOS platforms
  const handleDateSelect = (date: Date | undefined) => {
    if (onDateChange) {
      onDateChange(date);
    }
    if (date) {
      setPopoverOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (onRangeChange) {
      onRangeChange(range);
    }
    // Close popover when both dates are selected
    if (range?.from && range?.to) {
      setPopoverOpen(false);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !hasValue && "text-muted-foreground",
            className,
            triggerClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {mode === 'single' ? (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            className={cn("p-3 pointer-events-auto")}
            initialFocus
          />
        ) : (
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            className={cn("p-3 pointer-events-auto")}
            numberOfMonths={1}
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
