import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Loader2, AlertCircle, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getShiftTypeColor, getShiftTypeLabel } from '@/lib/shiftUtils';
import { cn } from '@/lib/utils';

interface MonthCalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userRole: string;
  onShiftClick?: (shift: any) => void;
  carersMap?: Record<string, string>;
  careRecipientNameHint?: string;
  viewMode?: 'single-family' | 'all-families';
  allFamiliesShifts?: any[];
  currentUserId?: string;
  loadingAllFamilies?: boolean;
  selectedCarerId?: string | null;
}

export const MonthCalendarView = ({ isOpen, onClose, familyId, userRole, onShiftClick, carersMap, careRecipientNameHint, viewMode = 'single-family', allFamiliesShifts = [], currentUserId, loadingAllFamilies = false, selectedCarerId = null }: MonthCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [carers, setCarers] = useState<Record<string, string>>({});
  const [careRecipientName, setCareRecipientName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

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
  }, [isOpen, currentMonth, familyId, carersMap, careRecipientNameHint, userRole, viewMode, allFamiliesShifts, loadingAllFamilies]);
 
  const loadMonthShifts = async (abortController?: AbortController) => {
    setLoading(true);
    setError(null);
    
    const timeoutId = setTimeout(() => {
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
        setError('Request timed out after 10 seconds. Please try again.');
        setLoading(false);
      }
    }, 10000);
    
    try {
      if (abortController?.signal.aborted) return;
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // If in all-families mode, use pre-loaded data
      if (viewMode === 'all-families') {
        // If parent is still loading all-families data, show loading
        if (loadingAllFamilies) {
          console.log('⏳ [MonthCalendarView] Waiting for all-families data to load...');
          setLoading(true);
          clearTimeout(timeoutId);
          return;
        }
        
        console.log('📊 [MonthCalendarView] Processing all-families data:', allFamiliesShifts.length, 'shifts');
        const filteredShifts = allFamiliesShifts
          .filter(shift => {
            const shiftDate = new Date(shift.clock_in);
            return shiftDate >= monthStart && shiftDate <= monthEnd;
          })
          .map(entry => ({
            id: entry.id,
            scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
            start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
            end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : null,
            carer_id: entry.user_id,
            carer_name: entry.profiles?.full_name || 'Unknown',
            shift_type: entry.shift_type || 'basic',
            isLeaveRequest: false,
            family_id: entry.family_id,
            family_name: entry.families?.name || 'Unknown',
            care_recipient_name: entry.families?.name || 'Unknown'
          }));
        console.log('✅ [MonthCalendarView] Filtered to', filteredShifts.length, 'shifts for current month');
        setShifts(filteredShifts);
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }
      
      // Single-family mode
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      
      // Load time_entries (one-time shifts and clocked shifts)
      let timeQuery = supabase
        .from('time_entries')
        .select('*')
        .eq('family_id', familyId)
        .gte('clock_in', `${monthStartStr}T00:00:00`)
        .lte('clock_in', `${monthEndStr}T23:59:59`);

      if (userRole === 'carer' && viewMode === 'single-family' && currentUserId) {
        timeQuery = timeQuery.eq('user_id', currentUserId);
      }

      const { data: timeEntries, error: entriesError } = await timeQuery;
      if (entriesError) throw entriesError;

      // Load recurring shifts from shift_instances via RPC
      const { data: shiftInstancesData, error: instancesError } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: monthStartStr,
          _end_date: monthEndStr
        });
      
      if (instancesError) {
        console.warn('Error loading shift instances:', instancesError);
      }

      // Get unique carer IDs from both sources
      const timeEntryCarerIds = timeEntries?.map(entry => entry.user_id).filter(Boolean) || [];
      const instanceCarerIds = shiftInstancesData?.map((i: any) => i.carer_id).filter(Boolean) || [];
      const carerIds = [...new Set([...timeEntryCarerIds, ...instanceCarerIds])] as string[];
      
      // Get placeholder carer IDs
      const placeholderCarerIds = shiftInstancesData
        ?.map((i: any) => i.placeholder_carer_id)
        .filter(Boolean) || [];
      
      // Load carer profiles
      const newCarers: Record<string, string> = {};
      if (carerIds.length > 0) {
        const { data: carerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', carerIds);

        carerProfiles?.forEach(profile => {
          newCarers[profile.id] = profile.full_name || 'Unnamed Carer';
        });
      }
      
      // Load placeholder carer names
      if (placeholderCarerIds.length > 0) {
        const { data: placeholderCarers } = await supabase
          .from('placeholder_carers')
          .select('id, full_name')
          .in('id', [...new Set(placeholderCarerIds)]);

        placeholderCarers?.forEach(pc => {
          newCarers[`placeholder_${pc.id}`] = `${pc.full_name} (pending)`;
        });
      }
      
      setCarers(newCarers);

      // Transform time_entries to shift instances format
      const transformedShifts = timeEntries?.map(entry => ({
        id: entry.id,
        shift_assignment_id: entry.shift_instance_id,
        scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
        start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
        end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : '17:00:00',
        carer_id: entry.user_id,
        carer_name: newCarers[entry.user_id] || 'Unknown',
        status: 'scheduled',
        notes: entry.notes,
        family_id: entry.family_id,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        shift_type: (entry as any).shift_type || 'basic',
        is_leave_request: false,
        is_recurring: false
      })) || [];

      // Transform recurring shifts from shift_instances
      let recurringShifts = (shiftInstancesData || []).map((instance: any) => ({
        id: instance.id,
        shift_assignment_id: instance.shift_assignment_id,
        shift_instance_id: instance.id,
        scheduled_date: instance.scheduled_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        carer_id: instance.carer_id,
        carer_name: instance.carer_name || newCarers[instance.carer_id] || 'Unknown',
        status: instance.status || 'scheduled',
        notes: null,
        family_id: familyId,
        shift_type: instance.shift_type || 'basic',
        is_leave_request: false,
        is_recurring: true
      }));

      // For carers in single-family mode, filter recurring shifts to only show their own
      if (userRole === 'carer' && viewMode === 'single-family' && currentUserId) {
        recurringShifts = recurringShifts.filter((s: any) => s.carer_id === currentUserId);
      }

      // Filter out recurring shifts that already have time_entries (avoid duplicates)
      const existingDates = new Set(transformedShifts.map(s => `${s.carer_id}-${s.scheduled_date}`));
      const filteredRecurring = recurringShifts.filter((s: any) => 
        !existingDates.has(`${s.carer_id}-${s.scheduled_date}`)
      );

      // Get approved leave requests for the same period
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .gte('start_date', monthStartStr)
        .lte('end_date', monthEndStr);

      if (leaveError) throw leaveError;

      // Load carer profiles for leave requests
      const leaveCarerIds = leaveRequests?.map(leave => leave.user_id).filter(Boolean) || [];
      if (leaveCarerIds.length > 0) {
        const { data: leaveCarerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', leaveCarerIds);

        // Merge into carers map
        leaveCarerProfiles?.forEach(profile => {
          newCarers[profile.id] = profile.full_name || 'Unnamed Carer';
        });
      }

      // Convert leave requests to shift format for display
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

      // Fetch care recipient name for carers
      if (userRole === 'carer') {
        const { data: adminMembership } = await supabase
          .from('user_memberships')
          .select('profiles(full_name, care_recipient_name)')
          .eq('family_id', familyId)
          .in('role', ['family_admin', 'disabled_person'])
          .limit(1)
          .single();
        
        if (adminMembership?.profiles) {
          const profile = adminMembership.profiles as any;
          setCareRecipientName(profile.care_recipient_name || profile.full_name || 'Care Recipient');
        }
      }

      // Merge time_entries, recurring shifts, and leave requests
      const allShifts = [...transformedShifts, ...filteredRecurring, ...convertedLeaves];
      setShifts(allShifts);

      // If no shifts, clear error so we show empty state instead
      if (allShifts.length === 0) {
        setError(null);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || abortController?.signal.aborted) {
        console.log('Request was cancelled');
        setError('Request was cancelled');
        return;
      }
      console.error('Error loading month shifts:', error);
      setError(error.message || 'Failed to load calendar data');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
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
      
      // Apply carer filter
      if (selectedCarerId && shift.carer_id !== selectedCarerId) {
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
    // For carers, ALWAYS show care recipient name regardless of shift type
    if (userRole === 'carer') {
      return shift.care_recipient_name || careRecipientName || 'Care Recipient';
    }

    // Helper to get carer name (including placeholder carers)
    const getCarerDisplayName = () => {
      if (shift.carer_name) return shift.carer_name;
      if (shift.carer_id && carers[shift.carer_id]) return carers[shift.carer_id];
      if (shift.placeholder_carer_id) {
        const placeholderKey = `placeholder_${shift.placeholder_carer_id}`;
        if (carers[placeholderKey]) return carers[placeholderKey];
        return shift.placeholder_carer_name ? `${shift.placeholder_carer_name} (pending)` : 'Pending Carer';
      }
      return 'Unassigned';
    };

    // For admins, show type label + carer name for leave types
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
      return `${label} - ${getCarerDisplayName()}`;
    }
    
    // For admins with basic/cover shifts, show carer name
    return getCarerDisplayName();
  };

  // Removed - now using shared utility from src/lib/shiftUtils.ts

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const canAddShift = () => {
    return userRole === 'family_admin' || userRole === 'disabled_person';
  };

  const handleDayCellClick = (day: Date) => {
    if (!canAddShift()) return;
    
    // Dispatch event to open create shift modal with pre-filled date
    const event = new CustomEvent('schedule-add-shift', {
      detail: { date: format(day, 'yyyy-MM-dd') }
    });
    window.dispatchEvent(event);
    
    // Close the month view modal
    onClose();
  };

  return (
    <>
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
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading shifts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-sm text-destructive font-medium mb-1">Failed to load calendar</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => loadMonthShifts()} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No shifts scheduled this month</div>
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
              const isEmpty = dayShifts.length === 0;
              const isClickable = isEmpty && canAddShift() && isCurrentMonth;
              
              return (
                <div 
                  key={index} 
                  className={cn(
                    "relative overflow-hidden min-h-20 sm:min-h-32 md:min-h-40 p-1 sm:p-2 border border-border group",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isToday && "bg-primary/10 border-primary",
                    isClickable && "cursor-pointer hover:bg-primary/5 transition-colors"
                  )}
                  onClick={() => isClickable && handleDayCellClick(day)}
                >
                  <div className="font-medium text-xs sm:text-sm mb-1 sm:mb-2">
                    {format(day, 'd')}
                  </div>
                  {isClickable && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayShifts.slice(0, window.innerWidth < 640 ? 1 : 3).map((shift, shiftIndex) => (
                      <Badge 
                        key={shiftIndex} 
                        variant="secondary" 
                        className={`text-xs w-full justify-start cursor-pointer hover:opacity-80 min-h-[24px] sm:min-h-[32px] md:min-h-[40px] p-1 sm:p-2 ${
                          getShiftTypeColor(shift.shift_type, shift.is_leave_request)
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
                                <span className="text-[10px] font-medium leading-tight hidden sm:block opacity-80">
                                  {getShiftTypeLabel(shift.shift_type || 'basic')}
                                </span>
                                <span className="text-xs opacity-90 leading-tight truncate">
                                  {getShiftDisplayName(shift)}
                                </span>
                              </div>
                      </Badge>
                    ))}
                    {dayShifts.length > (window.innerWidth < 640 ? 1 : 3) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground w-full h-auto py-1 px-2 hover:bg-primary/10"
                        onClick={() => setExpandedDay(day)}
                      >
                        <span className="sm:hidden">{dayShifts.length}+</span>
                        <span className="hidden sm:inline">View all {dayShifts.length} shifts</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Expanded Day Dialog */}
    {expandedDay && (
      <Dialog open={!!expandedDay} onOpenChange={() => setExpandedDay(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Shifts for {format(expandedDay, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {getShiftsForDay(expandedDay).map((shift, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-sm w-full justify-start cursor-pointer hover:opacity-80 p-3 ${
                  getShiftTypeColor(shift.shift_type, shift.is_leave_request)
                }`}
                onClick={() => {
                  onShiftClick?.(shift);
                  setExpandedDay(null);
                }}
              >
                <div className="flex flex-col w-full gap-1">
                  <span className="text-sm font-medium">
                    {shift.start_time && shift.end_time 
                      ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`
                      : 'All day'
                    }
                  </span>
                  <span className="text-sm opacity-90">
                    {getShiftDisplayName(shift)}
                  </span>
                  {shift.notes && (
                    <span className="text-xs opacity-75 mt-1">
                      {shift.notes}
                    </span>
                  )}
                </div>
              </Badge>
            ))}
          </div>
          <Button onClick={() => setExpandedDay(null)} className="w-full">
            Back to Month View
          </Button>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
};