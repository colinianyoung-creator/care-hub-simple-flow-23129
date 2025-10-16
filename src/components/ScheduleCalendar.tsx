import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Edit, Trash2, Calendar, List } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "./dialogs/ConfirmationDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { MobileDayView } from "./MobileDayView";
import { DayShiftsModal } from "./dialogs/DayShiftsModal";
import { formatShiftType } from "@/lib/textUtils";

interface ScheduleCalendarProps {
  familyId: string;
  userRole: string;
  careRecipientNameHint?: string;
  assignments: any[];
  instances: any[];
  onRefresh: () => void;
  onEditShift?: (shift: any) => void;
  onDeleteShift?: (shiftId: string) => void;
  carersMap?: Record<string, string>;
  showListView?: boolean;
  onToggleListView?: () => void;
}

export const ScheduleCalendar = ({ 
  familyId, 
  userRole, 
  careRecipientNameHint,
  assignments, 
  instances, 
  onRefresh,
  onEditShift,
  onDeleteShift,
  carersMap,
  showListView = false,
  onToggleListView
}: ScheduleCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [carers, setCarers] = useState<Record<string, string>>({});
  const [weekInstances, setWeekInstances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [careRecipientName, setCareRecipientName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [selectedDayShifts, setSelectedDayShifts] = useState<{date: Date, shifts: any[]} | null>(null);
  const [current3DayWindow, setCurrent3DayWindow] = useState(0); // For portrait tablet 3-day view
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isTablet, isTabletLandscape, isTabletPortrait } = useIsTablet();
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

// Sync carers from parent if provided
useEffect(() => {
  if (carersMap && Object.keys(carersMap).length > 0) {
    setCarers(carersMap);
  }
}, [carersMap]);

// For carers, prefer the provided name hint to avoid RLS fetch issues
useEffect(() => {
  if (userRole === 'carer' && careRecipientNameHint) {
    setCareRecipientName(careRecipientNameHint);
  }
}, [userRole, careRecipientNameHint]);
 
// Load data for the calendar
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        // Use the new secure RPC to get shift instances with names
        const { data: weekInstancesWithNames, error: instanceError } = await supabase.rpc(
          'get_shift_instances_with_names',
          {
            _family_id: familyId,
            _start_date: format(weekStart, 'yyyy-MM-dd'),
            _end_date: format(weekEnd, 'yyyy-MM-dd')
          }
        );

        if (instanceError) throw instanceError;
        setWeekInstances(weekInstancesWithNames || []);

        // Extract carer names from the RPC result
        const newCarers: Record<string, string> = {};
        weekInstancesWithNames?.forEach(instance => {
          if (instance.carer_id && instance.carer_name) {
            newCarers[instance.carer_id] = instance.carer_name;
          }
        });
        setCarers(newCarers);

        // Care recipient name removed from schema

        // Load approved leave requests for this week
        const { data: leaveData, error: leaveError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('family_id', familyId)
          .eq('status', 'approved')
          .gte('date', format(weekStart, 'yyyy-MM-dd'))
          .lte('date', format(weekEnd, 'yyyy-MM-dd'));

        if (leaveError) {
          console.error('Error loading leave requests:', leaveError);
        }

        // Load carer profiles for leave requests
        const carerIds = leaveData?.map(leave => leave.user_id).filter(Boolean) || [];
        if (carerIds.length > 0) {
          const { data: carerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', carerIds);

          // Merge carer names into leave requests
          const leavesWithCarers = leaveData?.map(leave => ({
            ...leave,
            carer_name: carerProfiles?.find(p => p.id === leave.user_id)?.full_name || newCarers[leave.user_id] || 'Unknown'
          })) || [];

          setLeaveRequests(leavesWithCarers);
        } else {
          setLeaveRequests(leaveData || []);
        }
      } catch (error) {
        console.error('Error loading week data:', error);
      }
    };

    loadWeekData();
  }, [familyId, currentWeek, careRecipientName]);

  const getShiftsForDay = (day: Date) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const shifts = weekInstances.filter(instance => instance.scheduled_date === dayString);
    
    // Include leave requests that are approved (filter out denied ones)
    const leaves = leaveRequests.filter(leave => 
      leave.date === dayString && leave.status === 'approved'
    );
    
    // Convert leave requests to shift-like objects for display
    const leaveShifts = leaves.map(leave => ({
      ...leave,
      id: `leave-${leave.id}`,
      scheduled_date: leave.date,
      start_time: '09:00:00',
      end_time: '17:00:00',
      status: leave.type,
      carer_name: leave.carer_name || carers[leave.carer_id] || 'Unknown',
      carer_id: leave.carer_id,
      notes: leave.notes,
      shift_type: leave.type,
      is_leave_request: true,
      leave_type: leave.type,
      hours: leave.hours,
      display_name: `${leave.type?.replace(/_/g, ' ')} - ${leave.carer_name || carers[leave.carer_id] || 'Unknown'}`
    }));
    
    // Apply override logic: if a carer has approved leave, remove their basic shifts
    const carersWithLeave = new Set(leaveShifts.map(leave => leave.carer_id));
    const filteredShifts = shifts.filter(shift => !carersWithLeave.has(shift.carer_id));
    
    return [...filteredShifts, ...leaveShifts];
  };

  const getDisplayNames = (shift: any) => {
    const carerName = shift.carer_name || carers[shift.carer_id] || 'Carer';
    
    // Color-coded display with type and carer name
    if (shift.shift_type === 'annual_leave' || shift.type === 'annual_leave') {
      return `Holiday - ${carerName}`;
    }
    if (shift.shift_type === 'sickness' || shift.type === 'sickness') {
      return `Sickness - ${carerName}`;
    }
    if (shift.shift_type === 'public_holiday' || shift.type === 'public_holiday') {
      return `Public Holiday - ${carerName}`;
    }
    if (shift.shift_type === 'cover' || shift.type === 'cover') {
      return `Cover - ${carerName}`;
    }
    
    // Basic shift or other types
    if (userRole === 'carer') {
      return careRecipientName || 'Care Recipient';
    } else {
      return `Basic - ${carerName}`;
    }
  };

  const getCarerColor = (carerId: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const index = carerId ? carerId.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const deleteRecurringSeries = async (shiftAssignmentId: string) => {
    try {
      // Mark assignment as inactive
      const { error: assignmentError } = await supabase
        .from('shift_assignments')
        .update({ active: false })
        .eq('id', shiftAssignmentId);

      if (assignmentError) throw assignmentError;

      // Delete future shift instances
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error: instanceError } = await supabase
        .from('shift_instances')
        .delete()
        .eq('shift_assignment_id', shiftAssignmentId)
        .gte('scheduled_date', today);

      if (instanceError) throw instanceError;

      toast({
        title: "Series Deleted",
        description: "Recurring shift series has been deleted",
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting series:', error);
      toast({
        title: "Error",
        description: "Failed to delete recurring series",
        variant: "destructive",
      });
    }
  };

  const canEditShift = () => {
    return userRole === 'family_admin' || userRole === 'disabled_person';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getShiftTypeColor = (shiftType: string, type?: string, isLeaveRequest?: boolean) => {
    if (isLeaveRequest || type === 'leave') {
      switch (shiftType) {
        case 'holiday':
        case 'annual_leave':
          return 'bg-yellow-500 text-white font-bold';
        case 'sickness':
        case 'sick_leave':
          return 'bg-red-500 text-white font-bold';
        case 'public_holiday':
          return 'bg-purple-500 text-white font-bold';
        case 'cover':
          return 'bg-green-500 text-white font-bold';
        default:
          return 'bg-orange-500 text-white font-bold';
      }
    }
    
    const effectiveType = shiftType || type || 'basic';
    
    switch (effectiveType) {
      case 'basic':
        return 'bg-blue-500 text-white font-bold';
      case 'cover':
        return 'bg-green-500 text-white font-bold';
      default:
        return 'bg-gray-500 text-white font-bold';
    }
  };

  const handleShiftClick = (shift: any) => {
    if (shift.is_leave_request) {
      // Dispatch event for leave request editing
      window.dispatchEvent(new CustomEvent('schedule-edit-leave', { 
        detail: shift 
      }));
    } else {
      // Open shift edit modal
      onEditShift?.(shift);
    }
  };

  // Helper function to get visible days based on device type
  const getVisibleDays = () => {
    if (isTabletPortrait) {
      // Show 3 days at a time in portrait tablet mode
      const startIndex = current3DayWindow * 3;
      return weekDays.slice(startIndex, startIndex + 3);
    }
    return weekDays; // Show all 7 days for desktop and landscape tablet
  };

  const visibleDays = getVisibleDays();
  const totalWindows = Math.ceil(weekDays.length / 3);

  // Navigation functions for 3-day view
  const goToPrevious3Days = () => {
    setCurrent3DayWindow(prev => Math.max(0, prev - 1));
  };

  const goToNext3Days = () => {
    setCurrent3DayWindow(prev => Math.min(totalWindows - 1, prev + 1));
  };

  // Helper function to show "+X more" modal
  const handleShowMoreShifts = (day: Date, shifts: any[]) => {
    setSelectedDayShifts({ date: day, shifts });
  };

  // On mobile, use MobileDayView instead of the 7-day grid
  if (isMobile) {
    return (
      <MobileDayView
        familyId={familyId}
        userRole={userRole}
        careRecipientNameHint={careRecipientNameHint}
        carersMap={carers}
        onToggleListView={onToggleListView}
        showListView={showListView}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                View and manage shifts for the week of {format(weekStart, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {isTabletPortrait && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious3Days}
                    disabled={current3DayWindow === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {current3DayWindow + 1} of {totalWindows}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext3Days}
                    disabled={current3DayWindow === totalWindows - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleListView}
                className="md:hidden"
              >
                {showListView ? <Calendar className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
                {showListView ? 'Day View' : 'List'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-2 md:gap-4 ${
            isTabletPortrait ? 'grid-cols-3' : 'grid-cols-7'
          }`}>
            {visibleDays.map((day, index) => {
              const shifts = getShiftsForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={index}
                  className={`${
                    isTablet 
                      ? 'min-h-[120px] p-2' 
                      : 'min-h-[100px] md:min-h-[140px] lg:min-h-[160px] p-1 md:p-2 lg:p-3'
                  } border rounded-lg ${
                    isToday ? 'bg-primary/5 border-primary/20' : 'bg-background'
                  }`}
                >
                    <div className="text-xs md:text-sm font-medium mb-1">
                      {format(day, 'EEE')}
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'MMM d')}
                      </div>
                    </div>
                  
                  <div className="space-y-1">
                    {shifts.slice(0, isTablet ? 2 : shifts.length).map((shift) => (
                      <div
                        key={shift.id}
                        className="group relative"
                      >
                              <Badge 
                                className={`${
                                  isTablet 
                                    ? 'text-xs cursor-pointer p-2 h-auto justify-start hover:opacity-80 transition-opacity w-full overflow-hidden min-h-[38px] max-h-[42px]' 
                                    : 'text-xs px-1 py-0 w-full cursor-pointer hover:opacity-80 transition-opacity overflow-hidden'
                                } ${getShiftTypeColor(shift.shift_type, shift.type, shift.is_leave_request)}`}
                                title={getDisplayNames(shift)}
                                onClick={() => handleShiftClick(shift)}
                              >
                                {isTablet ? (
                                  <div className="flex flex-col gap-0.5 w-full min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1.5 max-w-full">
                                      <Clock className="h-3 w-3 flex-shrink-0" />
                                      <span className="font-medium text-[10px] leading-tight truncate max-w-full">
                                        {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-start max-w-full overflow-hidden">
                                      <span className="text-[10px] leading-tight truncate max-w-full">{formatShiftType(shift.shift_type || shift.type || 'basic')}</span>
                                      <span className="text-[9px] leading-tight opacity-90 truncate max-w-full">{shift.carer_name || carers[shift.carer_id] || 'Carer'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center leading-tight gap-0.5 w-full overflow-hidden max-w-full">
                                    <div className="flex items-center gap-1 max-w-full">
                                      <Clock className="h-2 w-2 flex-shrink-0" />
                                      <span className="text-[10px] leading-tight truncate">{shift.start_time?.slice(0, 5)}</span>
                                    </div>
                                    <div className="text-[10px] leading-tight truncate max-w-full">
                                      {formatShiftType(shift.shift_type || shift.type || 'basic')}
                                    </div>
                                    <div className="text-[9px] leading-tight truncate max-w-full opacity-90">
                                      {shift.carer_name || carers[shift.carer_id] || 'Carer'}
                                    </div>
                                  </div>
                                )}
                              </Badge>
                      </div>
                    ))}

                    {/* Show "+X more" button on tablets when there are more than 2 shifts */}
                    {isTablet && shifts.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 w-full"
                        onClick={() => handleShowMoreShifts(day, shifts)}
                      >
                        +{shifts.length - 2} more
                      </Button>
                    )}
                    
                    {shifts.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No shifts
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 pt-4 border-t gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                <span>Fixed Shifts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span>Variable Shifts</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {weekInstances.length} shifts this week
              </div>
            </div>
          </div>

          {/* List view for carers */}
          {userRole === 'carer' && showListView && weekInstances.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-3">This Week's Shifts</h4>
              <div className="space-y-2">
                {weekInstances.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{format(new Date(shift.scheduled_date), 'EEE, MMM d')}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs px-2 py-1 text-white ${getCarerColor(shift.carer_id)}`}
                    >
                      {getDisplayNames(shift)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Shifts Modal for "+X more" functionality */}
      <DayShiftsModal
        isOpen={!!selectedDayShifts}
        onClose={() => setSelectedDayShifts(null)}
        date={selectedDayShifts?.date || new Date()}
        shifts={selectedDayShifts?.shifts || []}
        carersMap={carers}
        userRole={userRole}
        onEditShift={onEditShift}
        onDeleteShift={onDeleteShift}
        getShiftTypeColor={getShiftTypeColor}
        getDisplayNames={getDisplayNames}
        handleShiftClick={handleShiftClick}
        canEditShift={canEditShift}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setShiftToDelete(null);
        }}
        onConfirm={() => {
          if (shiftToDelete) {
            deleteRecurringSeries(shiftToDelete);
          }
          setShowDeleteConfirm(false);
          setShiftToDelete(null);
        }}
        title="Delete Recurring Series"
        description="Are you sure you want to delete this recurring shift series? This will remove all future shifts and cannot be undone."
        careRecipientName={careRecipientName}
      />
    </>
  );
};