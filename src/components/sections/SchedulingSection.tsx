import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, AlertCircle, Edit, Trash2, User, Archive, Plus, List, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from 'date-fns';
import { ShiftAssignmentForm } from "../forms/ShiftAssignmentForm";
import { ShiftRequestForm } from "../forms/ShiftRequestForm";
import { ShiftAbsenceForm } from "../forms/ShiftAbsenceForm";
import { ShiftChangeRequestForm } from "../forms/ShiftChangeRequestForm";
import { ScheduleCalendar } from "../ScheduleCalendar";
import { ClockInOut } from "../ClockInOut";
import { MonthCalendarView } from "../MonthCalendarView";
import { ManageCareTeamDialog } from "../dialogs/ManageCareTeamDialog";
import { ExportTimesheetDialog } from "../dialogs/ExportTimesheetDialog";
import { ApprovedAbsencesArchive } from "../ApprovedAbsencesArchive";

interface SchedulingSectionProps {
  familyId: string | undefined;
  userRole: string;
  careRecipientNameHint?: string;
}

export const SchedulingSection = ({ familyId, userRole, careRecipientNameHint }: SchedulingSectionProps) => {
  console.log('[SchedulingSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Create your personal care space or join a family to start tracking schedules.
        </p>
      </div>
    );
  }

  const [assignments, setAssignments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [carers, setCarers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showShiftAbsenceForm, setShowShiftAbsenceForm] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showEditShift, setShowEditShift] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<any>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  const { toast } = useToast();

  console.log('showListView state:', showListView);

  // Debug: Log modal states whenever they change
  useEffect(() => {
    console.log('🔍 Modal render states:', {
      showChangeRequestForm,
      hasSelectedTimeEntry: !!selectedTimeEntry,
      showEditShift,
      hasEditingShift: !!editingShift
    });
  }, [showChangeRequestForm, selectedTimeEntry, showEditShift, editingShift]);

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
  const isCarer = userRole === 'carer';

  // Helper: Transform calendar shift to time entry format
  const transformShiftToTimeEntry = (shift: any) => {
    console.log('🔄 Transforming shift to time entry:', shift);
    
    // Handle shifts that already have full timestamps
    if (shift.clock_in && shift.clock_out) {
      return {
        id: shift.id,
        clock_in: shift.clock_in,
        clock_out: shift.clock_out,
        family_id: familyId
      };
    }
    
    // Handle calendar shifts with date + time components
    const date = shift.scheduled_date || shift.start_date || shift.date;
    const startTime = shift.start_time || '09:00:00';
    const endTime = shift.end_time || '17:00:00';
    
    if (!date) {
      console.error('❌ Cannot transform shift: missing date', shift);
      return null;
    }
    
    const timeEntry = {
      id: shift.id,
      clock_in: `${date}T${startTime}`,
      clock_out: `${date}T${endTime}`,
      family_id: familyId
    };
    
    console.log('✅ Transformed time entry:', timeEntry);
    return timeEntry;
  };

  // Handle edit shift/leave request click from calendar
  const onEditShift = (shift: any) => {
    console.log('🟢 Edit shift triggered:', shift);
    
    // Handle leave requests
    if (shift.is_leave_request || shift.id?.toString().startsWith('leave-')) {
      console.log('📋 Opening leave request editor');
      
      // Permission check for leave requests
      if (!isAdmin && currentUserId !== shift.carer_id) {
        toast({
          title: "Access Denied",
          description: "You can only view your own leave requests",
          variant: "destructive",
        });
        return;
      }

      // Check if request is denied
      if (shift.status === 'denied') {
        toast({
          title: "Request Denied",
          description: "This leave request has been denied and cannot be edited",
          variant: "destructive",
        });
        return;
      }

      // For approved leave requests, admins can edit, carers can only view
      if (shift.status === 'approved' && !isAdmin) {
        toast({
          title: "View Only",
          description: "Approved leave requests can only be viewed by carers",
        });
        return;
      }

      // Prepare leave request data for editing
      const leaveEditData = {
        id: shift.id.toString().replace('leave-', ''),
        carer_id: shift.carer_id,
        request_type: shift.leave_type || shift.type,
        start_date: shift.scheduled_date || shift.date,
        hours: shift.hours?.toString() || '8',
        reason: shift.notes || '',
        status: shift.status
      };

      console.log('✅ Opening ShiftRequestForm (leave) with:', leaveEditData);
      setEditingShift(leaveEditData);
      setShowEditShift(true);
      return;
    }
    
    // Carers submit change requests for existing shifts
    if (isCarer && !shift.is_leave_request) {
      console.log('👤 Carer mode: Opening change request form');
      const timeEntry = transformShiftToTimeEntry(shift);
      
      if (!timeEntry) {
        console.error('❌ Failed to transform shift data');
        toast({
          title: "Error",
          description: "Cannot edit this shift: missing required data",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Opening ShiftChangeRequestForm with:', timeEntry);
      setSelectedTimeEntry(timeEntry);
      setShowChangeRequestForm(true);
      return;
    }
    
    // Admins can edit shifts directly
    if (isAdmin) {
      console.log('👑 Admin mode: Opening direct edit form', shift);
      
      // CASE 1: New data model - time_entries with full timestamps
      const isNewDataModel = shift.clock_in && shift.clock_out;
      
      if (isNewDataModel) {
        const clockInDate = new Date(shift.clock_in);
        const clockOutDate = new Date(shift.clock_out);
        
        const editData = {
          id: shift.id,
          time_entry_id: shift.id,
          carer_id: shift.user_id,
          request_type: 'basic',
          start_date: format(clockInDate, 'yyyy-MM-dd'),
          start_time: format(clockInDate, 'HH:mm'),
          end_time: format(clockOutDate, 'HH:mm'),
          hours: Math.round(((clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60)) * 100) / 100,
          reason: shift.notes || '',
          shift_type: shift.notes || 'basic',
          shift_category: 'basic'
        };
        
        console.log('✅ Opening ShiftRequestForm (new model) with:', editData);
        setEditingShift(editData);
        setShowEditShift(true);
        return;
      }
      
      // CASE 2: Transformed time_entry - has start_time/end_time but no clock_in/clock_out
      // This happens when time_entries are transformed for display in the calendar
      const isTransformedTimeEntry = !shift.shift_assignment_id && shift.start_time && shift.end_time && shift.scheduled_date;
      
      if (isTransformedTimeEntry) {
        console.log('🔄 Handling transformed time_entry');
        
        // Reconstruct timestamps from date + time components
        const clockIn = `${shift.scheduled_date}T${shift.start_time}`;
        const clockOut = `${shift.scheduled_date}T${shift.end_time}`;
        
        const editData = {
          id: shift.id,
          time_entry_id: shift.id,
          carer_id: shift.carer_id,
          request_type: 'basic',
          start_date: shift.scheduled_date,
          start_time: shift.start_time.slice(0, 5), // HH:mm format
          end_time: shift.end_time.slice(0, 5),
          hours: Math.round(((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / (1000 * 60 * 60)) * 100) / 100,
          reason: shift.notes || '',
          shift_type: shift.shift_type || 'basic',
          shift_category: 'basic'
        };
        
        console.log('✅ Opening ShiftRequestForm (transformed) with:', editData);
        setEditingShift(editData);
        setShowEditShift(true);
        return;
      }
      
      // CASE 3: Old data model - shift_assignments with shift_instances
      if (!shift.shift_assignment_id) {
        console.warn('⚠️ Cannot edit shift: no shift_assignment_id and not a time_entry');
        toast({
          title: "Cannot Edit Shift",
          description: "This shift cannot be edited (missing required data)",
          variant: "destructive"
        });
        return;
      }
      
      // Find the assignment for this shift
      const assignment = assignments.find(a => a.id === shift.shift_assignment_id);
      if (!assignment) {
        console.warn('⚠️ Assignment not found for shift');
        toast({
          title: "Cannot Edit Shift",
          description: "Shift assignment not found",
          variant: "destructive"
        });
        return;
      }

      const editData = {
        id: shift.id,
        shift_assignment_id: shift.shift_assignment_id,
        carer_id: shift.carer_id,
        request_type: 'basic',
        start_date: shift.scheduled_date,
        hours: shift.start_time && shift.end_time ? 
          Math.round(((new Date(`2000-01-01T${shift.end_time}`).getTime() - new Date(`2000-01-01T${shift.start_time}`).getTime()) / (1000 * 60 * 60)) * 100) / 100 : 8,
        reason: shift.notes || '',
        shift_category: 'basic'
      };

      console.log('✅ Opening ShiftRequestForm (old model) with:', editData);
      setEditingShift(editData);
      setShowEditShift(true);
    }
  };

  // Listen for custom event to open add shift form
  useEffect(() => {
    const handleOpenAddShift = () => {
      setShowAssignmentForm(true);
    };

    const handleScheduleEditShift = (event: CustomEvent) => {
      onEditShift(event.detail.shift);
    };

    window.addEventListener('open-add-shift', handleOpenAddShift);
    window.addEventListener('schedule-edit-shift', handleScheduleEditShift);
    return () => {
      window.removeEventListener('open-add-shift', handleOpenAddShift);
      window.removeEventListener('schedule-edit-shift', handleScheduleEditShift);
    };
  }, [assignments, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadData = async () => {
      if (cancelled || !familyId) {
        setLoading(false);
        return;
      }

      try {
        await getCurrentUser();
        if (cancelled) return;
        
        await loadSchedulingData(0, abortController.signal);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading data:', error);
        }
      }
    };

    // 8-second timeout
    const timeout = setTimeout(() => {
      if (!cancelled) {
        abortController.abort();
        setLoading(false);
        console.warn("⏱️ [SchedulingSection] load timeout after 8s");
      }
    }, 8000);

    loadData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      abortController.abort();
      clearTimeout(timeout);
      setLoading(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [familyId]);

  // Show refresh button after 5 seconds of loading
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (loading) {
      refreshTimer = setTimeout(() => {
        setShowRefresh(true);
      }, 5000);
    } else {
      setShowRefresh(false);
    }
    return () => clearTimeout(refreshTimer);
  }, [loading]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    return user?.id || null;
  };

  const loadSchedulingData = async (retryCount = 0, signal?: AbortSignal) => {
    // Check if familyId is provided FIRST
    if (!familyId) {
      console.warn('No familyId provided to loadSchedulingData');
      setLoading(false);
      return;
    }
    
    // 10s timeout - define outside try block so it's accessible in catch
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      if (signal?.aborted) return;
      
      setLoading(true);

      timeoutId = setTimeout(() => {
        if (!signal?.aborted) {
          toast({
            title: "Loading timeout",
            description: "Scheduling data is taking longer than expected.",
            variant: "destructive"
          });
        }
      }, 10000);
      
      // Get current user ID first
      const userId = currentUserId || await getCurrentUser();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const isCarerRole = userRole === 'carer';
      
      // Load carers - for carers, only load their own profile
      if (isCarerRole) {
        // Carers only see themselves
        const { data: profile } = await supabase
          .rpc('get_profile_safe');
        
        const carerMap: Record<string, string> = {};
        if (profile && profile.length > 0) {
          carerMap[userId] = profile[0].full_name || 'Unnamed Carer';
        } else {
          carerMap[userId] = 'Unnamed Carer';
        }
        setCarers(carerMap);
      } else {
        // Admins see all carers
        const { data: carerMemberships, error: carersError } = await supabase
          .from('user_memberships')
          .select('user_id')
          .eq('family_id', familyId)
          .eq('role', 'carer');

        if (!carersError && carerMemberships) {
          const carerMap: Record<string, string> = {};
          
          // Fetch all carer profiles in one query
          const carerUserIds = carerMemberships.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', carerUserIds);
          
          // Map profiles to carer IDs
          carerMemberships.forEach((membership) => {
            const profile = profiles?.find(p => p.id === membership.user_id);
            carerMap[membership.user_id] = profile?.full_name || 'Unnamed Carer';
          });
          
          setCarers(carerMap);
        }
      }
      
      // Load shift assignments - carers only see their own
      let assignmentsQuery = supabase
        .from('shift_assignments')
        .select('*')
        .eq('family_id', familyId)
        .eq('active', true);
      
      if (isCarerRole) {
        assignmentsQuery = assignmentsQuery.eq('carer_id', userId);
      }
      
      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;
      if (assignmentsError) throw assignmentsError;

      // Shift requests table doesn't exist - skip loading
      const requestsData: any[] = [];
      const requestsError = null;

      // Load leave requests - carers only see their own
      let leaveRequestsQuery = supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false }) as any;
      
      if (isCarerRole) {
        leaveRequestsQuery = leaveRequestsQuery.eq('user_id', userId) as any;
      }
      
      const { data: leaveRequestsData, error: leaveRequestsError } = await leaveRequestsQuery;

      if (requestsError) throw requestsError;
      if (leaveRequestsError) throw leaveRequestsError;

      // Load this week's shift instances - carers only see their own
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      let instancesQuery = supabase
        .from('shift_instances')
        .select(`
          *,
          shift_assignments!inner(carer_id)
        `)
        .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
        .lte('scheduled_date', endOfWeek.toISOString().split('T')[0]);
      
      if (isCarerRole) {
        instancesQuery = instancesQuery.eq('shift_assignments.carer_id', userId);
      }
      
      const { data: instancesData, error: instancesError } = await instancesQuery;
      if (instancesError) throw instancesError;

      if (timeoutId) clearTimeout(timeoutId);

      if (signal?.aborted) return;

      setAssignments(assignmentsData || []);
      
      // Combine requests with type information for better handling
      const allRequests = [
        ...(requestsData || []).map(r => ({ ...r, request_source: 'shift' })),
        ...(leaveRequestsData || []).map(r => ({ ...r, request_source: 'leave' }))
      ];
      
      setRequests(allRequests);
      setInstances(instancesData || []);
    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError') return;
      
      console.error('Error loading scheduling data:', error);
      
      if (retryCount < 2) {
        console.log(`⏳ Retrying... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return loadSchedulingData(retryCount + 1, signal);
      }
      
      toast({
        title: "Error loading schedule",
        description: "Unable to load scheduling data. Please try again.",
        variant: "destructive"
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const handleApproveRequest = async (requestId: string, approved: boolean, requestType: 'shift' | 'leave') => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      if (requestType === 'shift') {
        // Shift requests table doesn't exist - do nothing
        return;
      } else {
        // Just update the leave request status - don't create shift instances
        const { error } = await supabase
          .from('leave_requests')
          .update({ 
            status: approved ? 'approved' : 'denied'
          })
          .eq('id', requestId);

        if (error) throw error;
      }

      toast({
        title: approved ? "Request approved" : "Request denied",
        description: `The ${requestType} request has been ${approved ? 'approved' : 'denied'}.`,
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: `Failed to ${approved ? 'approve' : 'deny'} request.`,
        variant: "destructive",
      });
    }
  };

  const handleApproveLeaveRequest = async (requestId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: approved ? 'approved' : 'denied',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Leave Request Updated",
        description: `Leave request has been ${approved ? 'approved' : 'denied'}`,
      });

      loadSchedulingData();
    } catch (error) {
      console.error('Error updating leave request:', error);
      toast({
        title: "Error",
        description: "Failed to update leave request",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shift assignment deleted successfully",
      });

      loadSchedulingData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete shift assignment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async (requestId: string, requestType: 'shift' | 'leave') => {
    try {
      if (requestType === 'shift') {
        // Shift requests table doesn't exist - do nothing
        return;
      } else {
        const { error } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', requestId);
        
        if (error) throw error;
      }

      toast({
        title: "Request deleted",
        description: `The ${requestType} request has been deleted.`,
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${requestType} request.`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Loading scheduling data…
            </div>
            {showRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Force Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
        <Tabs defaultValue={isAdmin ? "overview" : "schedule"} className="w-full">
          <TabsList className={`grid w-full overflow-hidden ${
            isAdmin ? 'grid-cols-4' : 
            isCarer ? 'grid-cols-4' : 
            'grid-cols-3'
          }`}>
            {isAdmin && (
              <TabsTrigger value="overview" className="flex items-center justify-center px-1 py-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Overview</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="schedule" className="flex items-center justify-center px-1 py-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Schedule</span>
            </TabsTrigger>
            {isCarer && (
              <TabsTrigger value="clock" className="flex items-center justify-center px-1 py-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Clock</span>
              </TabsTrigger>
            )}
          <TabsTrigger value="requests" className="flex items-center justify-center px-1 py-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Changes</span>
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center justify-center px-1 py-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Archive</span>
          </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-4">

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button 
                        onClick={() => setShowMonthView(true)} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      >
                        <Calendar className="h-5 w-5" />
                        <span className="text-sm">Month View</span>
                      </Button>
                      <Button 
                        onClick={() => setShowExportDialog(true)} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      >
                        <Download className="h-5 w-5" />
                        <span className="text-sm">Export</span>
                      </Button>
                      <Button 
                        onClick={() => setShowAssignmentForm(true)} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-sm">Add Shift</span>
                      </Button>
                      <Button 
                        onClick={() => setShowCareTeamDialog(true)} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      >
                        <Users className="h-5 w-5" />
                        <span className="text-sm">Invite Member</span>
                      </Button>
                    </div>
                  </div>



              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  const tabsElement = document.querySelector('[role="tablist"]');
                  const requestsTab = tabsElement?.querySelector('[value="requests"]') as HTMLButtonElement;
                  requestsTab?.click();
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {requests.filter(r => r.status === 'pending').length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {requests.filter(r => r.status === 'pending').length === 1 ? 'request' : 'requests'} waiting for review
                  </p>
                </CardContent>
              </Card>

            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Overview is only available for administrators.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Weekly Schedule</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowMonthView(true)} 
                    variant="outline"
                    size="sm"
                    className="h-10 px-3"
                  >
                    Month View
                  </Button>
                  <Button 
                    onClick={() => {
                      const event = new CustomEvent('mobile-toggle-list-view');
                      window.dispatchEvent(event);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 md:hidden"
                  >
                    {showListView ? 'Day View' : 'List'}
                  </Button>
                </div>
              </div>
            </div>
            
            <ScheduleCalendar 
              familyId={familyId} 
              userRole={userRole}
              careRecipientNameHint={careRecipientNameHint}
              assignments={assignments}
              instances={instances}
              onRefresh={loadSchedulingData}
              onEditShift={onEditShift}
              showListView={(() => {
                console.log('Passing showListView to ScheduleCalendar:', showListView);
                return showListView;
              })()}
              onToggleListView={() => {
                console.log('Toggle list view called from ScheduleCalendar');
                setShowListView(!showListView);
              }}
              onDeleteShift={async (shiftId) => {
                try {
                  const { error } = await supabase
                    .from('shift_instances')
                    .delete()
                    .eq('id', shiftId);

                  if (error) throw error;

                  toast({
                    title: "Success",
                    description: "Shift deleted successfully",
                  });

                  loadSchedulingData();
                } catch (error) {
                  console.error('Error deleting shift:', error);
                  toast({
                    title: "Error",
                    description: "Failed to delete shift",
                    variant: "destructive",
                  });
                }
              }}
              carersMap={carers}
            />
          </div>
        </TabsContent>

        <TabsContent value="clock" className="space-y-4">
          {isCarer ? (
            <ClockInOut familyId={familyId} onUpdate={loadSchedulingData} />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Clock In/Out is only available for carers.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>Shift Requests</CardTitle>
                  <CardDescription>Holiday, swap, and sick day requests</CardDescription>
                </div>
                {isCarer && (
                  <Button 
                    onClick={() => setShowRequestForm(true)}
                    size="sm"
                    className="h-10 px-4 text-sm min-h-[44px] md:min-h-[40px] w-full md:w-auto"
                  >
                    New Request
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.filter(r => r.status === 'pending').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending requests found
                  </div>
                ) : (
                  requests.filter(r => r.status === 'pending').map((request) => (
                    <div key={request.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg space-y-3 md:space-y-0">
                      <div className="flex-1">
                        <div className="font-medium capitalize text-sm md:text-base">
                          {request.request_type ? request.request_type.replace('_', ' ') : 
                           request.type ? request.type.replace('_', ' ') : 'Unknown Request'}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {request.start_date || request.date} {request.end_date && `- ${request.end_date}`}
                        </div>
                        {request.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Reason: {request.reason}
                          </div>
                        )}
                        {request.hours && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Hours: {request.hours}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-2">
                        <Badge 
                          variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'denied' ? 'destructive' : 'secondary'
                          }
                          className="w-fit"
                        >
                          {request.status}
                        </Badge>
                        {request.request_type === 'shift_change_notification' && (
                          <Badge variant="outline" className="w-fit">Change</Badge>
                         )}
                       </div>
                       {isAdmin && request.status === 'pending' && (
                         <div className="w-full">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               setEditingShift(request);
                               setShowEditShift(true);
                             }}
                             className="w-full text-sm"
                           >
                             <Edit className="h-4 w-4 mr-1" />
                             Edit Shift
                           </Button>
                         </div>
                       )}
                       <div className="flex flex-col md:flex-row gap-2 mt-3 md:mt-0">
                        {isAdmin && request.status === 'pending' && (
                          <>
                            <div className="flex gap-2 w-full md:w-auto">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveRequest(request.id, true, request.request_source || 'shift')}
                                className="flex-1 md:flex-none text-sm"
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleApproveRequest(request.id, false, request.request_source || 'shift')}
                                className="flex-1 md:flex-none text-sm"
                              >
                                Deny
                              </Button>
                            </div>
                          </>
                        )}
                        {(isCarer || isAdmin) && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteRequest(request.id, request.request_source || 'shift')}
                            className="w-full md:w-auto text-sm"
                          >
                            <Trash2 className="h-4 w-4 md:mr-1" />
                            <span className="md:hidden">Delete</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab - Approved Absences */}
        <TabsContent value="archive" className="space-y-6">
          <ApprovedAbsencesArchive 
            familyId={familyId}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      {(showAssignmentForm || editingAssignment) && (
        <ShiftAssignmentForm
          familyId={familyId}
          editingAssignment={editingAssignment}
          onSuccess={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
            loadSchedulingData();
          }}
          onCancel={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
          }}
        />
      )}

        {showRequestForm && (
          <ShiftRequestForm
            familyId={familyId}
            open={showRequestForm}
            onOpenChange={(open) => setShowRequestForm(open)}
            onSuccess={() => {
              setShowRequestForm(false);
              loadSchedulingData();
            }}
            onCancel={() => setShowRequestForm(false)}
          />
        )}

        {showMonthView && (
          <MonthCalendarView
            isOpen={showMonthView}
            onClose={() => setShowMonthView(false)}
            familyId={familyId}
            userRole={userRole}
            careRecipientNameHint={careRecipientNameHint}
            onShiftClick={onEditShift}
            carersMap={carers}
          />
        )}

        <ManageCareTeamDialog 
          isOpen={showCareTeamDialog} 
          onClose={() => setShowCareTeamDialog(false)}
          familyId={familyId}
        />
        

        <ExportTimesheetDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          familyId={familyId}
          userRole={userRole}
        />

        <ShiftRequestForm
          familyId={familyId}
          editShiftData={editingShift}
          isAdminEdit={true}
          open={showEditShift && Boolean(editingShift)}
          onOpenChange={(open) => {
            setShowEditShift(open);
            if (!open) setEditingShift(null);
          }}
          onSuccess={() => {
            setShowEditShift(false);
            setEditingShift(null);
            loadSchedulingData();
          }}
          onCancel={() => {
            setShowEditShift(false);
            setEditingShift(null);
          }}
        />

        <ShiftChangeRequestForm
          timeEntry={selectedTimeEntry || { id: '', clock_in: '', clock_out: '', family_id: familyId }}
          open={showChangeRequestForm && Boolean(selectedTimeEntry)}
          onOpenChange={(open) => {
            console.log('🔍 Modal onOpenChange:', open);
            setShowChangeRequestForm(open);
            if (!open) setSelectedTimeEntry(null);
          }}
          onSuccess={() => {
            setShowChangeRequestForm(false);
            setSelectedTimeEntry(null);
            loadSchedulingData();
          }}
          onCancel={() => {
            setShowChangeRequestForm(false);
            setSelectedTimeEntry(null);
          }}
        />

    </div>
  );
};