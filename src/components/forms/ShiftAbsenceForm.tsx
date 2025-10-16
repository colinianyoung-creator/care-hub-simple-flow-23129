import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShiftAbsenceFormProps {
  familyId: string;
  userRole: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ShiftAbsenceForm = ({ familyId, userRole, onSuccess, onCancel }: ShiftAbsenceFormProps) => {
  const [formData, setFormData] = useState({
    type: '', // 'shift_basic', 'shift_cover', 'sickness', 'annual_leave', 'public_holiday'
    date: '',
    hours: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';

  const entryTypes = [
    { value: 'shift_basic', label: 'Basic Shift', category: 'shift' },
    { value: 'shift_cover', label: 'Cover Shift', category: 'shift' },
    { value: 'sickness', label: 'Sickness', category: 'absence' },
    { value: 'annual_leave', label: 'Annual Leave', category: 'absence' },
    { value: 'public_holiday', label: 'Public Holiday', category: 'absence' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const isShift = formData.type.startsWith('shift_');
      const isAbsence = ['sickness', 'annual_leave', 'public_holiday'].includes(formData.type);

      if (isShift) {
        // For shifts, create a time_entry directly for basic shifts
        const startHour = 9; // Default start hour
        const hours = parseFloat(formData.hours) || 8;
        const endHour = startHour + hours;
        const shiftDate = new Date(formData.date);
        
        const { error } = await supabase
          .from('time_entries')
          .insert({
            family_id: familyId,
            user_id: user.data.user.id,
            clock_in: `${formData.date}T${String(startHour).padStart(2, '0')}:00:00`,
            clock_out: `${formData.date}T${String(endHour).padStart(2, '0')}:00:00`,
            notes: `${formData.type === 'shift_basic' ? 'Basic' : 'Cover'} shift${formData.notes ? ': ' + formData.notes : ''}`
          });

        if (error) throw error;

        toast({
          title: "Shift Request Submitted",
          description: isAdmin ? "Shift request created for admin review" : "Shift request submitted for approval",
        });
      } else if (isAbsence) {
        if (isAdmin) {
          // Admins can directly create approved leave requests
          const { error } = await supabase
            .from('leave_requests')
            .insert({
              family_id: familyId,
              user_id: user.data.user.id,
              start_date: formData.date,
              end_date: formData.date,
              reason: `${formData.type} - ${formData.hours} hours${formData.notes ? ': ' + formData.notes : ''}`,
              status: 'approved'
            });

          if (error) throw error;

          toast({
            title: "Absence Recorded",
            description: "Absence has been recorded successfully",
          });
        } else {
          // Carers submit requests for approval
          const { error } = await supabase
            .from('leave_requests')
            .insert({
              family_id: familyId,
              user_id: user.data.user.id,
              start_date: formData.date,
              end_date: formData.date,
              reason: `${formData.type} - ${formData.hours} hours${formData.notes ? ': ' + formData.notes : ''}`,
              status: 'pending'
            });

          if (error) throw error;

          toast({
            title: "Absence Request Submitted",
            description: "Your absence request has been submitted for approval",
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating entry:', error);
      toast({
        title: "Error",
        description: "Failed to create entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Shift or Absence</DialogTitle>
          <DialogDescription>
            Create a new shift or record an absence
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Entry Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entry type" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Shifts</div>
                {entryTypes.filter(type => type.category === 'shift').map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">Absences</div>
                {entryTypes.filter(type => type.category === 'absence').map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
              placeholder="e.g. 8"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.type || !formData.date || !formData.hours}>
              {loading ? 'Creating...' : (isAdmin ? 'Create Entry' : 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};