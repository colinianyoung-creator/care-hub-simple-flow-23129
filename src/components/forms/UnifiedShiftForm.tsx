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
import { Info, CalendarIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";

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
  initialDate?: string;
}

// Helper: Calculate hours from shift data
const calculateHoursFromShift = (shift: any): string => {
  if (!shift) return '8';
  if (shift.hours) return shift.hours.toString();
  if (shift.clock_in && shift.clock_out) {
    const start = new Date(shift.clock_in);
    const end = new Date(shift.clock_out);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours).toString();
  }
  if (shift.start_time && shift.end_time) {
    const start = parseInt(shift.start_time.split(':')[0]);
    const end = parseInt(shift.end_time.split(':')[0]);
    return (end - start).toString();
  }
  return '8';
};

export const UnifiedShiftForm = ({ familyId, userRole, editShiftData, careRecipientName, open, onOpenChange, onSuccess, onCancel, onDeleteShift, initialDate }: UnifiedShiftFormProps) => {
  const [formData, setFormData] = useState({
    request_type: 'basic',
    start_date: '',
    end_date: '',
    hours: '8',
    reason: '',
    carer_id: '',
    shift_category: 'basic'
  });
  
  const isEditingLeaveRequest = editShiftData?.id && ['annual_leave', 'sickness', 'public_holiday'].includes(editShiftData.request_type);
  const [carers, setCarers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'single' | 'future' | 'series'>('single');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
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
    { value: 'basic', label: 'Basic Shift' },
    { value: 'sickness', label: 'Sickness' },
    { value: 'annual_leave', label: 'Annual Leave' },
    { value: 'public_holiday', label: 'Public Holiday' },
    { value: 'swap', label: 'Shift Swap' },
    { value: 'overtime', label: 'Overtime Request' }
  ];

  // Auto-populate form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        request_type: editShiftData?.shift_type || editShiftData?.request_type || 'basic',
        start_date: editShiftData?.scheduled_date || editShiftData?.start_date || initialDate || '',
        end_date: editShiftData?.end_date || '',
        hours: calculateHoursFromShift(editShiftData),
        reason: editShiftData?.reason || editShiftData?.notes || '',
        carer_id: editShiftData?.carer_id || '',
        shift_category: editShiftData?.shift_type || 'basic'
      });
    }
  }, [open, editShiftData, initialDate]);

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

  const handleDayToggle = (day: number, checked: boolean) => {
    setSelectedDays(prev => 
      checked ? [...prev, day] : prev.filter(d => d !== day)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Validate recurring shift has days selected
      if (isAdmin && !editShiftData && isRecurring && selectedDays.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one day for recurring shifts",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isCarer) {
        // Carers submit change requests instead of direct updates
        if (editShiftData?.id) {
          // If end_date is set, create bulk change requests for all shifts in range
          if (formData.end_date && ['annual_leave', 'sickness', 'public_holiday'].includes(formData.request_type)) {
            // Query all shifts in date range for this carer
            const { data: shiftsInRange, error: queryError } = await supabase
              .from('time_entries')
              .select('id, clock_in, clock_out')
              .eq('family_id', familyId)
              .eq('user_id', user.data.user.id)
              .gte('clock_in', `${formData.start_date}T00:00:00`)
              .lte('clock_in', `${formData.end_date}T23:59:59`);

            if (queryError) throw queryError;

            if (!shiftsInRange || shiftsInRange.length === 0) {
              toast({
                title: "No Shifts Found",
                description: "No shifts found in the selected date range",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            // Create change request for each shift
            const startHour = 9;
            const hours = parseInt(formData.hours) || 8;
            const endHour = startHour + hours;

            const changeRequests = shiftsInRange.map(shift => ({
              family_id: familyId,
              time_entry_id: shift.id,
              requested_by: user.data.user.id,
              new_start_time: shift.clock_in,
              new_end_time: shift.clock_out,
              new_shift_type: formData.request_type,
              reason: formData.reason || null,
              status: 'pending'
            }));

            const { error: bulkError } = await supabase
              .from('shift_change_requests')
              .insert(changeRequests);

            if (bulkError) throw bulkError;

            toast({
              title: "Bulk Change Requests Submitted",
              description: `${shiftsInRange.length} shift change requests submitted for ${formData.start_date} to ${formData.end_date}`,
            });
          } else {
            // Single shift change request
            const timeEntry = {
              id: editShiftData.id,
              clock_in: editShiftData.clock_in || `${editShiftData.start_date}T${editShiftData.start_time || '09:00:00'}`,
              clock_out: editShiftData.clock_out || `${editShiftData.start_date}T${editShiftData.end_time || '17:00:00'}`,
              family_id: familyId
            };

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
                new_shift_type: formData.request_type || 'basic',
                reason: formData.reason || null,
                status: 'pending'
              });

            if (error) throw error;

            toast({
              title: "Change Request Submitted",
              description: "Your shift change request has been submitted for admin approval",
            });
          }
        }
      } else {
        // Admin mode - direct updates
        
        // Validate carer selection for all new shifts (both recurring and one-time)
        if (!editShiftData && !isEditingLeaveRequest && !formData.carer_id) {
          toast({
            title: "Validation Error",
            description: "Please select a carer for this shift",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
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
        } else if (isRecurring && selectedDays.length > 0 && !editShiftData) {
          // Admin creating new recurring shifts
          console.log('Creating recurring shift assignments');
          
          const today = new Date();
          const oneYearFromNow = new Date(today);
          oneYearFromNow.setDate(today.getDate() + 365);
          
          const startHour = 9;
          const hours = parseInt(formData.hours) || 8;
          const endHour = startHour + hours;
          
          const startTime = `${String(startHour).padStart(2, '0')}:00`;
          const endTime = `${String(endHour).padStart(2, '0')}:00`;
          
          for (const dayOfWeek of selectedDays) {
            // Create shift_assignment
            const { data: assignment, error: assignmentError } = await supabase
              .from('shift_assignments')
              .insert({
                family_id: familyId,
                carer_id: formData.carer_id || null,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                shift_type: formData.request_type,
                is_recurring: true,
                active: true,
                notes: formData.reason || 'Recurring shift'
              })
              .select()
              .single();

            if (assignmentError) throw assignmentError;

            console.log('✅ Created shift_assignment:', assignment.id);

            // Generate shift instances for the next year
            const { error: rpcError } = await supabase
              .rpc('generate_shift_instances', {
                _assignment_id: assignment.id,
                _start_date: formatDate(today, 'yyyy-MM-dd'),
                _end_date: formatDate(oneYearFromNow, 'yyyy-MM-dd')
              });

            if (rpcError) throw rpcError;

            console.log(`✅ Generated shift instances for assignment ${assignment.id}`);
          }

          toast({
            title: "Success",
            description: `Created recurring shifts for ${selectedDays.length} day(s) of the week`,
          });
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
            // Admin creating new shift(s)
            const startHour = 9;
            const hours = parseInt(formData.hours) || 8;
            const endHour = startHour + hours;

            // If end_date is set, create shifts for all dates in range
            if (formData.end_date && ['annual_leave', 'sickness', 'public_holiday'].includes(formData.request_type)) {
              const start = new Date(formData.start_date);
              const end = new Date(formData.end_date);
              const shifts = [];

              for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateStr = formatDate(date, 'yyyy-MM-dd');
                shifts.push({
                  family_id: familyId,
                  user_id: formData.carer_id,
                  clock_in: `${dateStr}T${String(startHour).padStart(2, '0')}:00:00`,
                  clock_out: `${dateStr}T${String(endHour).padStart(2, '0')}:00:00`,
                  notes: formData.reason || `${formData.request_type} shift`,
                  shift_type: formData.request_type
                });
              }

              const { error } = await supabase
                .from('time_entries')
                .insert(shifts);

              if (error) throw error;

              toast({
                title: "Success",
                description: `${shifts.length} shifts created from ${formData.start_date} to ${formData.end_date}`,
              });
            } else {
              // Create single new time entry
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
        }

        // Show success toast only for non-bulk operations
        if (!formData.end_date || !['annual_leave', 'sickness', 'public_holiday'].includes(formData.request_type)) {
          toast({
            title: "Success",
            description: isEditingLeaveRequest ? "Leave request updated successfully" : 
                        (editShiftData ? "Shift updated successfully" : "Shift created successfully"),
          });
        }
        
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
    // Close modal IMMEDIATELY before any async operations to prevent flash
    setShowDeleteDialog(false);
    onOpenChange(false);
    
    setLoading(true);
    
    try {
      if (isEditingLeaveRequest) {
        // Delete leave request
        const { error } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', editShiftData.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Leave request deleted successfully"
        });
      } else if (editShiftData?.id) {
        // Check if this is a recurring shift (has shift_assignment_id)
        const isRecurringShift = !!editShiftData.shift_assignment_id;

        if (isRecurringShift && deleteOption === 'series') {
          // Delete entire series
          console.log('🗑️ Deleting entire series, shift_assignment_id:', editShiftData.shift_assignment_id);
          
          // Step 1: Get all shift_instance IDs for this assignment
          // @ts-ignore - Supabase type instantiation depth issue
          const { data: instanceIds } = await supabase
            .from('shift_instances')
            .select('id')
            .eq('shift_assignment_id', editShiftData.shift_assignment_id);

          // Step 2: Delete time_entries that reference these instances
          if (instanceIds && instanceIds.length > 0) {
            const ids = instanceIds.map(i => i.id);
            // @ts-ignore - Supabase type instantiation depth issue
            await supabase
              .from('time_entries')
              .delete()
              .in('shift_instance_id', ids);
          }
          
          // Step 3: Delete shift_instances
          // @ts-ignore - Supabase type instantiation depth issue
          await supabase
            .from('shift_instances')
            .delete()
            .eq('shift_assignment_id', editShiftData.shift_assignment_id);
          
          // Step 4: Mark shift_assignment as inactive
          // @ts-ignore - Supabase type instantiation depth issue
          await supabase
            .from('shift_assignments')
            .update({ active: false })
            .eq('id', editShiftData.shift_assignment_id);

          toast({
            title: "Success",
            description: "Entire shift series deleted successfully"
          });
        } else if (isRecurringShift && deleteOption === 'future') {
          // Delete future instances
          console.log('🗑️ Deleting future instances from:', editShiftData.start_date);
          
          // Step 1: Get future shift_instance IDs
          // @ts-ignore - Supabase type instantiation depth issue
          const { data: futureInstanceIds } = await supabase
            .from('shift_instances')
            .select('id')
            .eq('shift_assignment_id', editShiftData.shift_assignment_id)
            .gte('scheduled_date', editShiftData.start_date);

          // Step 2: Delete time_entries for these instances
          if (futureInstanceIds && futureInstanceIds.length > 0) {
            const ids = futureInstanceIds.map(i => i.id);
            // @ts-ignore - Supabase type instantiation depth issue
            await supabase
              .from('time_entries')
              .delete()
              .in('shift_instance_id', ids);
          }
          
          // Step 3: Delete the shift_instances
          // @ts-ignore - Supabase type instantiation depth issue
          await supabase
            .from('shift_instances')
            .delete()
            .eq('shift_assignment_id', editShiftData.shift_assignment_id)
            .gte('scheduled_date', editShiftData.start_date);

          toast({
            title: "Success",
            description: "This shift and all future shifts deleted"
          });
        } else {
          // Single shift deletion
          console.log('🗑️ Deleting single shift:', editShiftData.id);
          
          if (isRecurringShift && editShiftData.shift_instance_id) {
            // Delete the specific shift_instance
            const { error } = await supabase
              .from('shift_instances')
              .delete()
              .eq('id', editShiftData.shift_instance_id);

            if (error) throw error;

            toast({
              title: "Success",
              description: "Shift deleted successfully"
            });
          } else {
            // Use the onDeleteShift callback for one-time shifts
            if (onDeleteShift) {
              console.log('📞 Calling onDeleteShift callback for shift:', editShiftData.id);
              await onDeleteShift(editShiftData.id);
              toast({
                title: "Success",
                description: "Shift deleted successfully"
              });
              return; // Exit early - onDeleteShift already handles refresh
            }
          }
        }
      }
      
      // Small delay to ensure modal is fully closed before refresh
      await new Promise(r => setTimeout(r, 100));
      
      onSuccess();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editShiftData 
                ? (isCarer ? 'Request Shift Change' : 'Edit Shift') 
                : (isCarer ? 'Request Time Off' : 'Create Shift')
              }
            </DialogTitle>
            <DialogDescription>
              {isCarer 
                ? 'Submit a request for shift changes or time off'
                : editShiftData 
                  ? 'Edit this shift assignment'
                  : 'Create a new shift or recurring shift pattern'
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
                  {editShiftData ? 'Change carer (optional)' : 'Assign to carer'} {!editShiftData && <span className="text-destructive">*</span>}
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
              <Label htmlFor="start_date">
                Start Date {(!editShiftData && !isRecurring) && '(optional)'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? formatDate(new Date(formData.start_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData(prev => ({ 
                      ...prev, 
                      start_date: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                    }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Recurring Shift Checkbox - Only for admins creating new shifts */}
            {isAdmin && !editShiftData && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(!!checked)}
                />
                <Label htmlFor="recurring" className="cursor-pointer">
                  Recurring shift (generates multiple instances)
                </Label>
              </div>
            )}

            {/* Days of Week - Only shown when recurring is checked */}
            {isRecurring && isAdmin && !editShiftData && (
              <div>
                <Label>Days of Week</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {daysOfWeek.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={(checked) => handleDayToggle(day.value, !!checked)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Date - Only for leave types */}
            {['annual_leave', 'sickness', 'public_holiday'].includes(formData.request_type) && (
              <div>
                <Label htmlFor="end_date">End Date (optional - for multiple days)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? formatDate(new Date(formData.end_date), "PPP") : <span>Select end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.end_date ? new Date(formData.end_date) : undefined}
                      onSelect={(date) => setFormData(prev => ({ 
                        ...prev, 
                        end_date: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                      }))}
                      disabled={(date) => !formData.start_date || date < new Date(formData.start_date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {formData.end_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCarer 
                      ? `Will create change requests for all shifts between these dates`
                      : `Will create shifts for all days between these dates`
                    }
                  </p>
                )}
              </div>
            )}

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
              {editShiftData?.is_recurring && editShiftData?.shift_assignment_id ? (
                <RadioGroup value={deleteOption} onValueChange={(value: any) => setDeleteOption(value)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="delete-single" />
                      <Label htmlFor="delete-single" className="font-normal cursor-pointer">
                        Delete only this shift
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="future" id="delete-future" />
                      <Label htmlFor="delete-future" className="font-normal cursor-pointer">
                        Delete this shift and all future shifts in the series
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="series" id="delete-series" />
                      <Label htmlFor="delete-series" className="font-normal cursor-pointer">
                        Delete entire series (all past and future shifts)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              ) : (
                <p>This action cannot be undone. This will permanently delete the shift.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

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