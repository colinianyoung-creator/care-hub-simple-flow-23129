import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange?: (start: Date, end: Date) => void;
  showRangeMode?: boolean;
  className?: string;
}

export const DateRangePicker = ({
  selectedDate,
  onDateChange,
  startDate,
  endDate,
  onDateRangeChange,
  showRangeMode = false,
  className
}: DateRangePickerProps) => {
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(startDate);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(endDate);

  const goToPreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const handleQuickRange = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    switch (type) {
      case 'today':
        onDateChange(today);
        if (onDateRangeChange) {
          onDateRangeChange(today, today);
        }
        break;
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        setRangeStart(weekStart);
        setRangeEnd(weekEnd);
        if (onDateRangeChange) {
          onDateRangeChange(weekStart, weekEnd);
        }
        break;
      case 'month':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        setRangeStart(monthStart);
        setRangeEnd(monthEnd);
        if (onDateRangeChange) {
          onDateRangeChange(monthStart, monthEnd);
        }
        break;
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isRangeMode && onDateRangeChange) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(date);
        setRangeEnd(undefined);
      } else {
        // Complete range
        if (date < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(date);
          onDateRangeChange(date, rangeStart);
        } else {
          setRangeEnd(date);
          onDateRangeChange(rangeStart, date);
        }
      }
    } else {
      onDateChange(date);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" size="sm" onClick={goToPreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {isRangeMode && rangeStart && rangeEnd ? (
              <span className="text-sm">
                {format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')}
              </span>
            ) : (
              <span className="text-sm font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-3 border-b space-y-2">
            {showRangeMode && onDateRangeChange && (
              <div className="flex gap-2 mb-2">
                <Button
                  variant={isRangeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsRangeMode(!isRangeMode)}
                  className="text-xs"
                >
                  {isRangeMode ? 'Range Mode' : 'Single Day'}
                </Button>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => handleQuickRange('today')} className="text-xs">
                Today
              </Button>
              {showRangeMode && onDateRangeChange && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleQuickRange('week')} className="text-xs">
                    This Week
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleQuickRange('month')} className="text-xs">
                    This Month
                  </Button>
                </>
              )}
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" onClick={goToNextDay}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday && (
        <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
          Today
        </Button>
      )}
    </div>
  );
};
