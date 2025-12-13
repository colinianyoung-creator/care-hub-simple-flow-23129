import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { Tables } from "@/integrations/supabase/types";

type BodyLog = Tables<'body_logs'> & {
  profiles?: {
    full_name: string | null;
  } | null;
};

interface BodyMapArchiveSectionProps {
  familyId: string;
  userRole: string;
  onUnarchive?: () => void;
}

export const BodyMapArchiveSection: React.FC<BodyMapArchiveSectionProps> = ({
  familyId,
  userRole,
  onUnarchive
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<BodyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadData = async () => {
      if (cancelled || !familyId) return;
      if (isRangeMode && rangeStart && rangeEnd) {
        await loadEntriesForDate(rangeStart, rangeEnd, abortController.signal);
      } else {
        await loadEntriesForDate(selectedDate, selectedDate, abortController.signal);
      }
    };

    loadData();

    return () => {
      cancelled = true;
      abortController.abort();
      setLoading(false);
    };
  }, [familyId, selectedDate, isRangeMode, rangeStart, rangeEnd]);

  const loadEntriesForDate = async (startDate: Date, endDate: Date, signal?: AbortSignal) => {
    if (!familyId) return;

    setLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      timeoutId = setTimeout(() => {
        if (!signal?.aborted) {
          toast({
            title: 'Loading timeout',
            description: 'Taking longer than expected.',
            variant: 'destructive',
          });
        }
      }, 10000);

      const start = startOfDay(startDate);
      const end = endOfDay(endDate);

      const { data, error } = await supabase
        .from('body_logs')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', true)
        .gte('incident_datetime', start.toISOString())
        .lte('incident_datetime', end.toISOString())
        .order('incident_datetime', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;

      // Get unique author IDs
      const authorIds = [...new Set(data?.map(log => log.created_by) || [])];

      // Fetch profiles for all authors
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);

      // Create a map of profile data
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Merge profiles with logs
      const logsWithProfiles = data?.map(log => ({
        ...log,
        profiles: profilesMap.get(log.created_by) || null
      })) || [];

      setEntries(logsWithProfiles);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error loading entries',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleUnarchive = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('body_logs')
        .update({ is_archived: false })
        .eq('id', logId);

      if (error) throw error;

      toast({
        title: 'Log Restored',
        description: 'The injury log has been restored to active status.',
      });

      // Reload entries
      if (isRangeMode && rangeStart && rangeEnd) {
        loadEntriesForDate(rangeStart, rangeEnd);
      } else {
        loadEntriesForDate(selectedDate, selectedDate);
      }
      
      // Notify parent to reload active logs
      onUnarchive?.();
    } catch (error: any) {
      toast({
        title: 'Error restoring log',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    setIsRangeMode(false);
    setRangeStart(undefined);
    setRangeEnd(undefined);
  };

  const handleQuickRange = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    switch (type) {
      case 'today':
        setIsRangeMode(false);
        setSelectedDate(today);
        break;
      case 'week':
        setIsRangeMode(true);
        setRangeStart(startOfWeek(today, { weekStartsOn: 1 }));
        setRangeEnd(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'month':
        setIsRangeMode(true);
        setRangeStart(startOfMonth(today));
        setRangeEnd(endOfMonth(today));
        break;
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setIsRangeMode(false);
    setRangeStart(undefined);
    setRangeEnd(undefined);
  };

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();

  // Group entries by date when in range mode
  const groupedEntries = isRangeMode 
    ? entries.reduce((acc, entry) => {
        const dateKey = format(new Date(entry.incident_datetime), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
      }, {} as Record<string, BodyLog[]>)
    : null;

  const renderEntryCard = (entry: BodyLog) => (
    <Card key={entry.id}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            {/* Timestamp and View */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <p className="text-sm font-medium">
                {format(new Date(entry.incident_datetime), 'MMM d, yyyy')} at {format(new Date(entry.incident_datetime), 'h:mm a')}
              </p>
              <Badge variant="outline" className="w-fit">
                {entry.view_type === 'front' ? '🧍 Front' : '🧍‍♂️ Back'}
              </Badge>
            </div>

            {/* Author */}
            <p className="text-xs text-muted-foreground">
              Logged by: {entry.profiles?.full_name || 'Unknown User'}
            </p>

            {/* Body Location and Severity */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="font-semibold text-sm">{entry.body_location}</div>
              <Badge 
                variant={
                  entry.type_severity.includes('Severe') || 
                  entry.type_severity.includes('Stage 3') || 
                  entry.type_severity.includes('Stage 4') || 
                  entry.type_severity.includes('3rd degree') 
                    ? 'destructive'
                    : entry.type_severity.includes('Moderate') || 
                      entry.type_severity.includes('Stage 2') || 
                      entry.type_severity.includes('2nd degree')
                    ? 'default'
                    : 'secondary'
                }
              >
                {entry.type_severity}
              </Badge>
            </div>

            {/* Description */}
            {entry.description && (
              <p className="text-sm text-muted-foreground">
                {entry.description}
              </p>
            )}
          </div>

          {/* Unarchive button */}
          {userRole !== 'family_viewer' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnarchive(entry.id)}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restore
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={isMobile ? "min-w-[100px] px-2 justify-center gap-1" : "min-w-[180px] justify-center gap-2"}>
                  <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                  {isRangeMode && rangeStart && rangeEnd ? (
                    <span className="text-xs sm:text-sm truncate">
                      {format(rangeStart, 'MMM d')} - {format(rangeEnd, isMobile ? 'MMM d' : 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {format(selectedDate, isMobile ? 'MMM d' : 'MMMM d, yyyy')}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <div className="p-3 border-b space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => handleQuickRange('today')} className="text-xs">
                      Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickRange('week')} className="text-xs">
                      This Week
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleQuickRange('month')} className="text-xs">
                      This Month
                    </Button>
                  </div>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleCalendarSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isToday && !isRangeMode && (
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToToday}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Entries */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading archived entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No archived body map entries for this {isRangeMode ? 'period' : 'date'}.
        </div>
      ) : isRangeMode && groupedEntries ? (
        <div className="space-y-6">
          {Object.entries(groupedEntries)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dateEntries]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground border-b pb-1">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-3">
                  {dateEntries.map(renderEntryCard)}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(renderEntryCard)}
        </div>
      )}
    </div>
  );
};
