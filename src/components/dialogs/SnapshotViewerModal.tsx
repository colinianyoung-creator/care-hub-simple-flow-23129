import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Clock, Calendar, User, FileText } from 'lucide-react';

interface SnapshotViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: {
    id?: string;
    clock_in?: string;
    clock_out?: string;
    shift_type?: string;
    notes?: string;
    user_id?: string;
    family_id?: string;
    captured_at?: string;
  } | null;
  title?: string;
}

export const SnapshotViewerModal = ({ 
  open, 
  onOpenChange, 
  snapshot,
  title = "Original Shift State"
}: SnapshotViewerModalProps) => {
  if (!snapshot) return null;

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getShiftTypeLabel = (type: string | undefined) => {
    const labels: Record<string, string> = {
      'basic': 'Basic',
      'cover': 'Cover',
      'annual_leave': 'Annual Leave',
      'sickness': 'Sickness',
      'public_holiday': 'Public Holiday',
      'training': 'Training',
      'other': 'Other'
    };
    return labels[type || 'basic'] || type || 'Basic';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            This is the shift state before the change was applied
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Start Time</p>
                <p className="font-medium">{formatDateTime(snapshot.clock_in)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">End Time</p>
                <p className="font-medium">{formatDateTime(snapshot.clock_out)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Shift Type</p>
                <Badge variant="outline" className="mt-1">
                  {getShiftTypeLabel(snapshot.shift_type)}
                </Badge>
              </div>
            </div>

            {snapshot.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{snapshot.notes}</p>
              </div>
            )}
          </div>

          {snapshot.captured_at && (
            <p className="text-xs text-muted-foreground text-center">
              Captured at {formatDateTime(snapshot.captured_at)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
