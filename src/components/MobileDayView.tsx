import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { formatShiftType } from "@/lib/textUtils";
import { getShiftTypeColor, getShiftTypeLabel } from '@/lib/shiftUtils';
import { cn } from '@/lib/utils';

interface MobileDayViewProps {
  familyId: string;
  userRole: string;
  careRecipientNameHint?: string;
  carersMap?: Record<string, string>;
  onToggleListView: () => void;
  showListView: boolean;
  viewMode?: 'single-family' | 'all-families';
  allFamiliesShifts?: any[];
  refreshTrigger?: number;
}

export const MobileDayView = ({
  familyId,
  userRole,
  careRecipientNameHint,
  carersMap,
  onToggleListView,
  showListView,
  viewMode = 'single-family',
  allFamiliesShifts = [],
  refreshTrigger = 0
}: MobileDayViewProps) => {
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

        if (showListView) {
          await loadUpcomingShifts(abortController.signal);
        } else {
          await loadDayShifts(abortController.signal);
        }
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
  }, [currentDate, familyId, showListView, viewMode, allFamiliesShiftsLength, refreshTrigger]);

  useEffect(() => {
    const handleToggleListView = () => {
      onToggleListView();
    };

    window.addEventListener('mobile-toggle-list-view', handleToggleListView);
    return () => {
      window.removeEventListener('mobile-toggle-list-view', handleToggleListView);
    };
  }, [onToggleListView]);

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
        shift_type: 'basic'
      })) || [];
      
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
          .from('profiles')
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
      const filteredShifts = shiftData?.filter(shift => !carersWithLeave.has(shift.carer_id)) || [];

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
        shift_type: 'basic'
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
          .from('profiles')
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
      return shift.carer_name || carersMap?.[shift.carer_id] || 'Unassigned';
    }
  };

  const getBadgeContent = (shift: any) => {
    if (shift.is_leave_request || shift.shift_type) {
      const typeLabels: { [key: string]: string } = {
        'holiday': 'Holiday',
        'annual_leave': 'Holiday',
        'sickness': 'Sickness',
        'sick_leave': 'Sickness',
        'public_holiday': 'Public Holiday',
        'cover': 'Cover'
      };
      const type = shift.shift_type || shift.type;
      const label = typeLabels[type] || 'Leave';
      return `${label} - ${getDisplayName(shift)}`;
    }
    return getDisplayName(shift);
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

  if (showListView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : upcomingShifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming shifts scheduled
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const groupedShifts = upcomingShifts.reduce((acc, shift) => {
                  const dateKey = shift.scheduled_date;
                  if (!acc[dateKey]) {
                    acc[dateKey] = [];
                  }
                  acc[dateKey].push(shift);
                  return acc;
                }, {} as Record<string, any[]>);

                return Object.entries(groupedShifts).map(([date, shifts]: [string, any[]]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                      {format(new Date(date), 'EEE, MMM d')}
                    </h4>
                    <div className="space-y-2">
                      {shifts.map((shift) => (
                        <Badge 
                          key={shift.id}
                          className={`${getShiftTypeColor(shift)} text-xs cursor-pointer p-3 h-auto justify-start hover:opacity-80 transition-opacity w-full overflow-hidden`}
                          onClick={() => handleShiftClick(shift)}
                        >
                          <div className="flex flex-col gap-1 w-full min-w-0">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="font-medium text-xs md:text-sm truncate">
                                {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                              </span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-xs md:text-sm truncate">{formatShiftType(shift.shift_type || shift.type || 'basic')}</span>
                              <span className="text-[10px] md:text-xs opacity-90 truncate">{getDisplayName(shift)}</span>
                            </div>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <CardTitle className="text-lg">
              {format(currentDate, 'EEE, MMM d')}
            </CardTitle>
            {format(currentDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={today}
                className="text-xs text-muted-foreground p-0 h-auto"
              >
                Today
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : dayShifts.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-muted-foreground">
              No shifts scheduled for this day
            </div>
            {canAddShift() && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddShiftClick}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((shift) => (
              <Badge 
                key={shift.id}
                className={`${getShiftTypeColor(shift.shift_type, shift.is_leave_request)} text-xs cursor-pointer p-3 h-auto justify-start hover:opacity-80 transition-opacity w-full overflow-hidden`}
                onClick={() => handleShiftClick(shift)}
              >
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium text-xs md:text-sm truncate">
                      {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                    </span>
                  </div>
                  <span className="text-xs md:text-sm truncate">{getBadgeContent(shift)}</span>
                </div>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};