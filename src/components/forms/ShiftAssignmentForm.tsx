import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { timeRangeSchema } from "@/lib/validation";
import { sanitizeError } from "@/lib/errorHandler";
import { format } from 'date-fns';

interface ShiftAssignmentFormProps {
  familyId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingAssignment?: any;
}

export const ShiftAssignmentForm = ({ familyId, onSuccess, onCancel, editingAssignment }: ShiftAssignmentFormProps) => {
  const [formData, setFormData] = useState({
    shift_type: editingAssignment?.notes || 'basic',
    start_time: editingAssignment?.start_time || '',
    end_time: editingAssignment?.end_time || '',
    days_of_week: editingAssignment?.days_of_week || [] as number[],
    hourly_rate: editingAssignment?.hourly_rate?.toString() || ''
  });
  const [selectedCarerIds, setSelectedCarerIds] = useState<string[]>(
    editingAssignment?.carer_ids || editingAssignment?.carer_id ? [editingAssignment.carer_id] : []
  );
  const [isRecurring, setIsRecurring] = useState(editingAssignment?.is_recurring ?? true);
  const [editRecurrenceOption, setEditRecurrenceOption] = useState<'single' | 'future' | 'all'>('future');
  const [showEditRecurrenceDialog, setShowEditRecurrenceDialog] = useState(false);
  const [isPartOfRecurringSeries, setIsPartOfRecurringSeries] = useState(false);
  const [carers, setCarers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  // Detect if editing assignment is part of a recurring series
  useEffect(() => {
    const detectRecurringSeries = async () => {
      if (!editingAssignment?.shift_assignment_id) {
        setIsPartOfRecurringSeries(false);
        return;
      }

      try {
        // Check if there are other time_entries with the same shift_assignment_id
        const result: any = await (supabase as any)
          .from('time_entries')
          .select('id')
          .eq('shift_assignment_id', editingAssignment.shift_assignment_id)
          .limit(2);
        
        const { data, error } = result;

        if (error) {
          console.error('Error checking for recurring series:', error);
          setIsPartOfRecurringSeries(false);
          return;
        }

        // If more than 1 entry exists with this shift_assignment_id, it's a recurring series
        const isRecurringSeries = (data?.length || 0) > 1;
        console.log('🔁 Recurring series detection:', { 
          shift_assignment_id: editingAssignment.shift_assignment_id,
          count: data?.length,
          isRecurringSeries 
        });
        setIsPartOfRecurringSeries(isRecurringSeries);
      } catch (error) {
        console.error('Error in recurring series detection:', error);
        setIsPartOfRecurringSeries(false);
      }
    };

    detectRecurringSeries();
  }, [editingAssignment]);

  // Load carers for this family
  useEffect(() => {
    const loadCarers = async () => {
      try {
        console.log('Loading carers for family:', familyId);

        // Get carers for this family first
        const { data: carerMemberships, error: carerError } = await supabase
          .from('user_memberships')
          .select('user_id')
          .eq('family_id', familyId)
          .eq('role', 'carer');

        if (carerError) throw carerError;

        console.log('Found carer memberships:', carerMemberships?.length || 0);

        if (!carerMemberships?.length) {
          console.log('No carer memberships found');
          setCarers([]);
          return;
        }

        // Get profile names for all carers in one query
        const carerUserIds = carerMemberships.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', carerUserIds);
        
        console.log('Profile data for carers:', profiles);
        
        // Map profiles to carers
        const carersWithProfiles = carerMemberships.map((membership) => {
          const profile = profiles?.find(p => p.id === membership.user_id);
          return {
            user_id: membership.user_id,
            profiles: {
              full_name: profile?.full_name || 'Unnamed Carer'
            }
          };
        });

        console.log('Carers with profiles:', carersWithProfiles);
        setCarers(carersWithProfiles);
      } catch (error) {
        const sanitized = sanitizeError(error);
        toast({
          title: sanitized.title,
          description: sanitized.description,
          variant: "destructive",
        });
      }
    };

    if (familyId) {
      loadCarers();
    }
  }, [familyId, toast]);

  const handleDayToggle = (day: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: checked 
        ? [...prev.days_of_week, day]
        : prev.days_of_week.filter(d => d !== day)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If editing a shift that's part of a recurring series, show recurrence options dialog
    if (editingAssignment && isPartOfRecurringSeries) {
      console.log('🔁 Showing recurrence dialog for series edit');
      setShowEditRecurrenceDialog(true);
      return;
    }

    await saveShiftAssignment();
  };

  const saveShiftAssignment = async () => {
    
    if (selectedCarerIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one carer",
        variant: "destructive",
      });
      return;
    }

    // Validate time range
    const timeValidation = timeRangeSchema.safeParse({
      start_time: formData.start_time,
      end_time: formData.end_time
    });

    if (!timeValidation.success) {
      toast({
        title: "Validation Error",
        description: timeValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Calculate shift duration in hours
      const startTime = new Date(`2024-01-01T${formData.start_time}`);
      const endTime = new Date(`2024-01-01T${formData.end_time}`);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (editingAssignment) {
        // Check if this is editing a time_entry directly
        if (editingAssignment.time_entry_id) {
          // New data model: Update time_entry directly
          const shiftDate = new Date(editingAssignment.start_date);
          const clockIn = new Date(shiftDate);
          const clockOut = new Date(shiftDate);
          
          const [startHours, startMinutes] = formData.start_time.split(':');
          const [endHours, endMinutes] = formData.end_time.split(':');
          
          clockIn.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
          clockOut.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

          const { error: updateError } = await supabase
            .from('time_entries')
            .update({
              clock_in: clockIn.toISOString(),
              clock_out: clockOut.toISOString(),
              notes: formData.shift_type || 'basic',
              user_id: selectedCarerIds[0]
            })
            .eq('id', editingAssignment.time_entry_id);

          if (updateError) throw updateError;

          toast({
            title: "Success",
            description: "Shift updated successfully",
          });
        } else {
          // Old data model: Update shift_assignments
          let updateQuery: any = supabase
            .from('time_entries')
            .update({
              clock_in: `2024-01-01T${formData.start_time}:00`,
              clock_out: `2024-01-01T${formData.end_time}:00`,
              notes: formData.shift_type || 'basic'
            });

          if (editRecurrenceOption === 'single') {
            updateQuery = updateQuery.eq('id', editingAssignment.id);
          } else if (editRecurrenceOption === 'future') {
            updateQuery = updateQuery
              .eq('shift_assignment_id', editingAssignment.shift_assignment_id)
              .gte('clock_in', new Date().toISOString());
          } else {
            updateQuery = updateQuery
              .eq('shift_assignment_id', editingAssignment.shift_assignment_id);
          }

          const { error: updateError } = await updateQuery;

          if (updateError) throw updateError;

          toast({
            title: "Success",
            description: `Shift${editRecurrenceOption !== 'single' ? 's' : ''} updated successfully`,
          });
          setShowEditRecurrenceDialog(false);
        }
      } else {
        // For recurring shifts, create shift_assignments and generate instances
        if (isRecurring && formData.days_of_week.length > 0) {
          console.log('Creating recurring shift assignments');
          
          const today = new Date();
          const fourWeeksFromNow = new Date(today);
          fourWeeksFromNow.setDate(today.getDate() + 28);
          
          for (const carerId of selectedCarerIds) {
            for (const dayOfWeek of formData.days_of_week) {
              // Create shift_assignment
              const { data: assignment, error: assignmentError } = await supabase
                .from('shift_assignments')
                .insert({
                  family_id: familyId,
                  carer_id: carerId,
                  day_of_week: dayOfWeek,
                  start_time: formData.start_time,
                  end_time: formData.end_time,
                  shift_type: formData.shift_type,
                  is_recurring: true,
                  active: true,
                  notes: `Hourly rate: ${formData.hourly_rate || 'N/A'}`
                })
                .select()
                .single();

              if (assignmentError) throw assignmentError;

              console.log('✅ Created shift_assignment:', assignment.id);

              // Generate shift instances for the next 4 weeks
              const { data: instanceCount, error: rpcError } = await supabase
                .rpc('generate_shift_instances', {
                  _assignment_id: assignment.id,
                  _start_date: format(today, 'yyyy-MM-dd'),
                  _end_date: format(fourWeeksFromNow, 'yyyy-MM-dd')
                });

              if (rpcError) throw rpcError;

              console.log(`✅ Generated ${instanceCount} shift instances for assignment ${assignment.id}`);
            }
          }

          toast({
            title: "Success",
            description: `Created recurring shifts for ${selectedCarerIds.length} carer(s)`,
          });
        } else {
          // For one-time shifts, create direct time_entries as before
          console.log('Creating one-time shift');
          
          const shiftDate = new Date().toISOString().split('T')[0];
          
          for (const carerId of selectedCarerIds) {
            const { error: timeEntryError } = await supabase
              .from('time_entries')
              .insert({
                family_id: familyId,
                user_id: carerId,
                clock_in: `${shiftDate}T${formData.start_time}`,
                clock_out: `${shiftDate}T${formData.end_time}`,
                shift_type: formData.shift_type,
                notes: `One-time shift. Hourly rate: ${formData.hourly_rate || 'N/A'}`
              });

            if (timeEntryError) throw timeEntryError;
          }

          toast({
            title: "Success",
            description: "Created one-time shift",
          });
        }
      }

      // Dispatch custom event to trigger calendar refresh
      window.dispatchEvent(new CustomEvent('shift-updated'));
      
      onSuccess();
    } catch (error) {
      const sanitized = sanitizeError(error);
      toast({
        title: sanitized.title,
        description: sanitized.description,
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
          <DialogTitle>{editingAssignment ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
          <DialogDescription>
            {editingAssignment ? 'Update the shift assignment' : 'Create a shift and assign it to carer(s)'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Select Carer(s)</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
              {carers.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">
                  No carers available. Please invite carers to the care team first.
                </div>
              ) : (
                carers.map((carer) => (
                  <div key={carer.user_id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`carer-${carer.user_id}`}
                      checked={selectedCarerIds.includes(carer.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCarerIds([...selectedCarerIds, carer.user_id]);
                        } else {
                          setSelectedCarerIds(selectedCarerIds.filter(id => id !== carer.user_id));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`carer-${carer.user_id}`} className="text-sm">
                      {carer.profiles.full_name || 'Unnamed Carer'}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="shift_type">Shift Type</Label>
            <Select
              value={formData.shift_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, shift_type: value }))}
            >
              <SelectTrigger id="shift_type">
                <SelectValue placeholder="Select shift type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic Shift</SelectItem>
                <SelectItem value="annual_leave">Holiday/Annual Leave</SelectItem>
                <SelectItem value="sickness">Sickness</SelectItem>
                <SelectItem value="public_holiday">Public Holiday</SelectItem>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="shift_swap">Shift Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="recurring">Recurring shift (generates multiple instances)</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate (optional)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
              placeholder="e.g., 15.50"
            />
          </div>

          <div>
            <Label>Days of Week</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.days_of_week.includes(day.value)}
                    onCheckedChange={(checked) => handleDayToggle(day.value, checked as boolean)}
                  />
                  <Label htmlFor={`day-${day.value}`}>{day.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editingAssignment ? 'Updating...' : 'Creating...') : (editingAssignment ? 'Update Shift' : 'Create Shift')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Edit Recurrence Dialog */}
      <AlertDialog open={showEditRecurrenceDialog} onOpenChange={setShowEditRecurrenceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Recurring Shift</AlertDialogTitle>
            <AlertDialogDescription>
              This is a recurring shift. What would you like to update?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <RadioGroup value={editRecurrenceOption} onValueChange={(value) => setEditRecurrenceOption(value as 'single' | 'future' | 'all')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="edit-single" />
              <Label htmlFor="edit-single">Update only this shift</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="future" id="edit-future" />
              <Label htmlFor="edit-future">Update this and all future shifts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="edit-all" />
              <Label htmlFor="edit-all">Update all shifts in the series</Label>
            </div>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEditRecurrenceDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveShiftAssignment} disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};