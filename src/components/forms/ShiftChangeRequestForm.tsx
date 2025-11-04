import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface ShiftChangeRequestFormProps {
  timeEntry: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    family_id: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ShiftChangeRequestForm = ({ timeEntry, open, onOpenChange, onSuccess, onCancel }: ShiftChangeRequestFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    // Safe initialization even if timeEntry is invalid
    if (!timeEntry?.id || !timeEntry?.clock_in) {
      return {
        new_start_time: '',
        new_end_time: '',
        reason: ''
      };
    }
    
    try {
      // Defensive date parsing to prevent crashes
      const clockIn = new Date(timeEntry.clock_in);
      const clockOut = new Date(timeEntry.clock_out || timeEntry.clock_in);
      
      // Validate dates
      if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
        console.error('Invalid dates in timeEntry:', timeEntry);
        return {
          new_start_time: '',
          new_end_time: '',
          reason: ''
        };
      }
      
      return {
        new_start_time: format(clockIn, "yyyy-MM-dd'T'HH:mm"),
        new_end_time: format(clockOut, "yyyy-MM-dd'T'HH:mm"),
        reason: ''
      };
    } catch (error) {
      console.error('Failed to parse shift dates:', error);
      return {
        new_start_time: '',
        new_end_time: '',
        reason: ''
      };
    }
  });
  
  // Don't render if not actually opening or no valid data
  if (!open || !timeEntry?.id) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form has valid data before submitting
    if (!formData.new_start_time || !formData.new_end_time) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter valid start and end times',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('shift_change_requests')
        .insert({
          family_id: timeEntry.family_id,
          time_entry_id: timeEntry.id,
          requested_by: user.id,
          new_start_time: formData.new_start_time,
          new_end_time: formData.new_end_time,
          reason: formData.reason || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your shift change request has been submitted for admin review"
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast({
        title: "Error",
        description: "Failed to submit change request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Shift Change</DialogTitle>
          <DialogDescription>
            Submit a request to modify your shift times. An admin will review and approve or deny your request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="new_start_time">New Start Time</Label>
            <Input
              id="new_start_time"
              type="datetime-local"
              value={formData.new_start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, new_start_time: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_end_time">New End Time</Label>
            <Input
              id="new_end_time"
              type="datetime-local"
              value={formData.new_end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, new_end_time: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Explain why you need to change these times..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
