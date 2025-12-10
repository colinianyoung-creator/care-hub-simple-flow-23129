import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Calendar, 
  Check, 
  X, 
  Trash2, 
  Eye, 
  RotateCcw, 
  Archive,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { getShiftTypeColor, getShiftTypeLabel } from "@/lib/shiftUtils";

interface ChangeRequestCardProps {
  request: {
    id: string;
    status: string;
    request_source: string;
    requester_name?: string;
    original_start?: string;
    original_end?: string;
    new_start_time?: string;
    new_end_time?: string;
    new_shift_type?: string;
    reason?: string;
    created_at?: string;
    applied_at?: string;
    reverted_at?: string;
    original_shift_snapshot?: any;
    edit_history?: any[];
    // Leave request fields
    start_date?: string;
    end_date?: string;
    request_type?: string;
    type?: string;
  };
  isAdmin: boolean;
  isCarer: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onDelete?: () => void;
  onViewSnapshot?: () => void;
  onRevert?: () => void;
  onArchive?: () => void;
  onProposeCorrection?: () => void;
}

export const ChangeRequestCard = ({
  request,
  isAdmin,
  isCarer,
  onApprove,
  onDeny,
  onDelete,
  onViewSnapshot,
  onRevert,
  onArchive,
  onProposeCorrection
}: ChangeRequestCardProps) => {
  const isMobile = useIsMobile();
  
  const getStatusBadge = () => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      'pending': { variant: 'outline', label: 'Pending', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
      'approved': { variant: 'outline', label: 'Approved', className: 'border-green-500 text-green-700 bg-green-50' },
      'applied': { variant: 'default', label: 'Applied', className: 'bg-green-600' },
      'denied': { variant: 'destructive', label: 'Denied' },
      'rejected': { variant: 'destructive', label: 'Rejected' },
      'archived': { variant: 'secondary', label: 'Archived' },
      'reverted': { variant: 'outline', label: 'Reverted', className: 'border-orange-500 text-orange-700 bg-orange-50' }
    };

    const config = statusConfig[request.status] || { variant: 'outline', label: request.status };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const isShiftChange = request.request_source === 'shift_change';
  const isPending = request.status === 'pending';
  const isApplied = request.status === 'applied' || request.status === 'approved';
  const isReverted = request.status === 'reverted';
  const isDenied = request.status === 'denied' || request.status === 'rejected';
  const isArchived = request.status === 'archived';

  // Get the shift type for color coding
  const getRequestShiftType = () => {
    if (isShiftChange) {
      return request.new_shift_type || 'basic';
    }
    return request.request_type || request.type || 'annual_leave';
  };

  // Mobile card layout - badge style matching MobileDayView
  if (isMobile) {
    const shiftType = getRequestShiftType();
    const colorClass = getShiftTypeColor(shiftType);
    
    return (
      <div className={`${colorClass} rounded-lg p-4 space-y-3`}>
        {/* Header: Name and Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">
              {request.requester_name || 'Unknown'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-white/20 text-white text-xs border-0">
                {isShiftChange ? 'Shift Change' : getShiftTypeLabel(shiftType)}
              </Badge>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {/* Date/Time Info */}
        <div className="text-white/90 text-sm space-y-1">
          {isShiftChange ? (
            <>
              {request.new_start_time && (
                <div>
                  {formatDateTime(request.new_start_time)}
                  {request.new_end_time && ` - ${format(new Date(request.new_end_time), 'h:mm a')}`}
                </div>
              )}
            </>
          ) : (
            <div>
              {formatDate(request.start_date)}
              {request.end_date && request.end_date !== request.start_date && ` - ${formatDate(request.end_date)}`}
            </div>
          )}
          {request.reason && (
            <div className="text-xs text-white/70 truncate">{request.reason}</div>
          )}
        </div>

        {/* Actions - touch-friendly */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/20">
          {isPending && isAdmin && (
            <>
              <Button 
                size="sm" 
                onClick={onApprove}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                onClick={onDeny}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
              >
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </>
          )}
          
          {isApplied && request.original_shift_snapshot && (
            <Button 
              size="sm" 
              onClick={onViewSnapshot}
              className="bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
            >
              <Eye className="h-4 w-4 mr-1" />
              Original
            </Button>
          )}
          
          {isApplied && isAdmin && (
            <>
              <Button 
                size="sm" 
                onClick={onRevert}
                className="bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Revert
              </Button>
              <Button 
                size="sm" 
                onClick={onArchive}
                className="bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
              >
                <Archive className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {isReverted && isAdmin && (
            <Button 
              size="sm" 
              onClick={onArchive}
              className="bg-white/20 hover:bg-white/30 text-white border-0 min-h-[44px]"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}
          
          {(isPending || isDenied) && (isCarer || isAdmin) && (
            <Button 
              size="sm" 
              onClick={onDelete}
              className="bg-red-600/50 hover:bg-red-600/70 text-white border-0 min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout - original card style
  return (
    <div className="flex flex-col p-3 sm:p-4 border rounded-lg space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isShiftChange ? (
            <Badge variant="outline" className="w-fit">
              <Clock className="h-3 w-3 mr-1" />
              Shift Change
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit">
              <Calendar className="h-3 w-3 mr-1" />
              Leave Request
            </Badge>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isShiftChange ? (
          <>
            <div className="font-medium text-sm md:text-base">
              {request.requester_name || 'Unknown'}
            </div>
            {request.original_start && (
              <div className="text-sm text-muted-foreground mt-1">
                <span className="text-xs uppercase tracking-wide">Original:</span>{' '}
                {formatDateTime(request.original_start)} - {request.original_end ? format(new Date(request.original_end), 'h:mm a') : 'N/A'}
              </div>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              <span className="text-xs uppercase tracking-wide">Requested:</span>{' '}
              {formatDateTime(request.new_start_time)} - {request.new_end_time ? format(new Date(request.new_end_time), 'h:mm a') : 'N/A'}
              {request.new_shift_type && request.new_shift_type !== 'basic' && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {request.new_shift_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="font-medium capitalize text-sm md:text-base">
              {request.request_type?.replace('_', ' ') || request.type?.replace('_', ' ') || 'Leave Request'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatDate(request.start_date)} {request.end_date && `- ${formatDate(request.end_date)}`}
            </div>
          </>
        )}

        {request.reason && (
          <div className="text-sm text-muted-foreground mt-1">
            <span className="text-xs uppercase tracking-wide">Reason:</span> {request.reason}
          </div>
        )}

        {/* Applied/Reverted timestamps */}
        {isApplied && request.applied_at && (
          <div className="text-xs text-green-600 mt-2">
            Applied on {formatDate(request.applied_at)}
          </div>
        )}
        {isReverted && request.reverted_at && (
          <div className="text-xs text-orange-600 mt-2">
            Reverted on {formatDate(request.reverted_at)}
          </div>
        )}
      </div>

      {/* Edit History Accordion */}
      {request.edit_history && request.edit_history.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="history" className="border-none">
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              <div className="flex items-center gap-1">
                <History className="h-3 w-3" />
                View History ({request.edit_history.length} entries)
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-xs">
                {request.edit_history.map((entry: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-muted-foreground">
                    <span className="font-medium capitalize">{entry.action}</span>
                    {entry.timestamp && (
                      <span className="ml-2">{formatDateTime(entry.timestamp)}</span>
                    )}
                    {entry.note && <p className="mt-1">{entry.note}</p>}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {/* Pending actions */}
        {isPending && isAdmin && (
          <>
            <Button 
              size="sm" 
              onClick={onApprove}
              className="flex-1 sm:flex-none text-sm min-h-[44px] sm:min-h-[36px]"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onDeny}
              className="flex-1 sm:flex-none text-sm min-h-[44px] sm:min-h-[36px]"
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </>
        )}

        {/* Applied/Approved actions */}
        {isApplied && (
          <>
            {request.original_shift_snapshot && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onViewSnapshot}
                className="text-sm min-h-[44px] sm:min-h-[36px]"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Original
              </Button>
            )}
            {isAdmin && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onRevert}
                  className="text-sm min-h-[44px] sm:min-h-[36px]"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Revert
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onArchive}
                  className="text-sm min-h-[44px] sm:min-h-[36px]"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              </>
            )}
          </>
        )}

        {/* Reverted - just show archive option */}
        {isReverted && isAdmin && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onArchive}
            className="text-sm min-h-[44px] sm:min-h-[36px]"
          >
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
        )}

        {/* Delete for pending/denied */}
        {(isPending || isDenied) && (isCarer || isAdmin) && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onDelete}
            className="text-sm min-h-[44px] sm:min-h-[36px] text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};
