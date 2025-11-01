import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { format, startOfDay, endOfDay } from 'date-fns';

interface DietEntry {
  id: string;
  meal_type: string;
  description: string;
  portion_left: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
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

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const loadData = async () => {
      if (cancelled || !familyId) return;
      await loadEntriesForDate(selectedDate, abortController.signal);
    };

    loadData();

    return () => {
      cancelled = true;
      abortController.abort();
      setLoading(false);
    };
  }, [familyId, selectedDate]);

  const loadEntriesForDate = async (date: Date, signal?: AbortSignal) => {
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

      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const { data, error } = await supabase
        .from('diet_entries')
        .select('*, profiles:created_by(full_name)')
        .eq('family_id', familyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
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

      loadEntriesForDate(selectedDate);
    } catch (error: any) {
      toast({
        title: 'Error deleting entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const canDeleteEntry = (entry: DietEntry) => {
    return currentUserId && entry.created_by === currentUserId;
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();

  const groupedEntries = entries.reduce((acc, entry) => {
    const mealType = entry.meal_type || 'other';
    if (!acc[mealType]) acc[mealType] = [];
    acc[mealType].push(entry);
    return acc;
  }, {} as Record<string, DietEntry[]>);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </div>

            <div className="flex gap-2">
              {!isToday && (
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={goToNextDay} disabled={isToday}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No diet entries for this date.
        </div>
      ) : (
        <div className="space-y-6">
          {mealTypes.map((mealType) => {
            const mealEntries = groupedEntries[mealType];
            if (!mealEntries || mealEntries.length === 0) return null;

            return (
              <div key={mealType}>
                <h3 className="text-lg font-semibold capitalize mb-3">{mealType}</h3>
                <div className="space-y-3">
                  {mealEntries.map((entry) => (
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImageViewer
        imageUrl={viewingImage}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        alt="Diet entry photo"
      />
    </div>
  );
};
