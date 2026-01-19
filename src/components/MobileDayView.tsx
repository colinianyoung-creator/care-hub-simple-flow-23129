import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, RotateCcw } from 'lucide-react';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { formatShiftType } from "@/lib/textUtils";
import { getShiftTypeColor, getShiftTypeLabel } from '@/lib/shiftUtils';
import { cn } from '@/lib/utils';
import { useIsMobile } from "@/hooks/use-mobile";
interface MobileDayViewProps {
  familyId: string;
  userRole: string;
  careRecipientNameHint?: string;
  carersMap?: Record<string, string>;
  viewMode?: 'single-family' | 'all-families';
  allFamiliesShifts?: any[];
  refreshTrigger?: number;
}

export const MobileDayView = ({
  familyId,
  userRole,
  careRecipientNameHint,
  carersMap,
  viewMode = 'single-family',
  allFamiliesShifts = [],
  refreshTrigger = 0
}: MobileDayViewProps) => {
  // IMPORTANT: All hooks must be called before any conditional returns
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayShifts, setDayShifts] = useState<any[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use stable reference for allFamiliesShifts to prevent infinite re-renders
  const allFamiliesShiftsLength = allFamiliesShifts.length;

  useEffect(() => {
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const loadData = async () => {
      try {
        timeoutId = setTimeout(() => {
          if (isMounted) {
            abortController.abort();
            setLoading(false);
            console.warn("⏱️ [MobileDayView] load timeout after 5s");
          }
        }, 5000);

        await loadDayShifts(abortController.signal);
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Unexpected error:', error);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentDate, familyId, viewMode, allFamiliesShiftsLength, refreshTrigger]);

  const loadDayShifts = async (signal?: AbortSignal) => {
    try {
      // Only show loading if we don't have data yet to prevent flashing
      if (dayShifts.length === 0) {
        setLoading(true);
      }
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // If in all-families mode, use the pre-loaded cross-family data
      if (viewMode === 'all-families') {
        const filteredShifts = allFamiliesShifts
          .filter(shift => {
            const shiftDateStr = format(new Date(shift.clock_in), 'yyyy-MM-dd');
            return shiftDateStr === dateStr;
          })
          .map(entry => ({
            id: entry.id,
            scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
            start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
            end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : format(new Date(entry.clock_in), 'HH:mm:ss'),
            carer_id: entry.user_id,
            carer_name: entry.profiles?.full_name || 'Unknown',
            status: 'completed',
            notes: entry.notes,
            shift_type: entry.shift_type || 'basic',
            family_id: entry.family_id,
            family_name: entry.families?.name || 'Unknown'
          }));

        setDayShifts(filteredShifts);
        setLoading(false);
        return;
      }
      
      // Single-family mode: Load time_entries (actual shifts) for this day
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles!time_entries_user_id_fkey (
            id,
            full_name
          )
        `)
        .eq('family_id', familyId)
        .gte('clock_in', `${dateStr}T00:00:00`)
        .lt('clock_in', `${dateStr}T23:59:59`)
        .order('clock_in', { ascending: true })
        .abortSignal(signal);

      if (timeError) throw timeError;
      
      // Transform time_entries to shift format
      const shiftData = timeEntries?.map(entry => ({
        id: entry.id,
        scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
        start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
        end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : format(new Date(entry.clock_in), 'HH:mm:ss'),
        carer_id: entry.user_id,
        carer_name: entry.profiles?.full_name || 'Unknown',
        status: 'completed',
        notes: entry.notes,
        shift_type: entry.shift_type || 'basic'
      })) || [];

      // Load recurring shift instances for this day via RPC
      const { data: shiftInstancesData, error: instancesError } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: dateStr,
          _end_date: dateStr
        });

      if (instancesError) {
        console.warn('Error loading shift instances:', instancesError);
      }

      // Transform recurring shifts to shift format
      const recurringShifts = (shiftInstancesData || []).map((instance: any) => ({
        id: instance.id,
        shift_assignment_id: instance.shift_assignment_id,
        shift_instance_id: instance.id,
        scheduled_date: instance.scheduled_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        carer_id: instance.carer_id,
        placeholder_carer_id: instance.placeholder_carer_id,
        carer_name: instance.carer_name || 'Unknown',
        placeholder_carer_name: instance.placeholder_carer_name,
        status: instance.status || 'scheduled',
        notes: null,
        shift_type: instance.shift_type || 'basic',
        is_recurring: true
      }));

      // Filter out recurring shifts that already have time_entries (avoid duplicates)
      const existingDates = new Set(shiftData.map(s => `${s.carer_id}-${s.scheduled_date}`));
      const filteredRecurring = recurringShifts.filter((s: any) => 
        !existingDates.has(`${s.carer_id}-${s.scheduled_date}`)
      );

      // Merge time_entries with recurring shifts
      const allShifts = [...shiftData, ...filteredRecurring];
      
      // Load approved leave requests for this day
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .abortSignal(signal);

      if (leaveError) throw leaveError;

      // Load carer profiles for leave requests
      const carerIds = leaveData?.map(leave => leave.user_id).filter(Boolean) || [];
      let carerProfiles: any[] = [];
      if (carerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_secure')
          .select('id, full_name')
          .in('id', carerIds);
        carerProfiles = profiles || [];
      }

      // Convert leave requests to shift-like objects
      const leaveShifts = leaveData?.map(leave => ({
        ...leave,
        id: `leave-${leave.id}`,
        scheduled_date: leave.start_date,
        start_time: '09:00:00',
        end_time: '17:00:00',
        carer_name: carerProfiles.find(p => p.id === leave.user_id)?.full_name || 'Unknown',
        carer_id: leave.user_id,
        status: 'approved',
        shift_type: (leave as any).shift_type || 'annual_leave',
        is_leave_request: true,
      })) || [];

      // Apply override logic: remove basic shifts for carers with approved leave
      const carersWithLeave = new Set(leaveShifts.map(leave => leave.carer_id));
      const filteredShifts = allShifts?.filter(shift => !carersWithLeave.has(shift.carer_id)) || [];

      setDayShifts([...filteredShifts, ...leaveShifts]);
      console.log(`📱 Day View: Loaded ${filteredShifts.length + leaveShifts.length} shifts for ${dateStr}`);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error loading day shifts:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingShifts = async (signal?: AbortSignal) => {
    try {
      // Only show loading if we don't have data yet to prevent flashing
      if (upcomingShifts.length === 0) {
        setLoading(true);
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      
      // Load time_entries (actual shifts) for the period
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles!time_entries_user_id_fkey (
            id,
            full_name
          )
        `)
        .eq('family_id', familyId)
        .gte('clock_in', `${today}T00:00:00`)
        .lt('clock_in', `${nextWeek}T23:59:59`)
        .order('clock_in', { ascending: true })
        .abortSignal(signal);

      if (timeError) throw timeError;

      // Transform time_entries to shift format
      const shiftData = timeEntries?.map(entry => ({
        id: entry.id,
        scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
        start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
        end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : format(new Date(entry.clock_in), 'HH:mm:ss'),
        carer_id: entry.user_id,
        carer_name: entry.profiles?.full_name || 'Unknown',
        status: 'completed',
        notes: entry.notes,
        shift_type: entry.shift_type || 'basic'
      })) || [];

      // Load approved leave requests for the period
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .lte('start_date', nextWeek)
        .gte('end_date', today)
        .abortSignal(signal);

      if (leaveError) throw leaveError;

      // Load carer profiles for leave requests
      const carerIds = leaveData?.map(leave => leave.user_id).filter(Boolean) || [];
      let carerProfiles: any[] = [];
      if (carerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_secure')
          .select('id, full_name')
          .in('id', carerIds);
        carerProfiles = profiles || [];
      }

      // Convert leave requests to shift-like objects
      const leaveShifts = leaveData?.map(leave => ({
        ...leave,
        id: `leave-${leave.id}`,
        scheduled_date: leave.start_date,
        start_time: '09:00:00',
        end_time: '17:00:00',
        carer_name: carerProfiles.find(p => p.id === leave.user_id)?.full_name || 'Unknown',
        carer_id: leave.user_id,
        status: 'approved',
        shift_type: 'leave',
        is_leave_request: true,
      })) || [];

      // Apply override logic: remove basic shifts for carers with approved leave
      const carersWithLeave = new Set(leaveShifts.map(leave => leave.carer_id));
      const filteredShifts = shiftData?.filter(shift => !carersWithLeave.has(shift.carer_id)) || [];

      setUpcomingShifts([...filteredShifts, ...leaveShifts]);
      console.log(`📱 List View: Loaded ${filteredShifts.length + leaveShifts.length} upcoming shifts`);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error loading upcoming shifts:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (shift: any) => {
    if (userRole === 'carer') {
      return shift.care_recipient_name || careRecipientNameHint || 'Care Recipient';
    } else {
      // Check for placeholder carer
      if (shift.placeholder_carer_id) {
        const placeholderKey = `placeholder_${shift.placeholder_carer_id}`;
        if (carersMap?.[placeholderKey]) return carersMap[placeholderKey];
        return shift.placeholder_carer_name || 'Pending Carer';
      }
      return shift.carer_name || carersMap?.[shift.carer_id] || 'Unassigned';
    }
  };

  const getBadgeContent = (shift: any) => {
    const type = shift.shift_type || shift.type || 'basic';
    
    // For basic shifts, just show the display name without a type prefix
    if (type === 'basic' && !shift.is_leave_request) {
      return getDisplayName(shift);
    }
    
    // For non-basic shifts and leave requests, show type label
    const typeLabels: { [key: string]: string } = {
      'holiday': 'Holiday',
      'annual_leave': 'Holiday',
      'sickness': 'Sickness',
      'sick_leave': 'Sickness',
      'public_holiday': 'Public Holiday',
      'cover': 'Cover',
      'training': 'Training',
      'other': 'Other'
    };
    
    const label = typeLabels[type] || formatShiftType(type);
    return `${label} - ${getDisplayName(shift)}`;
  };

  // Removed - now using shared utility from src/lib/shiftUtils.ts

  const canEditShift = (shift: any) => {
    const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
    const isCarer = userRole === 'carer';
    
    if (isAdmin) return true;
    if (isCarer && shift.carer_id) return true; // Allow carers to edit their own shifts regardless of status
    return false;
  };

  const handleShiftClick = (shift: any) => {
    // Check permissions first
    if (!canEditShift(shift)) {
      return; // No action for viewers or unauthorized users
    }

    // Dispatch custom event to parent with shift data
    const editEvent = new CustomEvent('schedule-edit-shift', {
      detail: { shift, source: 'mobile-day-view' }
    });
    window.dispatchEvent(editEvent);
  };

  const previousDay = () => setCurrentDate(prev => subDays(prev, 1));
  const nextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const today = () => setCurrentDate(new Date());

  const canAddShift = () => {
    return userRole === 'family_admin' || userRole === 'disabled_person';
  };

  const handleAddShiftClick = () => {
    if (!canAddShift()) return;
    
    // Dispatch event to open create shift modal with pre-filled date
    const event = new CustomEvent('schedule-add-shift', {
      detail: { date: format(currentDate, 'yyyy-MM-dd') }
    });
    window.dispatchEvent(event);
  };


  // isMobile is now declared at the top of the component (before early returns)
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousDay}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(
                "justify-center gap-1 sm:gap-2",
                isMobile ? "min-w-[100px] px-2" : "min-w-[180px]"
              )}>
                <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">
                  {format(currentDate, isMobile ? 'MMM d' : 'EEE, MMM d')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <div className="p-3 border-b">
                <Button variant="ghost" size="sm" onClick={today} className="text-xs">
                  Today
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="icon"
            onClick={nextDay}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {!isToday && (
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={today}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : dayShifts.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-sm text-muted-foreground">
              No shifts scheduled for this day
            </div>
            {canAddShift() && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddShiftClick}
                className="gap-2 min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {dayShifts.map((shift) => (
              <Badge 
                key={shift.id}
                className={`${getShiftTypeColor(shift.shift_type, shift.is_leave_request)} text-xs cursor-pointer p-2 h-auto justify-start hover:opacity-80 transition-opacity w-full overflow-hidden`}
                onClick={() => handleShiftClick(shift)}
              >
                <div className="flex flex-col gap-0.5 w-full min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium text-xs truncate">
                      {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium truncate">{getShiftTypeLabel(shift.shift_type || 'basic')}</span>
                  <span className="text-[10px] opacity-90 truncate">{getDisplayName(shift)}</span>
                </div>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};