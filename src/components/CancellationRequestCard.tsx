import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ConflictDetail {
  shift_id: string;
  carer_id: string;
  carer_name: string;
  date: string;
  time: string;
}

interface CancellationRequest {
  id: string;
  status: string;
  conflict_shift_ids: string[];
  conflict_details: ConflictDetail[];
  created_at: string;
  requester_name: string;
  leave_date: string;
  leave_type: string;
  original_carer_name: string;
}

interface CancellationRequestCardProps {
  request: CancellationRequest;
  isAdmin: boolean;
  onApprove: (requestId: string, timeEntryId: string, conflictShiftIds: string[]) => void;
  onDeny: (requestId: string) => void;
  timeEntryId: string;
}

export const CancellationRequestCard = ({ 
  request, 
  isAdmin, 
  onApprove, 
  onDeny,
  timeEntryId 
}: CancellationRequestCardProps) => {
  const hasConflicts = request.conflict_shift_ids && request.conflict_shift_ids.length > 0;
  
  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'annual_leave': 'Annual Leave',
      'sickness': 'Sickness',
      'public_holiday': 'Public Holiday',
      'leave': 'Leave'
    };
    return labels[type] || type?.replace(/_/g, ' ') || 'Leave';
  };

  return (
    <Card className={`border-l-4 ${hasConflicts ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-muted">
                Leave Cancellation
              </Badge>
              {hasConflicts && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cover Conflict
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium mt-1">
              {request.requester_name} wants to cancel their {getLeaveTypeLabel(request.leave_type)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {format(new Date(request.leave_date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Conflict Warning */}
        {hasConflicts && request.conflict_details && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {request.conflict_shift_ids.length} cover shift{request.conflict_shift_ids.length > 1 ? 's' : ''} will be removed
              </span>
            </div>
            <ul className="text-xs space-y-1 text-amber-600 dark:text-amber-300">
              {request.conflict_details.map((conflict, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    <strong>{conflict.carer_name}</strong> - {conflict.date} ({conflict.time})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requested timestamp */}
        <p className="text-xs text-muted-foreground">
          Requested {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
        </p>

        {/* Admin Actions */}
        {isAdmin && request.status === 'pending' && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={() => onApprove(request.id, timeEntryId, request.conflict_shift_ids)}
              className="flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Approve{hasConflicts ? ' & Remove Cover' : ''}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeny(request.id)}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Deny
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
