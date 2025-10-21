
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
}

interface ShiftSchedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  active?: boolean | null;
}

interface CalendarViewProps {
  familyId: string;
  userRole: string;
}

export const CalendarView = ({ familyId, userRole }: CalendarViewProps) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadData = async () => {
      if (cancelled) return;

      try {
        setLoading(true);

        // 10s timeout
        const timeoutId = setTimeout(() => {
          if (!cancelled) {
            abortController.abort();
            toast({
              title: "Loading timeout",
              description: "Taking longer than expected. Please try again.",
              variant: "destructive"
            });
            setLoading(false);
          }
        }, 10000);

        await loadCalendarData();

        clearTimeout(timeoutId);
      } catch (error: any) {
        if (!cancelled && error.name !== 'AbortError') {
          console.error('Error loading calendar data:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      abortController.abort();
      setLoading(false); // ✅ Immediate UI reset
    };
  }, [familyId, currentWeek]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTimeEntries(),
        loadActiveTimeEntry(),
        loadWeeklyHours()
      ]);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntries = async () => {
    const weekEnd = addDays(weekStart, 7);
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out, notes')
      .eq('family_id', familyId)
      .gte('clock_in', weekStart.toISOString())
      .lt('clock_in', weekEnd.toISOString())
      .order('clock_in', { ascending: true });

    if (error) {
      console.error('Error loading time entries:', error);
      return;
    }

    setTimeEntries(data || []);
  };

  // Temporarily disabled until schema is updated
  // const loadSchedules = async () => {
  //   const { data, error } = await supabase
  //     .from('shift_schedules')
  //     .select('id, title, start_time, end_time, days_of_week, active')
  //     .eq('family_id', familyId)
  //     .eq('active', true);

  //   if (error) {
  //     console.error('Error loading schedules:', error);
  //     return;
  //   }

  //   setSchedules(data || []);
  // };

  const loadActiveTimeEntry = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out, notes')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading active time entry:', error);
      return;
    }

    setActiveTimeEntry(data?.[0] || null);
  };

  const loadWeeklyHours = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const weekEnd = addDays(weekStart, 7);

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .not('clock_out', 'is', null)
      .gte('clock_in', weekStart.toISOString())
      .lt('clock_in', weekEnd.toISOString());

    if (error) {
      console.error('Error loading weekly hours:', error);
      return;
    }

    const totalHours = data?.reduce((total, entry) => {
      const start = new Date(entry.clock_in);
      const end = new Date(entry.clock_out!);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0) || 0;

    setWeeklyHours(Math.round(totalHours * 10) / 10);
  };

  const handleClockIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          family_id: familyId,
          clock_in: new Date().toISOString(),
          notes: 'Shift started'
        });

      if (error) throw error;

      toast({
        title: "Clocked in",
        description: "Your shift has started",
      });

      loadCalendarData();
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive",
      });
    }
  };

  const handleClockOut = async () => {
    if (!activeTimeEntry) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeTimeEntry.id);

      if (error) throw error;

      toast({
        title: "Clocked out",
        description: "Your shift has ended",
      });

      loadCalendarData();
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    }
  };

  const getEntriesForDay = (day: Date) => {
    return timeEntries.filter(entry => 
      isSameDay(parseISO(entry.clock_in), day)
    );
  };

  const getSchedulesForDay = (day: Date) => {
    // Temporarily return empty array until schema is updated
    return [];
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading calendar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Clock In/Out Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {activeTimeEntry 
                ? `Clocked in at ${format(parseISO(activeTimeEntry.clock_in), 'HH:mm')}`
                : `This week: ${weeklyHours} hours`
              }
            </p>
          </div>
          {activeTimeEntry ? (
            <Button onClick={handleClockOut} variant="destructive">
              <Clock className="w-4 h-4 mr-2" />
              Clock Out
            </Button>
          ) : (
            <Button onClick={handleClockIn}>
              <Clock className="w-4 h-4 mr-2" />
              Clock In
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Weekly Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Schedule
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              >
                Previous Week
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                Next Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const dayEntries = getEntriesForDay(day);
              const daySchedules = getSchedulesForDay(day);
              
              return (
                <div key={index} className="border rounded-lg p-2 min-h-32">
                  <div className="font-medium text-sm mb-2">
                    {format(day, 'EEE d')}
                  </div>
                  
                  {/* Scheduled shifts */}
                  {daySchedules.map((schedule) => (
                    <Badge key={schedule.id} variant="outline" className="text-xs mb-1 block">
                      {schedule.start_time} - {schedule.end_time}
                      <br />
                      {schedule.title}
                    </Badge>
                  ))}
                  
                  {/* Actual time entries */}
                  {dayEntries.map((entry) => (
                    <Badge key={entry.id} variant="default" className="text-xs mb-1 block">
                      {format(parseISO(entry.clock_in), 'HH:mm')}
                      {entry.clock_out && ` - ${format(parseISO(entry.clock_out), 'HH:mm')}`}
                    </Badge>
                  ))}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-1 h-6 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
