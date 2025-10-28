import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { format, startOfDay, endOfDay } from 'date-fns';

interface MoneyEntry {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
  user_profile?: {
    full_name: string | null;
  };
  payer_profile?: {
    full_name: string | null;
  };
}

interface MoneyArchiveSectionProps {
  familyId: string | null;
  userRole?: string;
  currentUserId?: string;
}

export const MoneyArchiveSection: React.FC<MoneyArchiveSectionProps> = ({
  familyId,
  userRole,
  currentUserId
}) => {
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
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
        .from('money_records')
        .select(`
          *,
          payer_profile:profiles!money_records_created_by_fkey(full_name)
        `)
        .eq('family_id', familyId)
        .gte('transaction_date', format(date, 'yyyy-MM-dd'))
        .lte('transaction_date', format(date, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .abortSignal(signal) as any;

      if (error) throw error;
      setEntries((data || []) as any);
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
        .from('money_records')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: 'Entry deleted',
        description: 'Money entry has been deleted successfully.',
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

  const canDeleteEntry = (entry: MoneyEntry) => {
    return !!familyId;
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

  const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

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

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total: £{totalAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No money entries for this date.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.description}</span>
                      <span className="font-semibold">£{Number(entry.amount).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Paid by: {entry.payer_profile?.full_name || 'Unknown'}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                    {entry.photo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingImage(entry.photo_url)}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        View Receipt
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'h:mm a')} by{' '}
                      {entry.user_profile?.full_name || 'Unknown'}
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
      )}

      <ImageViewer
        imageUrl={viewingImage}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        alt="Money receipt"
      />
    </div>
  );
};
