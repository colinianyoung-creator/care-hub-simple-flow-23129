import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdaptiveSelect } from '@/components/adaptive';
import { AdaptiveDatePicker } from '@/components/adaptive/AdaptiveDatePicker';
import { AlertTriangle, Calendar, Loader2, Users, Trash2, UserCog, CalendarClock, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RoleChangeShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  carerId: string;
  carerName: string;
  futureShiftCount: number;
  newRoleLabel: string;
  /** Runs the actual approval RPC. Returns true on success. */
  onApprove: () => Promise<boolean>;
  onScheduleChange?: () => void;
}

interface CarerOption {
  id: string;
  name: string;
  type: 'registered' | 'placeholder';
}

type ShiftAction = 'keep' | 'reassign' | 'delete' | 'invite';
type ShiftScope = 'all' | 'from_date';

export const RoleChangeShiftDialog = ({
  isOpen,
  onClose,
  familyId,
  carerId,
  carerName,
  futureShiftCount,
  newRoleLabel,
  onApprove,
  onScheduleChange,
}: RoleChangeShiftDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<ShiftAction>('reassign');
  const [scope, setScope] = useState<ShiftScope>('all');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [selectedReassignee, setSelectedReassignee] = useState('');
  const [availableCarers, setAvailableCarers] = useState<CarerOption[]>([]);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAction('reassign');
      setScope('all');
      setFromDate(new Date());
      setSelectedReassignee('');
      setGeneratedInviteCode(null);
      loadCarers();
    }
  }, [isOpen, carerId, familyId]);

  const loadCarers = async () => {
    setLoading(true);
    try {
      const { data: membersData } = await supabase
        .from('user_memberships')
        .select('user_id, role, profiles!user_memberships_user_id_fkey(full_name)')
        .eq('family_id', familyId)
        .eq('role', 'carer');

      const { data: placeholdersData } = await supabase
        .from('placeholder_carers')
        .select('id, full_name')
        .eq('family_id', familyId)
        .eq('is_linked', false);

      const carers: CarerOption[] = [
        ...(membersData || [])
          .filter((m) => m.user_id !== carerId)
          .map((m: any) => ({
            id: m.user_id,
            name: m.profiles?.full_name || 'Unnamed Carer',
            type: 'registered' as const,
          })),
        ...(placeholdersData || []).map((p: any) => ({
          id: p.id,
          name: `${p.full_name} (pending)`,
          type: 'placeholder' as const,
        })),
      ];

      setAvailableCarers(carers);
    } catch (error) {
      console.error('Error loading carers:', error);
    } finally {
      setLoading(false);
    }
  };

  const effectiveDate = () => format(scope === 'from_date' ? fromDate : new Date(), 'yyyy-MM-dd');

  const getAssignmentIds = async () => {
    const { data: assignments, error } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('family_id', familyId)
      .eq('carer_id', carerId);
    if (error) throw error;
    return (assignments || []).map((a) => a.id);
  };

  const handleReassignShifts = async (targetCarerId: string, targetType: 'registered' | 'placeholder') => {
    const cutoff = effectiveDate();
    const assignmentIds = await getAssignmentIds();
    if (assignmentIds.length === 0) return;

    const { data: instances, error: instancesError } = await supabase
      .from('shift_instances')
      .select('id, shift_assignment_id, scheduled_date')
      .in('shift_assignment_id', assignmentIds);
    if (instancesError) throw instancesError;

    const pastInstanceAssignmentIds = new Set<string>();
    const futureInstanceAssignmentIds = new Set<string>();
    instances?.forEach((instance) => {
      if (instance.scheduled_date < cutoff) {
        pastInstanceAssignmentIds.add(instance.shift_assignment_id);
      } else {
        futureInstanceAssignmentIds.add(instance.shift_assignment_id);
      }
    });

    const futureUpdateData =
      targetType === 'registered'
        ? { carer_id: targetCarerId, placeholder_carer_id: null, original_carer_name: null, pending_export: false }
        : { carer_id: null, placeholder_carer_id: targetCarerId, original_carer_name: null, pending_export: false };

    // Assignments fully in the future (relative to cutoff): reassign outright
    const futureOnlyAssignmentIds = assignmentIds.filter(
      (id) => futureInstanceAssignmentIds.has(id) && !pastInstanceAssignmentIds.has(id)
    );
    if (futureOnlyAssignmentIds.length > 0) {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ ...futureUpdateData, updated_at: new Date().toISOString() })
        .in('id', futureOnlyAssignmentIds);
      if (error) throw error;
    }

    // Assignments with only past instances: preserve for timesheets
    const pastOnlyAssignmentIds = assignmentIds.filter(
      (id) => pastInstanceAssignmentIds.has(id) && !futureInstanceAssignmentIds.has(id)
    );
    if (pastOnlyAssignmentIds.length > 0) {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ original_carer_name: carerName, pending_export: true, updated_at: new Date().toISOString() })
        .in('id', pastOnlyAssignmentIds);
      if (error) throw error;
    }

    // Mixed assignments: preserve original name, drop future instances so they move to the new carer
    const mixedAssignmentIds = assignmentIds.filter(
      (id) => pastInstanceAssignmentIds.has(id) && futureInstanceAssignmentIds.has(id)
    );
    if (mixedAssignmentIds.length > 0) {
      const { error: mixedError } = await supabase
        .from('shift_assignments')
        .update({ original_carer_name: carerName, pending_export: true, updated_at: new Date().toISOString() })
        .in('id', mixedAssignmentIds);
      if (mixedError) throw mixedError;

      const { error: deleteInstancesError } = await supabase
        .from('shift_instances')
        .delete()
        .in('shift_assignment_id', mixedAssignmentIds)
        .gte('scheduled_date', cutoff);
      if (deleteInstancesError) throw deleteInstancesError;
    }
  };

  const handleDeleteShifts = async () => {
    const cutoff = effectiveDate();
    const assignmentIds = await getAssignmentIds();
    if (assignmentIds.length === 0) return;

    const { data: instances, error: instancesError } = await supabase
      .from('shift_instances')
      .select('id, shift_assignment_id, scheduled_date')
      .in('shift_assignment_id', assignmentIds);
    if (instancesError) throw instancesError;

    const assignmentsWithPastInstances = new Set<string>();
    instances?.forEach((instance) => {
      if (instance.scheduled_date < cutoff) {
        assignmentsWithPastInstances.add(instance.shift_assignment_id);
      }
    });

    // Delete upcoming instances on/after the cutoff
    const { error: deleteInstancesError } = await supabase
      .from('shift_instances')
      .delete()
      .in('shift_assignment_id', assignmentIds)
      .gte('scheduled_date', cutoff);
    if (deleteInstancesError) throw deleteInstancesError;

    // Delete assignments with no past history
    const futureOnlyAssignmentIds = assignmentIds.filter((id) => !assignmentsWithPastInstances.has(id));
    if (futureOnlyAssignmentIds.length > 0) {
      const { error } = await supabase.from('shift_assignments').delete().in('id', futureOnlyAssignmentIds);
      if (error) throw error;
    }

    // Preserve assignments with past history for timesheets
    const pastAssignmentIds = assignmentIds.filter((id) => assignmentsWithPastInstances.has(id));
    if (pastAssignmentIds.length > 0) {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ original_carer_name: carerName, pending_export: true, active: false, updated_at: new Date().toISOString() })
        .in('id', pastAssignmentIds);
      if (error) throw error;
    }
  };

  const handleGenerateInvite = async () => {
    const { data: code, error } = await supabase.rpc('generate_invite', {
      _family_id: familyId,
      _role: 'carer' as const,
    });
    if (error) throw error;
    setGeneratedInviteCode(code);
    return code;
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // 1. Apply the chosen shift action
      if (action === 'reassign') {
        const target = availableCarers.find((c) => c.id === selectedReassignee);
        if (target) {
          await handleReassignShifts(target.id, target.type);
          toast({ title: 'Shifts reassigned', description: `Shifts reassigned to ${target.name}.` });
        }
      } else if (action === 'delete') {
        await handleDeleteShifts();
        toast({
          title: 'Shifts deleted',
          description:
            scope === 'from_date'
              ? `Shifts from ${format(fromDate, 'dd MMM yyyy')} removed for ${carerName}.`
              : `All future shifts removed for ${carerName}.`,
        });
      } else if (action === 'invite') {
        const code = await handleGenerateInvite();
        toast({ title: 'Invite generated', description: `Invite code ${code} created for a replacement carer.` });
        // Reassign existing shifts to a placeholder-free state isn't needed; shifts remain until a new carer joins.
      }

      // 2. Approve the role change
      const approved = await onApprove();
      if (!approved) {
        // Approval failed – keep dialog open so the admin can retry.
        return;
      }

      onScheduleChange?.();
      onClose();
    } catch (error) {
      console.error('Error handling role-change shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shifts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const canConfirm = () => {
    if (processing) return false;
    if (action === 'reassign' && !selectedReassignee) return false;
    return true;
  };

  const showScope = action === 'reassign' || action === 'delete';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processing && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Approve role change
          </DialogTitle>
          <DialogDescription>
            {carerName} is moving from Carer to {newRoleLabel}. Choose what happens to their scheduled shifts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming shifts
            </span>
            <Badge>{futureShiftCount}</Badge>
          </div>

          <RadioGroup value={action} onValueChange={(v) => setAction(v as ShiftAction)} className="gap-3">
            <label htmlFor="rc-reassign" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="reassign" id="rc-reassign" className="mt-1" />
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Reassign shifts
                </div>
                <p className="text-sm text-muted-foreground">Move shifts to another carer or pending carer.</p>
              </div>
            </label>

            <label htmlFor="rc-delete" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="delete" id="rc-delete" className="mt-1" />
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Trash2 className="h-4 w-4" /> Delete shifts
                </div>
                <p className="text-sm text-muted-foreground">Remove upcoming shifts. Past shifts are kept for timesheets.</p>
              </div>
            </label>

            <label htmlFor="rc-invite" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="invite" id="rc-invite" className="mt-1" />
              <div>
                <div className="font-medium flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Generate a carer invite
                </div>
                <p className="text-sm text-muted-foreground">Create an invite code so a replacement carer can take over.</p>
              </div>
            </label>

            <label htmlFor="rc-keep" className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="keep" id="rc-keep" className="mt-1" />
              <div>
                <div className="font-medium">Keep shifts assigned</div>
                <p className="text-sm text-muted-foreground">They stay on their shifts even after the role change.</p>
              </div>
            </label>
          </RadioGroup>

          {action === 'reassign' && (
            <div className="space-y-2">
              <Label>Reassign to</Label>
              {availableCarers.length > 0 ? (
                <AdaptiveSelect
                  value={selectedReassignee}
                  onValueChange={setSelectedReassignee}
                  placeholder="Select a carer"
                  options={availableCarers.map((c) => ({ value: c.id, label: c.name }))}
                />
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No other carers available. Choose delete or generate an invite instead.</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {showScope && (
            <div className="space-y-2">
              <Label>Apply to</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as ShiftScope)} className="gap-2">
                <label htmlFor="rc-scope-all" className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="all" id="rc-scope-all" />
                  All upcoming shifts
                </label>
                <label htmlFor="rc-scope-date" className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="from_date" id="rc-scope-date" />
                  From a specific date
                </label>
              </RadioGroup>
              {scope === 'from_date' && (
                <AdaptiveDatePicker
                  selectedDate={fromDate}
                  onDateChange={(d) => d && setFromDate(d)}
                  minDate={new Date()}
                  placeholder="Choose a start date"
                />
              )}
            </div>
          )}

          {generatedInviteCode && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>
                  Invite code: <span className="font-mono font-semibold">{generatedInviteCode}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteCode);
                    toast({ title: 'Copied', description: 'Invite code copied to clipboard.' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm() || loading}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {processing ? 'Processing...' : 'Approve role change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
