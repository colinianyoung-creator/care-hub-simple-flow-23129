import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface PendingTimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  shift_type: string;
  profiles: { full_name: string } | null;
}

interface PendingTimeEntriesProps {
  familyId: string;
  onUpdate?: () => void;
}

export const PendingTimeEntries = ({ familyId, onUpdate }: PendingTimeEntriesProps) => {
  const [entries, setEntries] = useState<PendingTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingEntries();
  }, [familyId]);

  const loadPendingEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          clock_in,
          clock_out,
          notes,
          shift_type,
          profiles!user_id(full_name)
        `)
        .eq('family_id', familyId)
        .eq('approval_status', 'pending')
        .not('clock_out', 'is', null) // Only show completed entries
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading pending entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .update({
          approval_status: 'approved',
          approved_by: user.data.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Approved",
        description: "The time entry has been approved for payroll",
      });

      loadPendingEntries();
      onUpdate?.();
    } catch (error) {
      console.error('Error approving entry:', error);
      toast({
        title: "Error",
        description: "Failed to approve the entry",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .update({
          approval_status: 'denied',
          approved_by: user.data.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Denied",
        description: "The time entry has been denied",
      });

      loadPendingEntries();
      onUpdate?.();
    } catch (error) {
      console.error('Error denying entry:', error);
      toast({
        title: "Error",
        description: "Failed to deny the entry",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const calculateHours = (clockIn: string, clockOut: string | null): string => {
    if (!clockOut) return 'In progress';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(2)} hrs`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin h-5 w-5 mr-2" />
          <span className="text-muted-foreground">Loading pending entries...</span>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return null; // Don't render anything if no pending entries
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Pending Time Entries</CardTitle>
        </div>
        <CardDescription>
          Unscheduled clock-ins requiring approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <div 
            key={entry.id} 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {entry.profiles?.full_name || 'Unknown Carer'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(entry.clock_in), 'EEE, d MMM yyyy')} • {' '}
                {format(new Date(entry.clock_in), 'HH:mm')}
                {entry.clock_out && ` - ${format(new Date(entry.clock_out), 'HH:mm')}`}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {calculateHours(entry.clock_in, entry.clock_out)}
                </Badge>
                {entry.notes && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    "{entry.notes}"
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeny(entry.id)}
                disabled={processingId === entry.id}
                className="text-destructive hover:text-destructive"
              >
                {processingId === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Deny</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(entry.id)}
                disabled={processingId === entry.id}
              >
                {processingId === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Approve</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};