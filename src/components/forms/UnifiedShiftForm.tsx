import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UnifiedShiftFormProps {
  familyId: string;
  userRole: 'carer' | 'family_admin' | 'disabled_person';
  editShiftData?: any;
  careRecipientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
  onDeleteShift?: (shiftId: string) => Promise<void>;
}

export const UnifiedShiftForm = ({ familyId, userRole, editShiftData, careRecipientName, open, onOpenChange, onSuccess, onCancel, onDeleteShift }: UnifiedShiftFormProps) => {
  const [formData, setFormData] = useState({
    request_type: editShiftData?.request_type || '',
    start_date: editShiftData?.start_date || '',
    end_date: editShiftData?.end_date || '',
    hours: editShiftData?.hours?.toString() || '',
    reason: editShiftData?.reason || '',
    carer_id: editShiftData?.carer_id || '',
    shift_category: editShiftData?.shift_category || 'basic'
  });
  
  const isEditingLeaveRequest = editShiftData?.id && ['annual_leave', 'sickness', 'public_holiday'].includes(editShiftData.request_type);
  const [carers, setCarers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'single' | 'series'>('single');
  const { toast } = useToast();

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
  const isCarer = userRole === 'carer';

  const requestTypes = isAdmin ? [
    { value: 'basic', label: 'Basic Shift' },
    { value: 'cover', label: 'Cover Shift' },
    { value: 'annual_leave', label: 'Annual Leave' },
    { value: 'sickness', label: 'Sickness' },
    { value: 'public_holiday', label: 'Public Holiday' },
    { value: 'other', label: 'Other' }
  ] : [
    { value: 'sickness', label: 'Sickness' },
    { value: 'annual_leave', label: 'Annual Leave' },
    { value: 'public_holiday', label: 'Public Holiday' },
    { value: 'swap', label: 'Shift Swap' },
    { value: 'overtime', label: 'Overtime Request' }
  ];

  // Load carers
  useEffect(() => {
    const loadCarers = async () => {
      try {
        const { data: carerMemberships, error } = await supabase
          .from('user_memberships')
          .select('user_id')
          .eq('family_id', familyId)
          .eq('role', 'carer');

        if (error) throw error;

        const carerIds = (carerMemberships || []).map(m => m.user_id);
        
        if (carerIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', carerIds);

          if (profileError) throw profileError;

          const carersWithProfiles = (profiles || []).map(profile => ({
            user_id: profile.id,
            profiles: {
              full_name: profile.full_name || 'Unnamed Carer'
            }
          }));

          setCarers(carersWithProfiles);
        }
      } catch (error) {
        console.error('Error loading carers:', error);
      }
    };

    if (open) {
      loadCarers();
    }
  }, [familyId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      if (isCarer) {
        // Carers submit change requests instead of direct updates
        if (editShiftData?.id) {
          // Transform shift data to time entry format if needed
          const timeEntry = {
            id: editShiftData.id,
            clock_in: editShiftData.clock_in || `${editShiftData.start_date}T${editShiftData.start_time || '09:00:00'}`,
            clock_out: editShiftData.clock_out || `${editShiftData.start_date}T${editShiftData.end_time || '17:00:00'}`,
            family_id: familyId
          };

          // Calculate new times based on form data
          const startHour = 9;
          const hours = parseInt(formData.hours) || 8;
          const endHour = startHour + hours;

          const { error } = await supabase
            .from('shift_change_requests')
            .insert({
              family_id: familyId,
              time_entry_id: timeEntry.id,
              requested_by: user.data.user.id,
              new_start_time: `${formData.start_date}T${String(startHour).padStart(2, '0')}:00:00`,
              new_end_time: `${formData.start_date}T${String(endHour).padStart(2, '0')}:00:00`,
              reason: formData.reason || null,
              status: 'pending'
            });

          if (error) throw error;

          toast({
            title: "Change Request Submitted",
            description: "Your shift change request has been submitted for admin approval",
          });
        }
      } else {
        // Admin mode - direct updates
        if (isEditingLeaveRequest && editShiftData?.id) {
          // Admin editing approved leave request
          const { error } = await supabase
            .from('leave_requests')
            .update({
              start_date: formData.start_date,
              end_date: formData.start_date,
              reason: formData.reason || null
            })
            .eq('id', editShiftData.id);

          if (error) throw error;
        } else {
          // Admin creating/editing a basic or cover shift
          if (editShiftData?.id && !isEditingLeaveRequest) {
            // Update existing time entry
            const updateData: any = {};
            
            if (formData.carer_id) {
              updateData.user_id = formData.carer_id;
            }
            
            if (formData.start_date && formData.hours) {
              const startHour = 9;
              const hours = parseInt(formData.hours);
              const endHour = startHour + hours;
              updateData.clock_in = `${formData.start_date}T${String(startHour).padStart(2, '0')}:00:00`;
              updateData.clock_out = `${formData.start_date}T${String(endHour).padStart(2, '0')}:00:00`;
            }
            
            if (formData.reason) {
              updateData.notes = formData.reason;
            }
            
            if (formData.request_type) {
              updateData.shift_type = formData.request_type;
            }
            
            if (Object.keys(updateData).length > 0) {
              const { error } = await supabase
                .from('time_entries')
                .update(updateData)
                .eq('id', editShiftData.id);

              if (error) throw error;
            }
          } else if (!isEditingLeaveRequest) {
            // Create new time entry
            const startHour = 9;
            const hours = parseInt(formData.hours) || 8;
            const endHour = startHour + hours;

            const { error } = await supabase
              .from('time_entries')
              .insert({
                family_id: familyId,
                user_id: formData.carer_id,
                clock_in: `${formData.start_date}T${String(startHour).padStart(2, '0')}:00:00`,
                clock_out: `${formData.start_date}T${String(endHour).padStart(2, '0')}:00:00`,
                notes: formData.reason || `${formData.shift_category} shift`,
                shift_type: formData.request_type || formData.shift_category || 'basic'
              });

            if (error) throw error;
          }
        }

        toast({
          title: "Success",
          description: isEditingLeaveRequest ? "Leave request updated successfully" : 
                      (editShiftData ? "Shift updated successfully" : "Shift created successfully"),
        });
        
        // Notify calendar views to refresh
        window.dispatchEvent(new Event('shift-updated'));
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: isCarer ? "Failed to submit change request" : "Failed to save shift",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (isEditingLeaveRequest) {
        // Delete leave request
        const { error } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', editShiftData.id);
        
        if (error) throw error;
      } else if (editShiftData?.shift_assignment_id) {
        // Delete shift - check if it's part of a series
        if (deleteOption === 'series') {
          // Delete all future instances with same shift_assignment_id
          const result: any = await (supabase as any)
            .from('time_entries')
            .delete()
            .eq('shift_assignment_id', editShiftData.shift_assignment_id)
            .gte('clock_in', new Date().toISOString());
          
          const { error } = result;
          if (error) throw error;
        } else {
          // Use the centralized deletion logic with cache-busting
          if (onDeleteShift) {
            await onDeleteShift(editShiftData.id);
          } else {
            // Fallback if no callback provided
            const { error } = await supabase
              .from('time_entries')
              .delete()
              .eq('id', editShiftData.id);
            
            if (error) throw error;
          }
        }
      }

      toast({
        title: "Deleted",
        description: deleteOption === 'series' ? "Shift series deleted successfully" : "Shift deleted successfully",
      });

      setShowDeleteDialog(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editShiftData ? 'Edit Shift' : (isCarer ? 'Request Shift Change' : 'Create Shift')}
            </DialogTitle>
            <DialogDescription>
              {isCarer 
                ? 'Submit a request for shift changes or time off'
                : 'Create or edit a shift assignment'
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Carer info banner */}
          {isCarer && editShiftData && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You're requesting a change to this shift. The family admin will review and approve.
              </AlertDescription>
            </Alert>
          )}

          {/* Shift Overview Box */}
          {editShiftData && (
            <div className="p-4 bg-muted rounded-lg border">
              <h4 className="font-medium mb-2">{isAdmin ? 'Editing Shift:' : 'Current Shift:'}</h4>
              <div className="text-sm space-y-1">
              {editShiftData.carer_id && (
                <div>
                  <span className="font-medium">
                    {isCarer ? 'Care recipient:' : 'Assigned to:'}
                  </span>{' '}
                  {isCarer 
                    ? (careRecipientName || 'Care Recipient')
                    : (carers.find(c => c.user_id === editShiftData.carer_id)?.profiles.full_name || 'Unknown Carer')
                  }
                </div>
              )}
                {editShiftData.start_date && (
                  <div><span className="font-medium">Date:</span> {new Date(editShiftData.start_date).toLocaleDateString()}</div>
                )}
                {editShiftData.request_type && (
                  <div><span className="font-medium">Type:</span> {editShiftData.request_type.replace(/_/g, ' ')}</div>
                )}
                {editShiftData.hours && (
                  <div><span className="font-medium">Hours:</span> {editShiftData.hours}</div>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Assign to Carer - shown for admins, optionally for carers as "Change carer" */}
            {isAdmin && (
              <div>
                <Label htmlFor="carer_id">
                  {editShiftData ? 'Change carer (optional)' : 'Assign to carer'}
                </Label>
                <Select 
                  value={formData.carer_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, carer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editShiftData ? 'Keep current assignment' : 'Select carer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {carers.map((carer) => (
                      <SelectItem key={carer.user_id} value={carer.user_id}>
                        {carer.profiles.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="request_type">{isCarer ? 'Request Type' : 'Shift Type'}</Label>
              <Select 
                value={formData.request_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isCarer ? 'Select request type' : 'Select shift type'} />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">{isAdmin && !editShiftData ? 'Date (optional)' : 'Start Date'}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required={false}
                  />
            </div>

            <div>
              <Label htmlFor="hours">Hours {isAdmin && !editShiftData && '(optional)'}</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                    placeholder="e.g. 8"
                    required={false}
                  />
            </div>

            <div>
              <Label htmlFor="reason">{isCarer ? 'Reason (optional)' : 'Notes (optional)'}</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={isCarer ? 'Provide additional details...' : 'Add any notes about this shift...'}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              {editShiftData && isAdmin && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : (editShiftData ? (isCarer ? 'Submit Request' : 'Update Shift') : (isCarer ? 'Submit Request' : 'Create Shift'))}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              This shift may be part of a recurring series. What would you like to delete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <RadioGroup value={deleteOption} onValueChange={(value) => setDeleteOption(value as 'single' | 'series')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Delete only this shift</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="series" id="series" />
              <Label htmlFor="series">Delete this and all future shifts in the series</Label>
            </div>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};