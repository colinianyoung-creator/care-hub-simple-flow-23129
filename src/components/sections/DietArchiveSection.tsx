import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { format, startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface DietEntry {
  id: string;
  meal_type: string;
  description: string;
  portion_left: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  entry_date: string;
  created_by: string;
  profiles?: {
    full_name: string | null;
  };
}

interface DietArchiveSectionProps {
  familyId: string | null;
  userRole?: string;
  currentUserId?: string;
}

export const DietArchiveSection: React.FC<DietArchiveSectionProps> = ({
  familyId,
  userRole,
  currentUserId
}) => {
  // Early return if no family ID
  if (!familyId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No family selected. Please join or create a family first.
          </div>
        </CardContent>
      </Card>
    );
  }

  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewingImage, setViewingImage] = useState<string | null>(null);
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

      const { data, error } = await supabase
        .from('diet_entries')
        .select('*, profiles:created_by(full_name)')
        .eq('family_id', familyId)
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(endDate, 'yyyy-MM-dd'))
        .order('entry_date', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      setEntries(data as any || []);
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

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('diet_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: 'Entry deleted',
        description: 'Diet entry has been deleted successfully.',
      });

      if (isRangeMode && rangeStart && rangeEnd) {
        loadEntriesForDate(rangeStart, rangeEnd);
      } else {
        loadEntriesForDate(selectedDate, selectedDate);
      }
    } catch (error: any) {
      toast({
        title: 'Error deleting entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const canDeleteEntry = (entry: DietEntry) => {
    return currentUserId && entry.created_by === currentUserId && userRole !== 'family_viewer';
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

  // Group entries by date and meal type
  const groupEntriesByDateAndMeal = (entries: DietEntry[]) => {
    const byDate: Record<string, Record<string, DietEntry[]>> = {};
    entries.forEach(entry => {
      const dateKey = entry.entry_date;
      const mealType = entry.meal_type || 'other';
      if (!byDate[dateKey]) byDate[dateKey] = {};
      if (!byDate[dateKey][mealType]) byDate[dateKey][mealType] = [];
      byDate[dateKey][mealType].push(entry);
    });
    return byDate;
  };

  const groupedEntries = isRangeMode 
    ? groupEntriesByDateAndMeal(entries)
    : null;

  const singleDayGrouped = !isRangeMode 
    ? entries.reduce((acc, entry) => {
        const mealType = entry.meal_type || 'other';
        if (!acc[mealType]) acc[mealType] = [];
        acc[mealType].push(entry);
        return acc;
      }, {} as Record<string, DietEntry[]>)
    : null;

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks', 'other'];

  const renderEntryCard = (entry: DietEntry) => (
    <Card key={entry.id}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{entry.description}</span>
              {entry.photo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingImage(entry.photo_url)}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            {entry.portion_left && (
              <p className="text-sm text-muted-foreground">
                Portion left: {entry.portion_left}
              </p>
            )}
            {entry.notes && (
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(entry.created_at), 'h:mm a')} by{' '}
              {entry.profiles?.full_name || 'Unknown'}
            </p>
          </div>
          {canDeleteEntry(entry) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteEntry(entry.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {isRangeMode && rangeStart && rangeEnd ? (
                    <span className="text-sm">
                      {format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm font-medium">
                      {format(selectedDate, 'MMMM d, yyyy')}
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

            <Button variant="outline" size="sm" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isToday && !isRangeMode && (
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No diet entries for this {isRangeMode ? 'period' : 'date'}.
        </div>
      ) : isRangeMode && groupedEntries ? (
        <div className="space-y-6">
          {Object.entries(groupedEntries)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, mealGroups]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground border-b pb-1">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-4">
                  {mealTypes.map((mealType) => {
                    const mealEntries = mealGroups[mealType];
                    if (!mealEntries || mealEntries.length === 0) return null;

                    return (
                      <div key={mealType}>
                        <h4 className="text-sm font-medium capitalize mb-2">{mealType}</h4>
                        <div className="space-y-3">
                          {mealEntries.map(renderEntryCard)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : singleDayGrouped ? (
        <div className="space-y-6">
          {mealTypes.map((mealType) => {
            const mealEntries = singleDayGrouped[mealType];
            if (!mealEntries || mealEntries.length === 0) return null;

            return (
              <div key={mealType}>
                <h3 className="text-lg font-semibold capitalize mb-3">{mealType}</h3>
                <div className="space-y-3">
                  {mealEntries.map(renderEntryCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ImageViewer
        imageUrl={viewingImage}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        alt="Diet entry photo"
      />
    </div>
  );
};
