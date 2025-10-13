import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Play, Square } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClockInOutProps {
  familyId: string;
  onUpdate: () => void;
}

export const ClockInOut = ({ familyId, onUpdate }: ClockInOutProps) => {
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [manualEntry, setManualEntry] = useState({
    start_time: '',
    end_time: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveEntry();
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
        .is('end_time', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setActiveEntry(data);
    } catch (error) {
      console.error('Error loading active entry:', error);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          family_id: familyId,
          user_id: user.data.user.id,
          start_time: new Date().toISOString(),
          shift_type: 'variable'
        });

      if (error) throw error;

      toast({
        title: "Clocked In",
        description: "Your shift has started",
      });

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
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      toast({
        title: "Clocked Out",
        description: "Your shift has ended",
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

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          family_id: familyId,
          user_id: user.data.user.id,
          start_time: manualEntry.start_time,
          end_time: manualEntry.end_time,
          notes: manualEntry.notes || null,
          shift_type: 'variable'
        });

      if (error) throw error;

      toast({
        title: "Entry Added",
        description: "Manual time entry created successfully",
      });

      setManualEntry({ start_time: '', end_time: '', notes: '' });
      setShowManualEntry(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating manual entry:', error);
      toast({
        title: "Error",
        description: "Failed to create manual entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    const start = new Date(activeEntry.start_time);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>
            Clock in and out or add manual time entries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEntry ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-600 mb-2">Currently clocked in</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatTime(activeEntry.start_time)}
                </div>
                <div className="text-sm text-green-600">
                  Elapsed: {getElapsedTime()}
                </div>
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
            <div className="text-center space-y-4">
              <Button 
                onClick={handleClockIn}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Clocking In...' : 'Clock In'}
              </Button>
              
              <div className="text-sm text-muted-foreground">or</div>
              
              <Button 
                onClick={() => setShowManualEntry(!showManualEntry)}
                variant="outline"
                className="w-full"
              >
                Add Manual Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showManualEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Time Entry</CardTitle>
            <CardDescription>
              Add a completed shift manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={manualEntry.start_time}
                    onChange={(e) => setManualEntry(prev => ({ 
                      ...prev, 
                      start_time: e.target.value 
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={manualEntry.end_time}
                    onChange={(e) => setManualEntry(prev => ({ 
                      ...prev, 
                      end_time: e.target.value 
                    }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={manualEntry.notes}
                  onChange={(e) => setManualEntry(prev => ({ 
                    ...prev, 
                    notes: e.target.value 
                  }))}
                  placeholder="Describe the work completed..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowManualEntry(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};