import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, CheckCircle, Info, AlertTriangle, CalendarClock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AttendanceModeBadge, type AttendanceMode } from "@/components/AttendanceModeSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { roundToNearestQuarterHour } from "@/lib/shiftUtils";
import { format } from 'date-fns';

interface TodayShift {
  id: string;
  shift_instance_id: string;
  attendance_mode: AttendanceMode;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  carer_name: string;
  shift_type: string;
}

interface ClockInOutProps {
  familyId: string;
  onUpdate: () => void;
  currentShiftInstance?: {
    id: string;
    attendance_mode: AttendanceMode;
    scheduled_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

export const ClockInOut = ({ familyId, onUpdate, currentShiftInstance }: ClockInOutProps) => {
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [todayShifts, setTodayShifts] = useState<TodayShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);
  const { toast } = useToast();

  // Get today's shift requiring clock-in (if any)
  const shiftRequiringClockIn = todayShifts.find(s => s.attendance_mode !== 'none');
  const hasScheduledShiftToday = todayShifts.length > 0;

  useEffect(() => {
    loadActiveEntry();
    loadTodayShifts();
  }, [familyId]);

  const loadActiveEntry = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('family_id', familyId)
        .eq('user_id', user.data.user.id)
        .is('clock_out', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setActiveEntry(data);
    } catch (error) {
      console.error('Error loading active entry:', error);
    }
  };

  const loadTodayShifts = async () => {
    try {
      setLoadingShifts(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const today = format(new Date(), 'yyyy-MM-dd');

      // Get today's shift instances assigned to this carer
      const { data, error } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: today,
          _end_date: today
        });

      if (error) throw error;

      // Filter to only this carer's shifts
      const myShifts = (data || [])
        .filter((shift: any) => shift.carer_id === user.data.user!.id)
        .map((shift: any) => ({
          id: shift.shift_assignment_id,
          shift_instance_id: shift.id,
          attendance_mode: shift.attendance_mode as AttendanceMode,
          scheduled_date: shift.scheduled_date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          carer_name: shift.carer_name,
          shift_type: shift.shift_type || 'basic'
        }));

      setTodayShifts(myShifts);
    } catch (error) {
      console.error('Error loading today\'s shifts:', error);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleClockIn = async (forShift?: TodayShift) => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Round clock-in time to nearest quarter hour
      const roundedTime = roundToNearestQuarterHour(new Date());
      
      // Determine if this is a scheduled or unscheduled clock-in
      const isScheduled = !!forShift;
      const approvalStatus = isScheduled ? 'auto_approved' : 'pending';

      const { error } = await supabase
        .from('time_entries')
        .insert({
          family_id: familyId,
          user_id: user.data.user.id,
          clock_in: roundedTime.toISOString(),
          shift_instance_id: forShift?.shift_instance_id || null,
          shift_type: forShift?.shift_type || 'basic',
          approval_status: approvalStatus,
          is_unscheduled: !isScheduled
        });

      if (error) throw error;

      if (!isScheduled) {
        toast({
          title: "Clocked In (Pending Approval)",
          description: `Your unscheduled clock-in at ${format(roundedTime, 'HH:mm')} will need admin approval`,
          variant: "default",
        });
      } else {
        toast({
          title: "Clocked In",
          description: `Your shift started at ${format(roundedTime, 'HH:mm')}`,
        });
      }

      loadActiveEntry();
      onUpdate();
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (notes?: string) => {
    if (!activeEntry) return;
    
    setLoading(true);
    try {
      // Round clock-out time to nearest quarter hour
      const roundedTime = roundToNearestQuarterHour(new Date());

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: roundedTime.toISOString(),
          notes: notes || null
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      toast({
        title: "Clocked Out",
        description: `Your shift ended at ${format(roundedTime, 'HH:mm')}`,
      });

      setActiveEntry(null);
      onUpdate();
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentShiftInstance) return;
    
    setMarkingComplete(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('shift_instances')
        .update({
          completed_at: new Date().toISOString(),
          completed_by: user.data.user.id,
          status: 'completed'
        })
        .eq('id', currentShiftInstance.id);

      if (error) throw error;

      toast({
        title: "Shift Marked Complete",
        description: "The shift has been recorded as completed",
      });

      onUpdate();
    } catch (error) {
      console.error('Error marking shift complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark shift as complete",
        variant: "destructive",
      });
    } finally {
      setMarkingComplete(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getElapsedTime = () => {
    if (!activeEntry) return '';
    const start = new Date(activeEntry.clock_in);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // For 'none' mode with currentShiftInstance, show simplified "Mark Complete" interface
  if (currentShiftInstance && currentShiftInstance.attendance_mode === 'none') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Shift Completion
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <AttendanceModeBadge mode="none" />
              No clock-in required for this shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This shift uses scheduled hours for pay. You can mark it complete when finished.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Date:</span> {currentShiftInstance.scheduled_date}</div>
                <div><span className="font-medium">Time:</span> {currentShiftInstance.start_time} - {currentShiftInstance.end_time}</div>
              </div>
            </div>

            <Button 
              onClick={handleMarkComplete}
              disabled={markingComplete}
              className="w-full"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {markingComplete ? 'Marking Complete...' : 'Mark Shift Complete'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main clock-in/out interface
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>
            Clock in and out to track your work hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingShifts ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading today's shifts...
            </div>
          ) : activeEntry ? (
            // Currently clocked in
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 mb-2">Currently clocked in</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatTime(activeEntry.clock_in)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Elapsed: {getElapsedTime()}
                </div>
                {activeEntry.is_unscheduled && (
                  <Badge variant="outline" className="mt-2 border-amber-500 text-amber-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Pending Approval
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clock-out-notes">Notes (optional)</Label>
                <Textarea
                  id="clock-out-notes"
                  placeholder="Add any notes about your shift..."
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={() => {
                  const notes = (document.getElementById('clock-out-notes') as HTMLTextAreaElement)?.value;
                  handleClockOut(notes);
                }}
                disabled={loading}
                className="w-full"
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            </div>
          ) : (
            // Not clocked in - show options
            <div className="space-y-4">
              {/* Show scheduled shift if exists and requires clock-in */}
              {shiftRequiringClockIn && (
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <span className="font-medium">Today's Shift</span>
                    <AttendanceModeBadge mode={shiftRequiringClockIn.attendance_mode} />
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {shiftRequiringClockIn.start_time.slice(0, 5)} - {shiftRequiringClockIn.end_time.slice(0, 5)}
                  </div>
                  <Button 
                    onClick={() => handleClockIn(shiftRequiringClockIn)}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {loading ? 'Clocking In...' : 'Clock In for Shift'}
                  </Button>
                </div>
              )}

              {/* Always show option to clock in (unscheduled if no shift) */}
              <div className={shiftRequiringClockIn ? 'pt-2 border-t' : ''}>
                {!shiftRequiringClockIn && hasScheduledShiftToday && (
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your shift today doesn't require clock-in (using scheduled hours for pay).
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={() => handleClockIn()}
                  disabled={loading}
                  variant={shiftRequiringClockIn ? "outline" : "default"}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Clocking In...' : (
                    shiftRequiringClockIn || hasScheduledShiftToday 
                      ? 'Clock In (Unscheduled)' 
                      : 'Clock In'
                  )}
                </Button>
                
                {(!shiftRequiringClockIn && !hasScheduledShiftToday) && (
                  <Alert className="mt-3" variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No shift scheduled today. This clock-in will need admin approval.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};