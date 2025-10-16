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

interface ShiftAssignmentFormProps {
  familyId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingAssignment?: any;
}

export const ShiftAssignmentForm = ({ familyId, onSuccess, onCancel, editingAssignment }: ShiftAssignmentFormProps) => {
  const [formData, setFormData] = useState({
    title: editingAssignment?.title || '',
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
        const { data, error } = await supabase
          .from('time_entries')
          .select('id')
          .eq('shift_assignment_id', editingAssignment.shift_assignment_id)
          .limit(2); // We only need to know if there's more than 1

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

        // Get profile names for each carer using safe profile lookup
        const carersWithProfiles = await Promise.all(
          carerMemberships.map(async (membership) => {
          const { data: profile } = await supabase
            .rpc('get_profile_safe');
            
            console.log('Profile data for user', membership.user_id, ':', profile);
            
            // Include all carers (remove disabled_person_id filter)
            if (profile && profile.length > 0) {
              return {
                user_id: membership.user_id,
                profiles: {
                  full_name: profile[0].full_name || 'Unnamed Carer'
                }
              };
            }
            
            // Fallback for carers without profile data
            return {
              user_id: membership.user_id,
              profiles: {
                full_name: 'Unnamed Carer'
              }
            };
          })
        );

        console.log('Carers with profiles:', carersWithProfiles);
        setCarers(carersWithProfiles);
      } catch (error) {
        console.error('Error loading carers:', error);
        toast({
          title: "Error",
          description: "Failed to load carers",
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
        title: "Error",
        description: "Please select at least one carer",
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
        // For admin shifts, go directly to time_entries - no approval needed
        // Update existing time entries for this assignment based on recurrence option
        let updateQuery = supabase
          .from('time_entries')
          .update({
            clock_in: `2024-01-01T${formData.start_time}:00`,
            clock_out: `2024-01-01T${formData.end_time}:00`,
            notes: formData.title || 'Shift'
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
      } else {
        // Create direct time entries for each selected carer - Admin basic shifts
        for (const carerId of selectedCarerIds) {
          // Create time entry for each day of the week for the next 4 weeks
          if (isRecurring && formData.days_of_week.length > 0) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 28);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dayOfWeek = d.getDay();
              if (formData.days_of_week.includes(dayOfWeek)) {
                const shiftStart = new Date(d);
                shiftStart.setHours(parseInt(formData.start_time.split(':')[0]), parseInt(formData.start_time.split(':')[1]));
                const shiftEnd = new Date(d);
                shiftEnd.setHours(parseInt(formData.end_time.split(':')[0]), parseInt(formData.end_time.split(':')[1]));

                await supabase.from('time_entries').insert({
                  family_id: familyId,
                  user_id: carerId,
                  clock_in: shiftStart.toISOString(),
                  clock_out: shiftEnd.toISOString(),
                  notes: formData.title || 'Basic Shift'
                });
              }
            }
          } else {
            // One-time shift - create single entry for today
            const today = new Date();
            const shiftStart = new Date(today);
            shiftStart.setHours(parseInt(formData.start_time.split(':')[0]), parseInt(formData.start_time.split(':')[1]));
            const shiftEnd = new Date(today);
            shiftEnd.setHours(parseInt(formData.end_time.split(':')[0]), parseInt(formData.end_time.split(':')[1]));

            await supabase.from('time_entries').insert({
              family_id: familyId,
              user_id: carerId,
              clock_in: shiftStart.toISOString(),
              clock_out: shiftEnd.toISOString(),
              notes: formData.title || 'Basic Shift'
            });
          }
        }

        toast({
          title: "Success",
          description: isRecurring ? "Recurring shifts created successfully" : "One-time shift created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: "Error",
        description: "Failed to create shift",
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
            <Label htmlFor="title">Shift Title (optional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Morning Care Shift"
            />
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