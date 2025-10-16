import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { formatShiftType } from "@/lib/textUtils";

interface MobileDayViewProps {
  familyId: string;
  userRole: string;
  careRecipientNameHint?: string;
  carersMap?: Record<string, string>;
  onToggleListView: () => void;
  showListView: boolean;
}

export const MobileDayView = ({
  familyId,
  userRole,
  careRecipientNameHint,
  carersMap,
  onToggleListView,
  showListView
}: MobileDayViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayShifts, setDayShifts] = useState<any[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (showListView) {
      loadUpcomingShifts();
    } else {
      loadDayShifts();
    }
  }, [currentDate, familyId, showListView]);

  useEffect(() => {
    const handleToggleListView = () => {
      onToggleListView();
    };

    window.addEventListener('mobile-toggle-list-view', handleToggleListView);
    return () => {
      window.removeEventListener('mobile-toggle-list-view', handleToggleListView);
    };
  }, [onToggleListView]);

  const loadDayShifts = async () => {
    try {
      setLoading(true);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Load shift instances
      const { data: shiftData, error: shiftError } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: dateStr,
          _end_date: dateStr
        });

      if (shiftError) throw shiftError;
      
      // Load approved leave requests for this day
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr);

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

      setDayShifts([...filteredShifts, ...leaveShifts]);
    } catch (error) {
      console.error('Error loading day shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingShifts = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      
      // Load shift instances
      const { data: shiftData, error: shiftError } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: today,
          _end_date: nextWeek
        });

      if (shiftError) throw shiftError;

      // Load approved leave requests for the period
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .lte('start_date', nextWeek)
        .gte('end_date', today);

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
    } catch (error) {
      console.error('Error loading upcoming shifts:', error);
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

  const getShiftTypeColor = (shift: any) => {
    if (shift.is_leave_request || shift.shift_type) {
      switch (shift.shift_type || shift.type) {
        case 'annual_leave':
          return 'bg-yellow-500 text-white font-bold';
        case 'sickness':
          return 'bg-red-500 text-white font-bold';
        case 'public_holiday':
          return 'bg-purple-500 text-white font-bold';
        case 'cover':
          return 'bg-green-500 text-white font-bold';
        default:
          return 'bg-blue-500 text-white font-bold';
      }
    }
    // Basic shifts
    return 'bg-blue-500 text-white font-bold';
  };

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
          <div className="text-center py-8 text-muted-foreground">
            No shifts scheduled for this day
          </div>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((shift) => (
              <div key={shift.id} className="flex flex-col gap-2">
                <Badge 
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
                {shift.notes && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded ml-1">
                    {shift.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};