import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BulkDeleteShiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  mode: 'all' | 'carer' | 'placeholder';
  carerId?: string;
  carerName?: string;
  onSuccess?: () => void;
}

export const BulkDeleteShiftsDialog = ({
  isOpen,
  onClose,
  familyId,
  mode,
  carerId,
  carerName,
  onSuccess,
}: BulkDeleteShiftsDialogProps) => {
  const [shiftCount, setShiftCount] = useState<number | null>(null);
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const confirmPhrase = mode === 'all' ? 'DELETE ALL' : carerName || 'DELETE';

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      loadShiftCounts();
    }
  }, [isOpen, familyId, mode, carerId]);

  const loadShiftCounts = async () => {
    setLoading(true);
    try {
      if (mode === 'all') {
        // Count all time_entries for family
        const { count: timeCount, error: timeError } = await supabase
          .from('time_entries')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId);

        if (timeError) throw timeError;
        setShiftCount(timeCount || 0);

        // Count all shift_assignments for family
        const { count: assignCount, error: assignError } = await supabase
          .from('shift_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId);

        if (assignError) throw assignError;
        setAssignmentCount(assignCount || 0);
      } else if (mode === 'carer' && carerId) {
        // Count time_entries for specific carer
        const { count: timeCount, error: timeError } = await supabase
          .from('time_entries')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId)
          .eq('user_id', carerId);

        if (timeError) throw timeError;
        setShiftCount(timeCount || 0);
        setAssignmentCount(null);
      } else if (mode === 'placeholder' && carerId) {
        // Count shift_assignments for placeholder carer
        const { count: assignCount, error: assignError } = await supabase
          .from('shift_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyId)
          .eq('placeholder_carer_id', carerId);

        if (assignError) throw assignError;
        setShiftCount(null);
        setAssignmentCount(assignCount || 0);
      }
    } catch (error) {
      console.error('Error loading shift counts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shift count',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== confirmPhrase) return;

    setDeleting(true);
    try {
      if (mode === 'all') {
        // Delete all time_entries for family
        const { error: timeError } = await supabase
          .from('time_entries')
          .delete()
          .eq('family_id', familyId);

        if (timeError) throw timeError;

        // Delete all shift_assignments for family
        const { error: assignError } = await supabase
          .from('shift_assignments')
          .delete()
          .eq('family_id', familyId);

        if (assignError) throw assignError;

        toast({
          title: 'Shifts Deleted',
          description: `Deleted ${shiftCount || 0} time entries and ${assignmentCount || 0} shift assignments`,
        });
      } else if (mode === 'carer' && carerId) {
        // Delete time_entries for specific carer
        const { error: timeError } = await supabase
          .from('time_entries')
          .delete()
          .eq('family_id', familyId)
          .eq('user_id', carerId);

        if (timeError) throw timeError;

        toast({
          title: 'Shifts Deleted',
          description: `Deleted ${shiftCount || 0} shifts for ${carerName}`,
        });
      } else if (mode === 'placeholder' && carerId) {
        // Delete shift_assignments for placeholder carer
        const { error: assignError } = await supabase
          .from('shift_assignments')
          .delete()
          .eq('family_id', familyId)
          .eq('placeholder_carer_id', carerId);

        if (assignError) throw assignError;

        toast({
          title: 'Shifts Deleted',
          description: `Deleted ${assignmentCount || 0} shift assignments for ${carerName}`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete shifts',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const totalCount = (shiftCount || 0) + (assignmentCount || 0);
  const isConfirmValid = confirmText === confirmPhrase;

  const getTitle = () => {
    if (mode === 'all') return 'Delete All Shifts';
    return `Delete Shifts for ${carerName}`;
  };

  const getDescription = () => {
    if (mode === 'all') {
      return 'This will permanently delete ALL shifts and schedule assignments for this care space.';
    }
    return `This will permanently delete all shifts assigned to ${carerName}.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="text-sm font-medium text-destructive mb-2">
                This action cannot be undone!
              </div>
              <div className="text-sm text-muted-foreground">
                {shiftCount !== null && shiftCount > 0 && (
                  <div>• {shiftCount} time {shiftCount === 1 ? 'entry' : 'entries'} will be deleted</div>
                )}
                {assignmentCount !== null && assignmentCount > 0 && (
                  <div>• {assignmentCount} shift {assignmentCount === 1 ? 'assignment' : 'assignments'} will be deleted</div>
                )}
                {totalCount === 0 && (
                  <div>No shifts found to delete</div>
                )}
              </div>
            </div>

            {totalCount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="confirm">
                  Type <span className="font-mono font-bold">{confirmPhrase}</span> to confirm
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmPhrase}
                  className="font-mono"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || deleting || totalCount === 0}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Shifts'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
