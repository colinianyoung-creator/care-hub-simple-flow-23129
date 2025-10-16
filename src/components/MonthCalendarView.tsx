import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface MonthCalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userRole: string;
  onShiftClick?: (shift: any) => void;
  carersMap?: Record<string, string>;
  careRecipientNameHint?: string;
}

export const MonthCalendarView = ({ isOpen, onClose, familyId, userRole, onShiftClick, carersMap, careRecipientNameHint }: MonthCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [carers, setCarers] = useState<Record<string, string>>({});
  const [careRecipientName, setCareRecipientName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync carers from parent if provided
    if (carersMap && Object.keys(carersMap).length > 0) {
      setCarers(carersMap);
    }
    
    // For carers, set the care recipient name from hint
    if (userRole === 'carer' && careRecipientNameHint) {
      setCareRecipientName(careRecipientNameHint);
    }

    // Load shifts when modal opens or month/family changes
    if (isOpen) {
      const abortController = new AbortController();
      loadMonthShifts(abortController);
      
      return () => {
        abortController.abort();
      };
    }
  }, [isOpen, currentMonth, familyId, carersMap, careRecipientNameHint, userRole]);
 
  const loadMonthShifts = async (abortController?: AbortController) => {
    setLoading(true);
    setError(null);
    
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
        setError('Request timed out. Please try again.');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    try {
      if (abortController?.signal.aborted) return;
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Use the new secure RPC to get shift instances with names
      const { data: monthShiftsWithNames, error } = await supabase.rpc(
        'get_shift_instances_with_names',
        {
          _family_id: familyId,
          _start_date: format(monthStart, 'yyyy-MM-dd'),
          _end_date: format(monthEnd, 'yyyy-MM-dd')
        }
      );

      if (error) throw error;

      // Get approved leave requests for the same period
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      if (leaveError) throw leaveError;

      // Extract carer names from shift instances first
      const newCarers: Record<string, string> = {};
      monthShiftsWithNames?.forEach(shift => {
        if (shift.carer_id && shift.carer_name) {
          newCarers[shift.carer_id] = shift.carer_name;
        }
      });
      setCarers(newCarers);

      // Convert leave requests to shift format for display (after we have carer names)
      const convertedLeaves = (leaveRequests || []).map(leave => ({
        id: leave.id,
        shift_assignment_id: null,
        family_id: leave.family_id,
        scheduled_date: leave.start_date,
        start_time: null,
        end_time: null,
        status: 'approved',
        carer_id: leave.user_id,
        carer_name: newCarers[leave.user_id] || 'Carer',
        notes: leave.reason,
        created_at: leave.created_at,
        updated_at: leave.updated_at,
        shift_type: 'leave',
        is_leave_request: true
      }));

      // Merge shifts and leave requests
      const allShifts = [...(monthShiftsWithNames || []), ...convertedLeaves];
      setShifts(allShifts);

      // Set care recipient name from the RPC result
      if (monthShiftsWithNames?.[0]?.care_recipient_name && !careRecipientName) {
        setCareRecipientName(monthShiftsWithNames[0].care_recipient_name);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || abortController?.signal.aborted) {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error loading month shifts:', error);
      setError(error.message || 'Failed to load calendar data');
    } finally {
      clearTimeout(timeoutId);
      if (!abortController?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getShiftsForDay = (day: Date) => {
    const dayShifts = shifts.filter(shift => {
      const isCorrectDay = isSameDay(parseISO(shift.scheduled_date), day);
      
      // Filter out denied leave requests
      if (shift.is_leave_request && shift.status === 'denied') {
        return false;
      }
      
      return isCorrectDay;
    });

    // Apply override logic: if a carer has approved leave, remove their basic shifts
    const approvedLeaves = dayShifts.filter(shift => shift.is_leave_request && shift.status === 'approved');
    const basicShifts = dayShifts.filter(shift => !shift.is_leave_request);
    
    // Remove basic shifts for carers who have approved leave on this day
    const filteredBasicShifts = basicShifts.filter(basicShift => {
      return !approvedLeaves.some(leave => leave.carer_id === basicShift.carer_id);
    });
    
    return [...approvedLeaves, ...filteredBasicShifts];
  };

  const getShiftDisplayName = (shift: any) => {
    if (shift.is_leave_request) {
      const typeLabels: { [key: string]: string } = {
        'holiday': 'Holiday',
        'annual_leave': 'Holiday',
        'sickness': 'Sickness',
        'sick_leave': 'Sickness',
        'public_holiday': 'Public Holiday',
        'cover': 'Cover'
      };
      const label = typeLabels[shift.shift_type] || 'Leave';
      return `${label} - ${shift.carer_name || 'Carer'}`;
    }
    
    if (userRole === 'carer') {
      // Carers see the care recipient's name (from RPC or hint)
      const recipientName = shift.care_recipient_name || careRecipientName || 'Care Recipient';
      return recipientName;
    } else {
      // Admins/family_viewers see carer's name
      const carerName = shift.carer_name || carers[shift.carer_id] || 'Unassigned';
      return carerName;
    }
  };

  const getShiftTypeColor = (shiftType: string, isLeaveRequest?: boolean) => {
    if (isLeaveRequest) {
      switch (shiftType) {
        case 'holiday':
        case 'annual_leave':
          return 'bg-yellow-100 text-yellow-800';
        case 'sickness':
        case 'sick_leave':
          return 'bg-red-100 text-red-800';
        case 'public_holiday':
          return 'bg-purple-100 text-purple-800';
        case 'cover':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
    
    return 'bg-blue-100 text-blue-800'; // Basic shifts
  };

  const getCarerColor = (carerId: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const index = carerId ? carerId.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="text-base sm:text-lg">Month View - {format(currentMonth, 'MMMM yyyy')}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-destructive">{error}</div>
            <Button onClick={() => loadMonthShifts()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-1 sm:p-2 font-medium text-center text-xs sm:text-sm bg-muted">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => {
              const dayShifts = getShiftsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={index} 
                  className={`min-h-20 sm:min-h-32 md:min-h-40 p-1 sm:p-2 border border-border ${
                    !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
                  } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
                >
                  <div className="font-medium text-xs sm:text-sm mb-1 sm:mb-2">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayShifts.slice(0, window.innerWidth < 640 ? 1 : 3).map((shift, shiftIndex) => (
                      <Badge 
                        key={shiftIndex} 
                        variant="secondary" 
                        className={`text-xs w-full justify-start cursor-pointer hover:opacity-80 min-h-[24px] sm:min-h-[32px] md:min-h-[40px] p-1 sm:p-2 ${
                          shift.is_leave_request 
                            ? getShiftTypeColor(shift.shift_type, true)
                            : `text-white ${getCarerColor(shift.carer_id)}`
                        }`}
                        onClick={() => onShiftClick?.(shift)}
                      >
                        <div className="flex flex-col w-full gap-0.5 sm:gap-1">
                          <span className="text-xs font-medium leading-tight hidden sm:block">
                            {shift.start_time && shift.end_time 
                              ? `${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`
                              : 'All day'
                            }
                          </span>
                          <span className="text-xs opacity-90 leading-tight truncate">
                            {getShiftDisplayName(shift)}
                          </span>
                        </div>
                      </Badge>
                    ))}
                    {dayShifts.length > (window.innerWidth < 640 ? 1 : 3) && (
                      <div className="text-xs text-muted-foreground">
                        +{dayShifts.length - (window.innerWidth < 640 ? 1 : 3)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};