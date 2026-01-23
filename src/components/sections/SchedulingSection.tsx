import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, AlertCircle, Plus, Download, Loader2, Filter, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BulkDeleteShiftsDialog } from "../dialogs/BulkDeleteShiftsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from 'date-fns';
import { ShiftAssignmentForm } from "../forms/ShiftAssignmentForm";
import { UnifiedShiftForm } from "../forms/UnifiedShiftForm";
import { ShiftAbsenceForm } from "../forms/ShiftAbsenceForm";
import { ScheduleCalendar } from "../ScheduleCalendar";
import { ClockInOut } from "../ClockInOut";
import { MonthCalendarView } from "../MonthCalendarView";
import { ManageCareTeamDialog } from "../dialogs/ManageCareTeamDialog";
import { ExportTimesheetDialog } from "../dialogs/ExportTimesheetDialog";
import { LeaveSection } from "./LeaveSection";
import { InviteMembersButton } from "../InviteMembersButton";
import { ShiftViewToggle } from "../ShiftViewToggle";
import { ChangeRequestCard } from "../ChangeRequestCard";
import { CancellationRequestCard } from "../CancellationRequestCard";
import { SnapshotViewerModal } from "../dialogs/SnapshotViewerModal";
import { ConflictResolutionModal } from "../dialogs/ConflictResolutionModal";
import { PendingTimeEntries } from "../PendingTimeEntries";
import { APP_REFRESH_EVENT } from "@/hooks/useAppRefresh";

interface SchedulingSectionProps {
  familyId: string | undefined;
  userRole: string;
  careRecipientNameHint?: string;
  defaultActiveTab?: string;
}

