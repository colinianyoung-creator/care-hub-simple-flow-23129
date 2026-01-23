import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface IOSDatePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  // Range mode props
  mode?: 'single' | 'range';
  selectedRange?: DateRange;
  onRangeChange?: (range: DateRange | undefined) => void;
  // Quick actions
  showQuickActions?: boolean;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const IOSDatePickerSheet: React.FC<IOSDatePickerSheetProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onDateChange,
  mode = 'single',
  selectedRange,
  onRangeChange,
  showQuickActions = true,
  title,
  minDate,
  maxDate,
}) => {
  const { t } = useTranslation();
  const [internalDate, setInternalDate] = useState<Date | undefined>(selectedDate);
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(selectedRange);

  const handleConfirm = () => {
    if (mode === 'single' && onDateChange) {
      onDateChange(internalDate);
    } else if (mode === 'range' && onRangeChange) {
      onRangeChange(internalRange);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setInternalDate(selectedDate);
    setInternalRange(selectedRange);
    onOpenChange(false);
  };

  const handleQuickSelect = (type: 'today' | 'thisWeek' | 'thisMonth') => {
    const today = new Date();
    
    if (mode === 'single') {
      setInternalDate(today);
      if (onDateChange) {
        onDateChange(today);
      }
    } else {
      let range: DateRange;
      switch (type) {
        case 'today':
          range = { from: today, to: today };
          break;
        case 'thisWeek':
          range = { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
          break;
        case 'thisMonth':
          range = { from: startOfMonth(today), to: endOfMonth(today) };
          break;
      }
      setInternalRange(range);
      if (onRangeChange) {
        onRangeChange(range);
      }
    }
    onOpenChange(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setInternalDate(date);
    // For single mode, close immediately after selection
    if (mode === 'single' && date && onDateChange) {
      onDateChange(date);
      onOpenChange(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setInternalRange(range);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[90vh] rounded-t-xl p-0 flex flex-col"
      >
        {/* Fixed header with Cancel/Done buttons */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground font-medium touch-manipulation min-h-[44px]"
            >
              {t('common.cancel')}
            </Button>
            <SheetTitle className="text-base font-semibold">
              {title || (mode === 'range' ? t('datePicker.selectDateRange') : t('datePicker.selectDate'))}
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleConfirm}
              className="text-primary font-medium touch-manipulation min-h-[44px]"
            >
              {t('common.done')}
            </Button>
          </div>
        </SheetHeader>

        {/* Quick actions */}
        {showQuickActions && (
          <div className="flex-shrink-0 px-4 py-3 border-b flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('today')}
              className="flex-1 touch-manipulation min-h-[44px]"
            >
              {t('datePicker.today')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('thisWeek')}
              className="flex-1 touch-manipulation min-h-[44px]"
            >
              {t('datePicker.thisWeek')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('thisMonth')}
              className="flex-1 touch-manipulation min-h-[44px]"
            >
              {t('datePicker.thisMonth')}
            </Button>
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          {mode === 'single' ? (
            <Calendar
              mode="single"
              selected={internalDate}
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
              selected={internalRange}
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
