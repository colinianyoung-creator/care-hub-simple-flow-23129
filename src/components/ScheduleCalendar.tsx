import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Edit, Trash2, Calendar, List, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "./dialogs/ConfirmationDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { MobileDayView } from "./MobileDayView";
import { DayShiftsModal } from "./dialogs/DayShiftsModal";
import { formatShiftType } from "@/lib/textUtils";
import { getShiftTypeColor, getShiftTypeLabel } from '@/lib/shiftUtils';
import { cn } from "@/lib/utils";

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
  viewMode?: 'single-family' | 'all-families';
  allFamiliesShifts?: any[];
  currentUserId?: string;
  refreshTrigger?: number;
  selectedCarerId?: string | null;
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
  viewMode = 'single-family',
  allFamiliesShifts = [],
  currentUserId,
  refreshTrigger = 0,
  selectedCarerId = null
}: ScheduleCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [carers, setCarers] = useState<Record<string, string>>({});
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
 
// Load leave requests and carer info for the calendar
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        // Get unique carer IDs from instances prop
        const carerIds = [...new Set(instances.map(entry => entry.carer_id).filter(Boolean))] as string[];
        
        // Get unique placeholder carer IDs from instances prop
        const placeholderCarerIds = [...new Set(instances.map(entry => entry.placeholder_carer_id).filter(Boolean))] as string[];
        
        // Load carer profiles if not provided
        if (!carersMap || Object.keys(carersMap).length === 0) {
          const newCarers: Record<string, string> = {};
          
          if (carerIds.length > 0) {
            const { data: carerProfiles } = await supabase
              .from('profiles_secure')
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
              .in('id', placeholderCarerIds);

            placeholderCarers?.forEach(pc => {
              newCarers[`placeholder_${pc.id}`] = pc.full_name;
            });
          }
          
          setCarers(newCarers);
        }

        // Fetch care recipient name for carers
        if (userRole === 'carer' && !careRecipientName && familyId) {
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

        // Load approved leave requests for this week
        if (familyId) {
          const { data: leaveData, error: leaveError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('family_id', familyId)
            .eq('status', 'approved')
            .or(`and(start_date.lte.${weekEndStr},end_date.gte.${weekStartStr})`);

          if (leaveError) {
            console.error('Error loading leave requests:', leaveError);
          }

          // Load carer profiles for leave requests
          const leaveCarerIds = leaveData?.map(leave => leave.user_id).filter(Boolean) || [];
          if (leaveCarerIds.length > 0) {
            const { data: leaveCarerProfiles } = await supabase
              .from('profiles_secure')
              .select('id, full_name')
              .in('id', leaveCarerIds);

            // Merge carer names into leave requests
            const leavesWithCarers = leaveData?.map(leave => ({
              ...leave,
              carer_name: leaveCarerProfiles?.find(p => p.id === leave.user_id)?.full_name || carers[leave.user_id] || 'Unknown'
            })) || [];

            setLeaveRequests(leavesWithCarers);
          } else {
            setLeaveRequests(leaveData || []);
          }
        }
      } catch (error) {
        console.error('Error loading week data:', error);
      }
    };

    loadWeekData();
  }, [familyId, currentWeek, careRecipientName, instances, carersMap]);

  const getShiftsForDay = (day: Date) => {
    const dayString = format(day, 'yyyy-MM-dd');
    
    // Use allFamiliesShifts when in all-families mode
    if (viewMode === 'all-families' && allFamiliesShifts.length > 0) {
      return allFamiliesShifts.filter(shift => {
        // Handle both time_entry format (clock_in) and shift_instance format (scheduled_date)
        const shiftDate = shift.clock_in 
          ? format(new Date(shift.clock_in), 'yyyy-MM-dd') 
          : shift.scheduled_date;
        if (shiftDate !== dayString) return false;
        // Apply carer filter
        if (selectedCarerId && (shift.user_id || shift.carer_id) !== selectedCarerId) return false;
        return true;
      }).map(entry => ({
        id: entry.id,
        scheduled_date: entry.scheduled_date || (entry.clock_in ? format(new Date(entry.clock_in), 'yyyy-MM-dd') : null),
        start_time: entry.start_time || (entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm:ss') : null),
        end_time: entry.end_time || (entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : null),
        carer_id: entry.carer_id || entry.user_id,
        carer_name: entry.carer_name || entry.profiles?.full_name || 'Unknown',
        care_recipient_name: entry.family_name || entry.families?.name || 'Care Recipient',
        shift_type: entry.shift_type || 'basic',
        notes: entry.notes,
        family_id: entry.family_id,
        family_name: entry.family_name || entry.families?.name || 'Unknown',
        status: entry.status || 'scheduled',
        shift_assignment_id: entry.shift_assignment_id,
        shift_instance_id: entry.shift_instance_id
      }));
    }
    
    let shifts = instances.filter(instance => instance.scheduled_date === dayString);
    
    // Apply carer filter for single-family mode
    if (selectedCarerId) {
      shifts = shifts.filter(shift => shift.carer_id === selectedCarerId);
    }
    
    // Include leave requests that are approved (filter out denied ones)
    let leaves = leaveRequests.filter(leave => {
      const leaveStart = leave.start_date;
      const leaveEnd = leave.end_date;
      const isInRange = dayString >= leaveStart && dayString <= leaveEnd && leave.status === 'approved';
      if (!isInRange) return false;
      // Apply carer filter
      if (selectedCarerId && leave.user_id !== selectedCarerId) return false;
      return true;
    });
    
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
    // For carers, ALWAYS show care recipient name regardless of shift type
    if (userRole === 'carer') {
      const recipientName = shift.care_recipient_name || careRecipientName || 'Care Recipient';
      return recipientName;
    }

    // Helper to get carer name (including placeholder carers)
    const getCarerDisplayName = () => {
      if (shift.carer_name) return shift.carer_name;
      if (shift.carer_id && carers[shift.carer_id]) return carers[shift.carer_id];
      if (shift.placeholder_carer_id) {
        const placeholderKey = `placeholder_${shift.placeholder_carer_id}`;
        if (carers[placeholderKey]) return carers[placeholderKey];
        return shift.placeholder_carer_name || 'Pending Carer';
      }
      return 'Unassigned';
    };

    // For admins, show type label + carer name for leave/cover types
    if (shift.is_leave_request || shift.shift_type === 'annual_leave' || shift.type === 'annual_leave' || 
        shift.shift_type === 'sickness' || shift.type === 'sickness' ||
        shift.shift_type === 'public_holiday' || shift.type === 'public_holiday' ||
        shift.shift_type === 'cover' || shift.type === 'cover') {
      
      const typeLabels: { [key: string]: string } = {
        'annual_leave': 'Holiday',
        'holiday': 'Holiday',
        'sickness': 'Sickness',
        'sick_leave': 'Sickness',
        'public_holiday': 'Public Holiday',
        'cover': 'Cover'
      };
      
      const shiftType = shift.shift_type || shift.type;
      const label = typeLabels[shiftType] || getShiftTypeLabel(shiftType);
      return `${label} - ${getCarerDisplayName()}`;
    }
    
    // For admins with basic shifts, show carer name
    return getCarerDisplayName();
  };

  const getCarerColor = (carerId: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const index = carerId ? carerId.charCodeAt(0) % colors.length : 0;
    return colors[index];
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

  // Removed - now using shared utility from src/lib/shiftUtils.ts

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
        refreshTrigger={refreshTrigger}
        viewMode={viewMode}
        allFamiliesShifts={allFamiliesShifts}
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
              const isEmpty = shifts.length === 0;
              const canAddShift = canEditShift();
              
              return (
                <div
                  key={index}
                  className={cn(
                    isTablet 
                      ? 'min-h-[120px] p-2' 
                      : 'min-h-[100px] md:min-h-[140px] lg:min-h-[160px] p-1 md:p-2 lg:p-3',
                    'border rounded-lg',
                    isToday ? 'bg-primary/5 border-primary/20' : 'bg-background',
                    isEmpty && canAddShift && 'hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-colors group'
                  )}
                  onClick={() => {
                    if (isEmpty && canAddShift) {
                      window.dispatchEvent(new CustomEvent('schedule-add-shift', { 
                        detail: { date: format(day, 'yyyy-MM-dd') } 
                      }));
                    }
                  }}
                >
                    <div className="text-xs md:text-sm font-medium mb-1 flex items-center justify-between">
                      <div>
                        {format(day, 'EEE')}
                        <div className="text-xs text-muted-foreground">
                          {format(day, 'MMM d')}
                        </div>
                      </div>
                      {isEmpty && canAddShift && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                  
                  <div className="space-y-1">
                    {shifts.slice(0, isTablet ? 2 : shifts.length).map((shift) => (
                      <div
                        key={shift.id}
                        className="group relative"
                      >
                              <Badge 
                                className={cn(
                                  isTablet 
                                    ? 'text-xs cursor-pointer p-2 h-auto justify-start hover:opacity-80 transition-opacity w-full overflow-hidden min-h-[38px] max-h-[42px] relative z-20'
                                    : 'text-xs px-1 py-0 w-full cursor-pointer hover:opacity-80 transition-opacity overflow-hidden',
                                  getShiftTypeColor(shift.shift_type, shift.is_leave_request),
                                  shift.pending_export && "opacity-50 grayscale"
                                )}
                                title={shift.pending_export ? `${shift.original_carer_name || shift.carer_name} (pending export)` : getDisplayNames(shift)}
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
                                      <span className="text-[9px] leading-tight opacity-90 truncate max-w-full">
                                        {userRole === 'carer'
                                          ? getDisplayNames(shift)
                                          : (shift.carer_name || carers[shift.carer_id] || 'Unassigned')}
                                      </span>
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
                                      {userRole === 'carer'
                                        ? getDisplayNames(shift)
                                        : (shift.carer_name || carers[shift.carer_id] || 'Unassigned')}
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
            {/* Shift count removed - was showing incorrect total */}
          </div>
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
        getDisplayNames={getDisplayNames}
        handleShiftClick={handleShiftClick}
        canEditShift={canEditShift}
      />

    </>
  );
};