export const SchedulingSection = ({ familyId, userRole, careRecipientNameHint, defaultActiveTab }: SchedulingSectionProps) => {
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

  const isViewer = userRole === 'family_viewer';
  const canEdit = !isViewer;

  const [assignments, setAssignments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [carers, setCarers] = useState<Record<string, string>>({});
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showShiftAbsenceForm, setShowShiftAbsenceForm] = useState(false);
  const [showMonthView, setShowMonthView] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showUnifiedShiftForm, setShowUnifiedShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [createShiftInitialDate, setCreateShiftInitialDate] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  const [viewMode, setViewMode] = useState<'single-family' | 'all-families'>('single-family');
  const [allFamiliesShifts, setAllFamiliesShifts] = useState<any[]>([]);
  const [loadingAllFamilies, setLoadingAllFamilies] = useState(false);
  const [activeTab, setActiveTab] = useState(
    defaultActiveTab || (userRole === 'family_admin' || userRole === 'disabled_person' ? "overview" : "schedule")
  );
  const [userFamilies, setUserFamilies] = useState<{id: string, name: string}[]>([]);
  const [selectedCarerId, setSelectedCarerId] = useState<string | null>(null);
  // Removed requestsSubTab - Requests tab now shows only pending (+ recently denied for requester)
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [conflictRequestId, setConflictRequestId] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Sync activeTab with defaultActiveTab prop changes (for pending requests navigation)
  useEffect(() => {
    if (defaultActiveTab) {
      setActiveTab(defaultActiveTab);
    }
  }, [defaultActiveTab]);

  

  // Debug: Log modal states whenever they change
  useEffect(() => {
    console.log('🔍 Modal render states:', {
      showUnifiedShiftForm,
      hasEditingShift: !!editingShift
    });
  }, [showUnifiedShiftForm, editingShift]);

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
  const isCarer = userRole === 'carer';

  // Load user's family count on mount for toggle visibility
  const loadUserFamilyCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships, error } = await supabase
        .from('user_memberships')
        .select('family_id, families(id, name)')
        .eq('user_id', user.id);

      if (error) throw error;

      setUserFamilies(memberships?.map(m => ({
        id: m.family_id,
        name: (m.families as any)?.name || 'Unknown'
      })) || []);
      
      console.log('👥 User belongs to families:', memberships?.length);
    } catch (error) {
      console.error('Error loading family count:', error);
    }
  };

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

  const loadAllMyShifts = async () => {
    console.log('📊 [loadAllMyShifts] Starting to load cross-family shifts...');
    setLoadingAllFamilies(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [loadAllMyShifts] No user found');
        setLoadingAllFamilies(false);
        return;
      }

      // Fetch user's families directly if not already loaded
      let familyIds = userFamilies.map(f => f.id);
      let familyMap: Record<string, string> = {};
      
      if (familyIds.length === 0) {
        console.log('⏳ userFamilies not loaded yet, fetching directly...');
        const { data: memberships, error: membershipError } = await supabase
          .from('user_memberships')
          .select('family_id, families(id, name)')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        familyIds = memberships?.map(m => m.family_id) || [];
        
        // Build family name map
        memberships?.forEach(m => {
          familyMap[m.family_id] = (m.families as any)?.name || 'Unknown';
        });
        
        // Also update state for future use
        setUserFamilies(memberships?.map(m => ({
          id: m.family_id,
          name: (m.families as any)?.name || 'Unknown'
        })) || []);
      } else {
        // Build family name map from existing state
        userFamilies.forEach(f => {
          familyMap[f.id] = f.name;
        });
      }
      
      if (familyIds.length === 0) {
        console.log('No families found for user');
        toast({
          title: "No families found",
          description: "You are not a member of any families",
          variant: "destructive"
        });
        return;
      }

      console.log('📊 Loading shift_instances for families:', familyIds);

      // Calculate date range (3 months ago to 1 year ahead)
      const threeMonthsAgo = format(addDays(new Date(), -90), 'yyyy-MM-dd');
      const oneYearFromNow = format(addDays(new Date(), 365), 'yyyy-MM-dd');

      // Get all shift_instances where user is the assigned carer across all families
      const { data: allInstances, error: instancesError } = await supabase
        .from('shift_instances')
        .select(`
          *,
          shift_assignments!inner (
            id,
            family_id,
            carer_id,
            start_time,
            end_time,
            shift_type,
            notes
          )
        `)
        .eq('shift_assignments.carer_id', user.id)
        .in('shift_assignments.family_id', familyIds)
        .gte('scheduled_date', threeMonthsAgo)
        .lte('scheduled_date', oneYearFromNow)
        .order('scheduled_date', { ascending: true });

      if (instancesError) throw instancesError;

      console.log('✅ [loadAllMyShifts] Loaded shift_instances:', allInstances?.length || 0);

      // Transform shift_instances to the format expected by the calendar
      const transformedShifts = (allInstances || []).map(instance => {
        const assignment = instance.shift_assignments as any;
        return {
          id: instance.id,
          scheduled_date: instance.scheduled_date,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
          carer_id: assignment.carer_id,
          carer_name: user.user_metadata?.full_name || 'You',
          shift_type: assignment.shift_type || 'basic',
          notes: instance.notes || assignment.notes,
          status: instance.status || 'scheduled',
          family_id: assignment.family_id,
          family_name: familyMap[assignment.family_id] || 'Unknown',
          shift_assignment_id: assignment.id,
          shift_instance_id: instance.id
        };
      });

      console.log('✅ [loadAllMyShifts] Transformed shifts:', transformedShifts.length);
      setAllFamiliesShifts(transformedShifts);
    } catch (error) {
      console.error('❌ [loadAllMyShifts] Error loading cross-family shifts:', error);
      toast({
        title: "Error loading shifts",
        description: "Could not load your shifts across families",
        variant: "destructive"
      });
    } finally {
      setLoadingAllFamilies(false);
    }
  };

  // Handle edit shift/leave request click from calendar
  const onEditShift = async (shift: any) => {
    console.log('🟢 Edit shift triggered:', shift);
    console.log('🔍 RECURRING CHECK:', {
      is_recurring: shift.is_recurring,
      shift_assignment_id: shift.shift_assignment_id,
      shift_instance_id: shift.shift_instance_id,
      should_show_options: !!(shift.is_recurring && shift.shift_assignment_id)
    });
    
    // Determine which family this shift belongs to
    const shiftFamilyId = viewMode === 'all-families' && shift.family_id
      ? shift.family_id 
      : familyId;

    // Check user's role in that specific family (for cross-family mode)
    if (viewMode === 'all-families' && shiftFamilyId) {
      const { data: membership } = await supabase
        .from('user_memberships')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('family_id', shiftFamilyId)
        .single();

      // Verify user is assigned to this shift
      if (shift.user_id && shift.user_id !== currentUserId && shift.carer_id !== currentUserId) {
        toast({
          title: "Cannot edit shift",
          description: "You can only edit shifts assigned to you",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validate shift object
    try {
      console.log('🔍 Shift validation check:', {
        has_id: !!shift?.id,
        has_clock_in: !!shift?.clock_in,
        clock_in_type: typeof shift?.clock_in,
        clock_in_valid: shift?.clock_in && !isNaN(new Date(shift.clock_in).getTime()),
        shift_data: shift
      });
      
      if (!shift || !shift.id) {
        throw new Error('Invalid shift data - missing ID');
      }

      // Validate date information exists in either format
      if (shift.clock_in) {
        // Direct time_entry format validation
        if (isNaN(new Date(shift.clock_in).getTime())) {
          throw new Error('Invalid shift data - bad clock_in date');
        }
      } else if (!shift.scheduled_date || !shift.start_time) {
        // Calendar format requires both scheduled_date and start_time
        throw new Error('Invalid shift data - missing date information');
      }
    } catch (error: any) {
      console.error('❌ Error opening shift:', error);
      toast({
        title: 'Error',
        description: error.message || 'Cannot open this shift',
        variant: 'destructive'
      });
      return;
    }
    
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

      console.log('✅ Opening UnifiedShiftForm (leave) with:', leaveEditData);
      setEditingShift(leaveEditData);
      setShowUnifiedShiftForm(true);
      return;
    }
    
    // Carers open unified form in request mode
    if (isCarer && !shift.is_leave_request) {
      console.log('👤 Carer mode: Opening unified form for change request');
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
      
      // Calculate hours properly from start/end times
      let calculatedHours = 8;
      if (shift.start_time && shift.end_time) {
        const parseTime = (t: string) => {
          const parts = t.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
        };
        calculatedHours = (parseTime(shift.end_time) - parseTime(shift.start_time)) / 60;
      } else if (shift.clock_in && shift.clock_out) {
        const start = new Date(shift.clock_in);
        const end = new Date(shift.clock_out);
        calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      
      // Prepare edit data in the expected format
      // Determine source type: shift_instance if it has shift_assignment_id or scheduled_date
      const isShiftInstance = !!(shift.shift_assignment_id || (shift.scheduled_date && !shift.clock_in));
      
      const editData = {
        ...timeEntry,
        carer_id: shift.carer_id || shift.user_id,
        start_date: shift.scheduled_date || shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        hours: calculatedHours.toFixed(1),
        request_type: shift.shift_type || 'basic',
        reason: shift.notes || '',
        source: isShiftInstance ? 'shift_instance' : 'time_entry',
        shift_instance_id: shift.id,
        time_entry_id: shift.time_entry_id || null
      };
      
      console.log('✅ Opening UnifiedShiftForm (carer) with:', editData);
      setEditingShift(editData);
      setShowUnifiedShiftForm(true);
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
          shift_category: 'basic',
          is_recurring: shift.is_recurring || false,
          shift_assignment_id: shift.shift_assignment_id || null,
          shift_instance_id: shift.shift_instance_id || null
        };
        
        console.log('✅ Opening UnifiedShiftForm (new model) with:', editData);
        setEditingShift(editData);
        setShowUnifiedShiftForm(true);
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
          shift_category: 'basic',
          is_recurring: shift.is_recurring || false,
          shift_assignment_id: shift.shift_assignment_id || null,
          shift_instance_id: shift.shift_instance_id || null
        };
        
        console.log('✅ Opening UnifiedShiftForm (transformed) with:', editData);
        setEditingShift(editData);
        setShowUnifiedShiftForm(true);
        return;
      }
      
      // CASE 3: Recurring shift with shift_assignment_id
      if (shift.shift_assignment_id) {
        console.log('🔄 Handling recurring shift from shift_assignment');
        
        const editData = {
          id: shift.id,
          shift_instance_id: shift.shift_instance_id || shift.id,
          carer_id: shift.carer_id,
          request_type: 'basic',
          start_date: shift.scheduled_date,
          start_time: shift.start_time.slice(0, 5),
          end_time: shift.end_time.slice(0, 5),
          hours: Math.round(((new Date(`${shift.scheduled_date}T${shift.end_time}`).getTime() - 
                   new Date(`${shift.scheduled_date}T${shift.start_time}`).getTime()) / (1000 * 60 * 60)) * 100) / 100,
          reason: shift.notes || '',
          shift_type: shift.shift_type || 'basic',
          shift_category: 'basic',
          is_recurring: true,
          shift_assignment_id: shift.shift_assignment_id
        };
        
        console.log('✅ Opening UnifiedShiftForm (recurring) with:', editData);
        setEditingShift(editData);
        setShowUnifiedShiftForm(true);
        return;
      }

      // CASE 4: Fallback error for truly invalid data
      console.warn('⚠️ Cannot edit shift: missing required data');
      toast({
        title: "Cannot Edit Shift",
        description: "This shift cannot be edited (missing required data)",
        variant: "destructive"
      });
      return;
    }
  };

  // Load family count on mount for carers
  useEffect(() => {
    if (isCarer) {
      loadUserFamilyCount();
    }
  }, [isCarer]);

  // Listen for custom event to open add shift form
  useEffect(() => {
    const handleOpenAddShift = () => {
      setShowAssignmentForm(true);
    };

    const handleScheduleEditShift = (event: CustomEvent) => {
      onEditShift(event.detail.shift);
    };

    const handleScheduleAddShift = (event: CustomEvent) => {
      const { date } = event.detail;
      // Clear editing state and set initial date for CREATE mode via React state
      setEditingShift(null);
      setCreateShiftInitialDate(date);
      setShowUnifiedShiftForm(true);
    };

    window.addEventListener('open-add-shift', handleOpenAddShift);
    window.addEventListener('schedule-edit-shift', handleScheduleEditShift);
    window.addEventListener('schedule-add-shift', handleScheduleAddShift);
    return () => {
      window.removeEventListener('open-add-shift', handleOpenAddShift);
      window.removeEventListener('schedule-edit-shift', handleScheduleEditShift);
      window.removeEventListener('schedule-add-shift', handleScheduleAddShift);
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

    // Listen for app-wide refresh events
    const handleAppRefresh = () => {
      if (!cancelled && familyId) {
        console.log('[SchedulingSection] App refresh event received');
        loadSchedulingData(0, undefined, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(APP_REFRESH_EVENT, handleAppRefresh);

    return () => {
      cancelled = true;
      abortController.abort();
      clearTimeout(timeout);
      setLoading(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(APP_REFRESH_EVENT, handleAppRefresh);
    };
  }, [familyId]);

  // Load cross-family data when view mode changes
  useEffect(() => {
    if (viewMode === 'all-families' && isCarer) {
      loadAllMyShifts();
    }
  }, [viewMode, isCarer]);

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

  const loadSchedulingData = async (retryCount = 0, signal?: AbortSignal, isBackgroundRefresh = false) => {
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
      
      // Use subtle refresh indicator for background updates, full loader for initial load
      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

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
          
          // Fetch all carer profiles in one query (using profiles_limited for security)
          const carerUserIds = carerMemberships.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles_limited')
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

      // Load shift change requests - carers only see their own
      let shiftChangeRequestsQuery = supabase
        .from('shift_change_requests')
        .select(`
          *,
          profiles!shift_change_requests_requested_by_fkey (full_name),
          time_entries!shift_change_requests_time_entry_id_fkey (clock_in, clock_out)
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      
      if (isCarerRole) {
        shiftChangeRequestsQuery = shiftChangeRequestsQuery.eq('requested_by', userId);
      }
      
      const { data: shiftChangeData, error: shiftChangeError } = await shiftChangeRequestsQuery;

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

      // Load leave cancellation requests - admins see all, carers see their own
      let cancellationRequestsQuery = supabase
        .from('leave_cancellation_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (isCarerRole) {
        cancellationRequestsQuery = cancellationRequestsQuery.eq('requested_by', userId);
      }
      
      const { data: cancellationRequestsData, error: cancellationError } = await cancellationRequestsQuery;

      if (shiftChangeError) throw shiftChangeError;
      if (leaveRequestsError) throw leaveRequestsError;
      if (cancellationError) {
        console.error('Error loading cancellation requests:', cancellationError);
      }

      // Load shift_instances (recurring shifts) with assignment details
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setFullYear(today.getFullYear() + 1);

      let shiftInstancesQuery = supabase
        .from('shift_instances')
        .select(`
          *,
          shift_assignments!inner (
            id,
            family_id,
            carer_id,
            placeholder_carer_id,
            start_time,
            end_time,
            shift_type,
            notes,
            pending_export,
            original_carer_name,
            profiles!shift_assignments_carer_id_fkey (
              full_name
            ),
            placeholder_carers!shift_assignments_placeholder_carer_id_fkey (
              id,
              full_name
            )
          )
        `)
        .eq('shift_assignments.family_id', familyId)
        .gte('scheduled_date', format(threeMonthsAgo, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(oneYearFromNow, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true });

      if (isCarerRole) {
        shiftInstancesQuery = shiftInstancesQuery.eq('shift_assignments.carer_id', userId);
      }

      const { data: shiftInstancesData, error: instancesError } = await shiftInstancesQuery;
      if (instancesError) {
        console.error('Error loading shift instances:', instancesError);
      }

      // Transform shift_instances to calendar format
      const recurringShifts = (shiftInstancesData || []).map((instance: any) => {
        const assignment = instance.shift_assignments;
        // Get carer name - prefer real carer, fallback to placeholder, then original_carer_name for deleted carers
        const carerName = assignment.carer_id 
          ? (assignment.profiles?.full_name || 'Unknown')
          : assignment.placeholder_carer_id
            ? (assignment.placeholder_carers?.full_name || 'Unknown')
            : assignment.original_carer_name || 'Unassigned';
        
        return {
          id: instance.id,
          shift_assignment_id: assignment.id,
          shift_instance_id: instance.id,
          scheduled_date: instance.scheduled_date,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
          carer_id: assignment.carer_id,
          placeholder_carer_id: assignment.placeholder_carer_id,
          carer_name: carerName,
          placeholder_carer_name: assignment.placeholder_carers?.full_name,
          care_recipient_name: null, // Recurring shifts will rely on careRecipientNameHint prop
          status: instance.status,
          notes: assignment.notes,
          shift_type: assignment.shift_type || 'basic',
          is_recurring: true,
          pending_export: assignment.pending_export || false,
          original_carer_name: assignment.original_carer_name
        };
      });

      // Load all time_entries (one-time shifts and actual clock records) with carer info
      // Add cache-busting filter to force fresh data after deletions
      let timeEntriesQuery = supabase
        .from('time_entries')
        .select('*, profiles!user_id(full_name), shift_instances!shift_instance_id(shift_assignment_id), families!family_id(name)')
        .eq('family_id', familyId)
        .gte('created_at', new Date(0).toISOString()) // Cache buster: always true but forces new query
        .order('clock_in', { ascending: true });

      // For carers, only show their own shifts
      if (isCarerRole) {
        timeEntriesQuery = timeEntriesQuery.eq('user_id', userId);
      }

      const { data: timeEntriesData, error: timeEntriesError } = await timeEntriesQuery;
      if (timeEntriesError) throw timeEntriesError;

      // Transform time_entries (one-time shifts only - exclude those linked to shift_instances)
      const oneTimeShifts = (timeEntriesData || [])
        .filter(entry => !entry.shift_instance_id) // Only include shifts NOT linked to instances
        .map(entry => {
          const shiftAssignmentId = (entry as any).shift_instances?.shift_assignment_id || null;
          return {
            id: entry.id,
            shift_assignment_id: shiftAssignmentId,
            scheduled_date: format(new Date(entry.clock_in), 'yyyy-MM-dd'),
            start_time: format(new Date(entry.clock_in), 'HH:mm:ss'),
            end_time: entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm:ss') : '17:00:00',
            carer_id: entry.user_id,
            carer_name: entry.profiles?.full_name || 'Unknown',
            care_recipient_name: (entry as any).families?.name || null,
            status: 'scheduled',
            notes: entry.notes,
            shift_type: (entry as any).shift_type || 'basic',
            clock_in: entry.clock_in,
            clock_out: entry.clock_out,
            is_recurring: !!shiftAssignmentId
          };
        });

      // Combine both recurring and one-time shifts
      const allShifts = [...recurringShifts, ...oneTimeShifts].sort((a, b) => {
        const dateA = new Date(a.scheduled_date);
        const dateB = new Date(b.scheduled_date);
        return dateA.getTime() - dateB.getTime();
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (signal?.aborted) return;

      setAssignments(assignmentsData || []);
      
      // Combine requests with type information for better handling
      const allRequests = [
        ...(shiftChangeData || []).map(r => ({ 
          ...r, 
          request_source: 'shift_change',
          requester_name: r.profiles?.full_name || 'Unknown',
          original_start: r.time_entries?.clock_in,
          original_end: r.time_entries?.clock_out
        })),
        ...(leaveRequestsData || []).map(r => ({ ...r, request_source: 'leave' }))
      ];
      
      // Auto-archive denied requests older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const oldDeniedRequests = allRequests.filter(r => {
        if (r.status !== 'denied' && r.status !== 'rejected') return false;
        const reviewedAt = r.reviewed_at ? new Date(r.reviewed_at) : null;
        return reviewedAt && reviewedAt < sevenDaysAgo;
      });
      
      // Archive old denied requests in the background
      if (oldDeniedRequests.length > 0) {
        console.log(`🗄️ Auto-archiving ${oldDeniedRequests.length} old denied requests`);
        
        oldDeniedRequests.forEach(async (request) => {
          try {
            if (request.request_source === 'shift_change') {
              await supabase.rpc('archive_change_request', {
                p_request_id: request.id,
                p_archived_by: userId
              });
            } else {
              // For leave requests, delete old denied ones (they can't be archived)
              await supabase
                .from('leave_requests')
                .delete()
                .eq('id', request.id);
            }
          } catch (err) {
            console.error('Error auto-archiving request:', err);
          }
        });
      }
      
      setRequests(allRequests);
      
      // Transform cancellation requests - fetch related time_entries and profiles
      if (cancellationRequestsData && cancellationRequestsData.length > 0) {
        const timeEntryIds = cancellationRequestsData.map(cr => cr.time_entry_id).filter(Boolean);
        const requesterIds = cancellationRequestsData.map(cr => cr.requested_by).filter(Boolean);
        
        // Fetch time entries
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('id, clock_in, shift_type')
          .in('id', timeEntryIds);
        
        // Fetch requester profiles (using profiles_limited for security)
        const { data: requesterProfiles } = await supabase
          .from('profiles_limited')
          .select('id, full_name')
          .in('id', requesterIds);
        
        const transformedCancellations = cancellationRequestsData.map(cr => {
          const timeEntry = timeEntries?.find(te => te.id === cr.time_entry_id);
          const requester = requesterProfiles?.find(p => p.id === cr.requested_by);
          return {
            ...cr,
            requester_name: requester?.full_name || 'Unknown',
            leave_date: timeEntry?.clock_in ? format(new Date(timeEntry.clock_in), 'yyyy-MM-dd') : 'Unknown',
            leave_type: timeEntry?.shift_type || 'leave',
            original_carer_name: requester?.full_name || 'Unknown'
          };
        });
        setCancellationRequests(transformedCancellations);
      } else {
        setCancellationRequests([]);
      }
      
      setInstances(allShifts);
      
      console.log('📊 Loaded scheduling data:', {
        recurringShifts: recurringShifts.length,
        oneTimeShifts: oneTimeShifts.length,
        totalShifts: allShifts.length
      });
      
      // Trigger calendar refresh by updating key
      setCalendarRefreshKey(prev => prev + 1);
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
        setIsRefreshing(false);
      }
    }
  };

  const handleApproveRequest = async (requestId: string, approved: boolean, requestType: 'shift_change' | 'leave') => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      if (requestType === 'shift_change') {
        if (approved) {
          // Use the new RPC to apply change atomically with snapshot
          const { data, error } = await supabase.rpc('apply_change_request', {
            p_request_id: requestId,
            p_applied_by: user.data.user.id
          });

          if (error) throw error;
          
          const result = data as any;
          if (!result?.success) {
            throw new Error(result?.error || 'Failed to apply change');
          }
        } else {
          // Use RPC to deny with audit trail
          const { data, error } = await supabase.rpc('deny_change_request', {
            p_request_id: requestId,
            p_denied_by: user.data.user.id,
            p_reason: null
          });

          if (error) throw error;
        }
      } else {
        // Just update the leave request status
        const { error } = await supabase
          .from('leave_requests')
          .update({ 
            status: approved ? 'approved' : 'denied'
          })
          .eq('id', requestId);

        if (error) throw error;
      }

      toast({
        title: approved ? "Request approved & applied" : "Request denied",
        description: approved 
          ? (requestType === 'shift_change' ? "The shift has been updated with original state saved." : "The leave request has been approved.")
          : "The request has been denied.",
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

  const handleRevertRequest = async (requestId: string, force: boolean = false) => {
    try {
      setIsReverting(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('revert_change_request', {
        p_request_id: requestId,
        p_reverted_by: user.data.user.id,
        p_force: force
      });

      if (error) throw error;

      const result = data as any;
      
      if (!result?.success) {
        if (result?.error === 'CONFLICT') {
          // Show conflict modal
          setConflictData(result.conflicts);
          setConflictRequestId(requestId);
          setConflictModalOpen(true);
          return;
        }
        throw new Error(result?.error || 'Failed to revert change');
      }

      toast({
        title: "Change reverted",
        description: "The shift has been restored to its original state.",
      });

      setConflictModalOpen(false);
      setConflictData(null);
      setConflictRequestId(null);
      await loadSchedulingData();
    } catch (error) {
      console.error('Error reverting request:', error);
      toast({
        title: "Error",
        description: "Failed to revert change request.",
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  const handleArchiveRequest = async (requestId: string, requestType: 'shift_change' | 'leave') => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      if (requestType === 'shift_change') {
        const { data, error } = await supabase.rpc('archive_change_request', {
          p_request_id: requestId,
          p_archived_by: user.data.user.id
        });

        if (error) throw error;
      } else {
        // For leave requests - mark as cancelled (leave_status enum doesn't have 'archived')
        await supabase
          .from('leave_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId);
      }

      toast({
        title: "Request archived",
        description: "The request has been moved to the archive.",
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error archiving request:', error);
      toast({
        title: "Error",
        description: "Failed to archive request.",
        variant: "destructive",
      });
    }
  };

  const handleViewSnapshot = (snapshot: any) => {
    setSelectedSnapshot(snapshot);
    setSnapshotModalOpen(true);
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

  const handleApproveCancellation = async (requestId: string, timeEntryId: string, conflictShiftIds: string[]) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // 1. Revert the leave shift back to basic
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ shift_type: 'basic' })
        .eq('id', timeEntryId);

      if (updateError) throw updateError;

      // 2. Delete all conflicting cover shifts
      if (conflictShiftIds && conflictShiftIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('time_entries')
          .delete()
          .in('id', conflictShiftIds);

        if (deleteError) throw deleteError;
      }

      // 3. Update the cancellation request status
      const { error: statusError } = await supabase
        .from('leave_cancellation_requests')
        .update({ 
          status: 'approved', 
          reviewed_by: user.data.user.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', requestId);

      if (statusError) throw statusError;

      toast({
        title: "Cancellation Approved",
        description: `Leave reverted to basic shift${conflictShiftIds?.length ? ` and ${conflictShiftIds.length} cover shift(s) removed` : ''}`
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast({
        title: "Error",
        description: "Failed to approve cancellation request",
        variant: "destructive"
      });
    }
  };

  const handleDenyCancellation = async (requestId: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('leave_cancellation_requests')
        .update({ 
          status: 'denied', 
          reviewed_by: user.data.user.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Cancellation Denied",
        description: "The leave will remain as scheduled"
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error denying cancellation:', error);
      toast({
        title: "Error",
        description: "Failed to deny cancellation request",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      console.log('🗑️ [Delete Assignment] Starting for:', assignmentId);
      
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      console.log('✅ [Delete Assignment] Database deletion successful');

      await new Promise(resolve => setTimeout(resolve, 100));
      await loadSchedulingData();

      toast({
        title: "Success",
        description: "Shift has been removed from all views",
      });
    } catch (error) {
      console.error('❌ [Delete Assignment] Failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete shift assignment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async (requestId: string, requestType: 'shift_change' | 'leave') => {
    try {
      if (requestType === 'shift_change') {
        const { error, count } = await supabase
          .from('shift_change_requests')
          .delete({ count: 'exact' })
          .eq('id', requestId);
        
        if (error) throw error;
        
        if (count === 0) {
          toast({
            title: "Cannot delete",
            description: "This request may have already been processed or approved",
            variant: "destructive"
          });
          return;
        }
      } else {
        const { error, count } = await supabase
          .from('leave_requests')
          .delete({ count: 'exact' })
          .eq('id', requestId);
        
        if (error) throw error;
        
        if (count === 0) {
          toast({
            title: "Cannot delete",
            description: "This request may have already been processed or approved",
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Request deleted",
        description: `The request has been deleted.`,
      });

      await loadSchedulingData();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: `Failed to delete request.`,
        variant: "destructive",
      });
    }
  };

  const onDeleteShift = async (shiftId: string) => {
    try {
      console.log('🗑️ [Delete] Starting deletion for shift:', shiftId);
      
      // First, verify the shift exists
      const { data: existingShift } = await supabase
        .from('time_entries')
        .select('id, user_id')
        .eq('id', shiftId)
        .single();
      
      if (!existingShift) {
        throw new Error('Shift not found');
      }
      
      console.log('📋 [Delete] Found shift to delete:', existingShift);
      
      // Perform the deletion and check the result
      const { error, count } = await supabase
        .from('time_entries')
        .delete({ count: 'exact' })
        .eq('id', shiftId);

      if (error) {
        console.error('❌ [Delete] Database error:', error);
        throw error;
      }
      
      // Verify that exactly 1 row was deleted
      if (count === 0) {
        throw new Error('Deletion was blocked - no rows were affected. You may not have permission to delete this shift.');
      }

      console.log('✅ [Delete] Database deletion successful, rows affected:', count);

      // Increment data version to bust cache
      setDataVersion(prev => prev + 1);
      
      // Single background refresh with subtle indicator
      await loadSchedulingData(0, undefined, true);
      
      toast({
        title: "Shift deleted",
        description: "The shift has been removed from all views",
      });
      
      console.log('✅ [Delete] Complete');
      
    } catch (error: any) {
      console.error('❌ [Delete] Failed:', error);
      toast({
        title: "Error deleting shift",
        description: error.message || "The shift could not be deleted. Please try again.",
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
    <div className="space-y-6 relative">
      {/* Subtle refresh overlay - doesn't block UI */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm">Refreshing...</span>
          </div>
        </div>
      )}
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <span className="hidden sm:inline ml-2">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center justify-center px-1 py-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Leave</span>
          </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-4">

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        onClick={() => {
                          setEditingShift(null);
                          setCreateShiftInitialDate(null);
                          setShowUnifiedShiftForm(true);
                        }} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-sm">Add Shift</span>
                      </Button>
                      <InviteMembersButton 
                        familyId={familyId}
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2"
                      />
                      <Button 
                        onClick={() => setShowBulkDeleteDialog(true)} 
                        variant="outline"
                        className="h-16 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <Trash2 className="h-5 w-5" />
                        <span className="text-sm">Clear All</span>
                      </Button>
                    </div>
                  </div>



              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveTab('requests')}
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
              {isCarer && (
                <ShiftViewToggle
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  familyCount={userFamilies.length}
                />
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-semibold">Weekly Schedule</h3>
                  {isAdmin && Object.keys(carers).length > 0 && (
                    <Select 
                      value={selectedCarerId || 'all'} 
                      onValueChange={(val) => setSelectedCarerId(val === 'all' ? null : val)}
                    >
                      <SelectTrigger className="w-[140px] sm:w-[180px] h-9 text-sm">
                        <Filter className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <SelectValue placeholder="All Carers" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        <SelectItem value="all">All Carers</SelectItem>
                        {Object.entries(carers).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => setShowMonthView(true)} 
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 min-h-[44px] text-sm"
                  >
                    Month View
                  </Button>
                </div>
              </div>
            </div>
            
            <ScheduleCalendar
              key={calendarRefreshKey}
              familyId={familyId} 
              userRole={userRole}
              careRecipientNameHint={careRecipientNameHint}
              assignments={assignments}
              instances={instances}
              onRefresh={loadSchedulingData}
              onEditShift={canEdit ? onEditShift : undefined}
              viewMode={viewMode}
              allFamiliesShifts={allFamiliesShifts}
              currentUserId={currentUserId || undefined}
              onDeleteShift={onDeleteShift}
              carersMap={carers}
              refreshTrigger={dataVersion}
              selectedCarerId={selectedCarerId}
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
          {/* Pending Time Entries - Admin only */}
          {isAdmin && (
            <PendingTimeEntries 
              familyId={familyId} 
              onUpdate={loadSchedulingData}
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>Pending Requests</CardTitle>
                  <CardDescription>Review shift change and leave requests</CardDescription>
                </div>
                {isCarer && canEdit && (
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
              {(() => {
                // Get pending requests for everyone
                // For carers: also show their own denied requests from last 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                const visibleRequests = requests.filter(r => {
                  // All pending requests
                  if (r.status === 'pending') return true;
                  
                  // Denied requests: only show to the requester for 7 days
                  if (r.status === 'denied' || r.status === 'rejected') {
                    const isDeniedRecently = r.reviewed_at && new Date(r.reviewed_at) > sevenDaysAgo;
                    const isOwnRequest = r.requested_by === currentUserId || r.user_id === currentUserId;
                    return isDeniedRecently && isOwnRequest;
                  }
                  
                  return false;
                });
                
                // Group bundled requests together
                const bundledGroups: Record<string, typeof visibleRequests> = {};
                const unbundledRequests: typeof visibleRequests = [];
                
                visibleRequests.forEach(r => {
                  if (r.bundle_id) {
                    if (!bundledGroups[r.bundle_id]) {
                      bundledGroups[r.bundle_id] = [];
                    }
                    bundledGroups[r.bundle_id].push(r);
                  } else {
                    unbundledRequests.push(r);
                  }
                });
                
                // Create representative requests for bundles (showing date range)
                const bundleRepresentatives = Object.entries(bundledGroups).map(([bundleId, bundledReqs]) => {
                  // Sort by date to get range
                  const sorted = [...bundledReqs].sort((a, b) => {
                    const dateA = a.new_start_time ? new Date(a.new_start_time) : new Date(0);
                    const dateB = b.new_start_time ? new Date(b.new_start_time) : new Date(0);
                    return dateA.getTime() - dateB.getTime();
                  });
                  
                  const firstReq = sorted[0];
                  const lastReq = sorted[sorted.length - 1];
                  const startDate = firstReq.new_start_time ? format(new Date(firstReq.new_start_time), 'yyyy-MM-dd') : '';
                  const endDate = lastReq.new_start_time ? format(new Date(lastReq.new_start_time), 'yyyy-MM-dd') : '';
                  
                  return {
                    ...firstReq,
                    _isBundleRep: true,
                    _bundleCount: bundledReqs.length,
                    _bundleIds: bundledReqs.map(r => r.id),
                    start_date: startDate,
                    end_date: startDate !== endDate ? endDate : undefined,
                    request_type: firstReq.new_shift_type || 'leave'
                  };
                });
                
                const displayRequests = [...unbundledRequests, ...bundleRepresentatives].sort((a, b) => {
                  const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                  const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                  return dateB.getTime() - dateA.getTime(); // Most recent first
                });
                
                const hasPendingCancellations = cancellationRequests.length > 0;
                const hasAnyRequests = displayRequests.length > 0 || hasPendingCancellations;
                
                return !hasAnyRequests ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cancellation Requests */}
                    {cancellationRequests.map((request) => (
                      <CancellationRequestCard
                        key={`cancel-${request.id}`}
                        request={request}
                        isAdmin={isAdmin}
                        onApprove={handleApproveCancellation}
                        onDeny={handleDenyCancellation}
                        timeEntryId={request.time_entry_id}
                      />
                    ))}
                    
                    {/* Shift Change and Leave Requests */}
                    {displayRequests.map((request: any) => (
                      <ChangeRequestCard
                        key={request._isBundleRep ? `bundle-${request.bundle_id}` : request.id}
                        request={request}
                        isAdmin={isAdmin}
                        isCarer={isCarer}
                        onApprove={async () => {
                          // For bundled requests, approve all in the bundle
                          if (request._bundleIds) {
                            for (const id of request._bundleIds) {
                              await handleApproveRequest(id, true, 'shift_change');
                            }
                          } else {
                            await handleApproveRequest(request.id, true, request.request_source || 'leave');
                          }
                        }}
                        onDeny={async () => {
                          // For bundled requests, deny all in the bundle
                          if (request._bundleIds) {
                            for (const id of request._bundleIds) {
                              await handleApproveRequest(id, false, 'shift_change');
                            }
                          } else {
                            await handleApproveRequest(request.id, false, request.request_source || 'leave');
                          }
                        }}
                        onDelete={async () => {
                          // For bundled requests, delete all in the bundle
                          if (request._bundleIds) {
                            for (const id of request._bundleIds) {
                              await handleDeleteRequest(id, 'shift_change');
                            }
                          } else {
                            await handleDeleteRequest(request.id, request.request_source || 'leave');
                          }
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Tab - Upcoming/Taken */}
        <TabsContent value="leave" className="space-y-6">
          <LeaveSection 
            familyId={familyId}
            userRole={userRole}
            currentUserId={currentUserId}
            onScheduleRefresh={loadSchedulingData}
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
          <UnifiedShiftForm
            familyId={familyId}
            userRole={userRole as 'carer' | 'family_admin' | 'disabled_person'}
            careRecipientName={careRecipientNameHint}
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
            onShiftClick={canEdit ? onEditShift : undefined}
            carersMap={carers}
            viewMode={viewMode}
            allFamiliesShifts={allFamiliesShifts}
            currentUserId={currentUserId || undefined}
            loadingAllFamilies={loadingAllFamilies}
            selectedCarerId={selectedCarerId}
          />
        )}

        <ManageCareTeamDialog 
          isOpen={showCareTeamDialog} 
          onClose={() => setShowCareTeamDialog(false)}
          familyId={familyId}
          onScheduleChange={() => loadSchedulingData()}
        />
        

        <ExportTimesheetDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          familyId={familyId}
          userRole={userRole}
        />

        <UnifiedShiftForm
          familyId={familyId}
          userRole={userRole as 'carer' | 'family_admin' | 'disabled_person'}
          editShiftData={editingShift}
          open={showUnifiedShiftForm}
          onOpenChange={(open) => {
            setShowUnifiedShiftForm(open);
            if (!open) {
              setEditingShift(null);
              setCreateShiftInitialDate(null);
            }
          }}
          onSuccess={() => {
            setShowUnifiedShiftForm(false);
            setEditingShift(null);
            setCreateShiftInitialDate(null);
            loadSchedulingData();
          }}
          onCancel={() => {
            setShowUnifiedShiftForm(false);
            setEditingShift(null);
            setCreateShiftInitialDate(null);
          }}
          onDeleteShift={onDeleteShift}
          careRecipientName={careRecipientNameHint}
          initialDate={editingShift ? editingShift.start_date : createShiftInitialDate}
        />

        {/* Snapshot Viewer Modal */}
        <SnapshotViewerModal
          open={snapshotModalOpen}
          onOpenChange={setSnapshotModalOpen}
          snapshot={selectedSnapshot}
        />

        {/* Conflict Resolution Modal */}
        <ConflictResolutionModal
          open={conflictModalOpen}
          onOpenChange={setConflictModalOpen}
          conflicts={conflictData}
          onForceRevert={() => conflictRequestId && handleRevertRequest(conflictRequestId, true)}
          onCancel={() => {
            setConflictModalOpen(false);
            setConflictData(null);
            setConflictRequestId(null);
          }}
          isLoading={isReverting}
        />

        <BulkDeleteShiftsDialog
          isOpen={showBulkDeleteDialog}
          onClose={() => setShowBulkDeleteDialog(false)}
          familyId={familyId}
          mode="all"
          onSuccess={() => loadSchedulingData()}
        />

    </div>
  );
};