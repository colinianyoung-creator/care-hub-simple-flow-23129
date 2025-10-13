import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShiftRequestFormProps {
  familyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ShiftRequestFormProps {
  familyId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editShiftData?: any; // For admin edit shift functionality
  isAdminEdit?: boolean;
}

export const ShiftRequestForm = ({ familyId, onSuccess, onCancel, editShiftData, isAdminEdit }: ShiftRequestFormProps) => {
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
  const { toast } = useToast();

  const requestTypes = isAdminEdit ? [
    { value: 'basic', label: 'Basic Shift' },
    { value: 'cover', label: 'Cover Shift' }
  ] : [
    { value: 'sickness', label: 'Sickness' },
    { value: 'annual_leave', label: 'Annual Leave' },
    { value: 'public_holiday', label: 'Public Holiday' },
    { value: 'swap', label: 'Shift Swap' },
    { value: 'overtime', label: 'Overtime Request' }
  ];

  // Load carers for admin edit mode
  useEffect(() => {
    if (isAdminEdit) {
      const loadCarers = async () => {
        try {
          const { data: carerMemberships, error } = await supabase
            .from('user_memberships')
            .select('user_id')
            .eq('family_id', familyId)
            .eq('role', 'carer');

          if (error) throw error;

          const carersWithProfiles = await Promise.all(
            (carerMemberships || []).map(async (membership) => {
              const { data: profile } = await supabase
                .rpc('get_profile_safe', { profile_user_id: membership.user_id });
              
              return {
                user_id: membership.user_id,
                profiles: {
                  full_name: profile?.[0]?.full_name || 'Unnamed Carer'
                }
              };
            })
          );

          setCarers(carersWithProfiles);
        } catch (error) {
          console.error('Error loading carers:', error);
        }
      };

      loadCarers();
    }
  }, [isAdminEdit, familyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      if (isAdminEdit) {
        // Check if editing a leave request
        if (isEditingLeaveRequest && editShiftData?.id) {
          // Admin editing approved leave request
          const { error } = await supabase
            .from('leave_requests')
            .update({
              date: formData.start_date,
              hours: parseFloat(formData.hours) || 8,
              type: formData.request_type,
              notes: formData.reason || null
            })
            .eq('id', editShiftData.id);

          if (error) throw error;
        } else {
          // Admin creating/editing a basic or cover shift - goes directly to time_entries
          const { data: disabledPersonId } = await supabase
            .rpc('get_family_disabled_person_id', { _family_id: familyId });

          if (editShiftData?.id && !isEditingLeaveRequest) {
            // Update existing time entry
            const { error } = await supabase
              .from('time_entries')
              .update({
                user_id: formData.carer_id,
                start_time: `${formData.start_date}T09:00:00`,
                end_time: `${formData.start_date}T${formData.hours ? String(9 + parseInt(formData.hours)).padStart(2, '0') : '17'}:00:00`,
                shift_category: formData.shift_category,
                notes: formData.reason || null,
                status: 'approved'
              })
              .eq('id', editShiftData.id);

            if (error) throw error;
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
                disabled_person_id: disabledPersonId,
                start_time: `${formData.start_date}T${String(startHour).padStart(2, '0')}:00:00`,
                end_time: `${formData.start_date}T${String(endHour).padStart(2, '0')}:00:00`,
                shift_category: formData.shift_category,
                shift_type: 'scheduled',
                status: 'approved',
                notes: formData.reason || `${formData.shift_category} shift`
              });

            if (error) throw error;
          }
        }

        toast({
          title: "Success",
          description: isEditingLeaveRequest ? "Leave request updated successfully" : 
                      (editShiftData ? "Shift updated successfully" : "Shift created successfully"),
        });
      } else {
        // Carer request - check if editing pending leave request
        if (isEditingLeaveRequest && editShiftData?.id) {
          // Update existing pending leave request
          const { error } = await supabase
            .from('leave_requests')
            .update({
              date: formData.start_date,
              hours: parseFloat(formData.hours) || 8,
              type: formData.request_type,
              notes: formData.reason || null
            })
            .eq('id', editShiftData.id)
            .eq('carer_id', user.data.user.id); // Ensure user can only edit their own

          if (error) throw error;
        } else {
          // Create new request
          const isAbsenceRequest = ['sickness', 'annual_leave', 'public_holiday'].includes(formData.request_type);

          if (isAbsenceRequest) {
            // Create leave request for absence types
            const { error } = await supabase
              .from('leave_requests')
              .insert({
                family_id: familyId,
                carer_id: user.data.user.id,
                date: formData.start_date,
                hours: parseFloat(formData.hours) || 8,
                type: formData.request_type,
                notes: formData.reason || null,
                status: 'pending',
                created_by: user.data.user.id
              });

            if (error) throw error;
          } else {
            // Create shift request for other types
            const { error } = await supabase
              .from('shift_requests')
              .insert({
                family_id: familyId,
                requester_id: user.data.user.id,
                request_type: formData.request_type,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                reason: formData.reason || null
              });

            if (error) throw error;
          }
        }

        toast({
          title: "Success",
          description: editShiftData?.id ? "Request updated successfully" : "Request submitted successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: isAdminEdit ? "Failed to save shift" : "Failed to submit request",
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
          <DialogTitle>{isAdminEdit ? (editShiftData ? 'Edit Shift' : 'Create Shift') : 'New Shift Request'}</DialogTitle>
          <DialogDescription>
            {isAdminEdit ? 'Create or edit a shift assignment' : 'Submit a request for holiday, sick leave, or shift changes'}
          </DialogDescription>
        </DialogHeader>
        
        {editShiftData && (
          <div className="p-4 bg-muted rounded-lg border">
            <h4 className="font-medium mb-2">{isAdminEdit ? 'Editing Shift:' : 'Editing Request:'}</h4>
            <div className="text-sm space-y-1">
              {editShiftData.start_date && (
                <div><span className="font-medium">Date:</span> {new Date(editShiftData.start_date).toLocaleDateString()}</div>
              )}
              {editShiftData.request_type && (
                <div><span className="font-medium">Type:</span> {editShiftData.request_type.replace(/_/g, ' ')}</div>
              )}
              {editShiftData.carer_name && (
                <div><span className="font-medium">Carer:</span> {editShiftData.carer_name}</div>
              )}
              {editShiftData.hours && (
                <div><span className="font-medium">Hours:</span> {editShiftData.hours}</div>
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdminEdit && (
            <div>
              <Label htmlFor="carer_id">Assign to Carer</Label>
              <Select 
                value={formData.carer_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, carer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carer" />
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
            <Label htmlFor="request_type">{isAdminEdit ? 'Shift Type' : 'Request Type'}</Label>
            <Select 
              value={formData.request_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={isAdminEdit ? 'Select shift type' : 'Select request type'} />
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
            <Label htmlFor="start_date">{isAdminEdit ? 'Date' : 'Start Date'}</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              required
            />
          </div>

          {isAdminEdit || ['sickness', 'annual_leave', 'public_holiday'].includes(formData.request_type) ? (
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
                required={isAdminEdit}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="end_date">End Date (optional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          )}

          <div>
            <Label htmlFor="reason">{isAdminEdit ? 'Notes (optional)' : 'Reason (optional)'}</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={isAdminEdit ? 'Add any notes about this shift...' : 'Provide additional details...'}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (isAdminEdit && !formData.carer_id)}>
              {loading ? (isAdminEdit ? 'Saving...' : 'Submitting...') : (isAdminEdit ? (editShiftData ? 'Update Shift' : 'Create Shift') : 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};