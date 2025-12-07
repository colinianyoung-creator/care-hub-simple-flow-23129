import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ConflictData {
  type: string;
  time_entry_id?: string;
  applied_at?: string;
  modified_at?: string;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictData | null;
  onForceRevert: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConflictResolutionModal = ({
  open,
  onOpenChange,
  conflicts,
  onForceRevert,
  onCancel,
  isLoading = false
}: ConflictResolutionModalProps) => {
  if (!conflicts) return null;

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The shift has been modified since this change was applied
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Auto-Revert</AlertTitle>
            <AlertDescription>
              The underlying shift was modified after this change was applied. 
              Reverting may override newer changes.
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Change Applied At</p>
                <p className="font-medium">{formatDateTime(conflicts.applied_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Shift Modified At</p>
                <p className="font-medium text-destructive">{formatDateTime(conflicts.modified_at)}</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Options:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Force Revert:</strong> Override recent changes and restore original state</li>
              <li><strong>Cancel:</strong> Keep the current state and resolve manually</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onForceRevert}
            disabled={isLoading}
          >
            {isLoading ? 'Reverting...' : 'Force Revert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
