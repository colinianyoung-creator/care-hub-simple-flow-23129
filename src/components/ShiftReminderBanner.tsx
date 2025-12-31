import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, CalendarClock, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { AttendanceMode } from "@/lib/shiftUtils";

interface TodayShift {
  id: string;
  start_time: string;
  end_time: string;
  attendance_mode: AttendanceMode;
}

interface ShiftReminderBannerProps {
  familyId: string;
  onClockTabClick?: () => void;
}

export const ShiftReminderBanner = ({ familyId, onClockTabClick }: ShiftReminderBannerProps) => {
  const [todayShift, setTodayShift] = useState<TodayShift | null>(null);
  const [hasActiveEntry, setHasActiveEntry] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTodayShiftAndClockIn();
  }, [familyId]);

  const checkTodayShiftAndClockIn = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user || !familyId) {
        setLoading(false);
        return;
      }

      const today = format(new Date(), 'yyyy-MM-dd');

      // Get today's shift instances for this carer
      const { data: shifts, error: shiftsError } = await supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: today,
          _end_date: today
        });

      if (shiftsError) throw shiftsError;

      // Find shift assigned to current user that requires clock-in
      const myShift = (shifts || []).find(
        (s: any) => s.carer_id === user.data.user!.id && s.attendance_mode !== 'none'
      );

      // Check if user already has an active time entry today
      const { data: activeEntry, error: entryError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', user.data.user.id)
        .is('clock_out', null)
        .maybeSingle();

      if (entryError) throw entryError;

      setTodayShift(myShift ? {
        id: myShift.id,
        start_time: myShift.start_time,
        end_time: myShift.end_time,
        attendance_mode: myShift.attendance_mode as AttendanceMode
      } : null);
      
      setHasActiveEntry(!!activeEntry);
    } catch (error) {
      console.error('Error checking shift reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if loading, dismissed, no shift requiring clock-in, or already clocked in
  if (loading || dismissed || !todayShift || hasActiveEntry) {
    return null;
  }

  return (
    <Alert className="bg-primary/10 border-primary/20 relative">
      <CalendarClock className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pr-8">
        <span>
          You have a shift today at <strong>{todayShift.start_time.slice(0, 5)}</strong> – don't forget to clock in!
        </span>
        {onClockTabClick && (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={onClockTabClick}
            className="w-fit"
          >
            <Clock className="h-4 w-4 mr-1" />
            Go to Clock
          </Button>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};