import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface DoseCardProps {
  dueTime: string;
  status: 'pending' | 'given' | 'refused' | 'missed';
  givenBy?: string;
  administeredAt?: string;
  note?: string;
  onClick: () => void;
  onMarkGiven?: () => void;
  onMarkRefused?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'given':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'refused':
      return <XCircle className="h-5 w-5 text-blue-600" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case 'missed':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; className: string }> = {
    given: { label: 'Given', className: 'bg-green-100 text-green-800 border-green-200' },
    refused: { label: 'Refused', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    missed: { label: 'Missed', className: 'bg-red-100 text-red-800 border-red-200' },
  };

  const variant = variants[status] || variants.pending;
  
  return (
    <Badge variant="outline" className={cn("font-medium", variant.className)}>
      {variant.label}
    </Badge>
  );
};

export const DoseCard = ({ 
  dueTime, 
  status, 
  givenBy, 
  administeredAt,
  note,
  onClick,
  onMarkGiven,
  onMarkRefused
}: DoseCardProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-all",
        status === 'given' && "border-green-300 bg-green-50",
        status === 'missed' && "border-red-300 bg-red-50",
        status === 'refused' && "border-blue-300 bg-blue-50",
        status === 'pending' && "border-yellow-300 bg-yellow-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <div>
            <p className="font-semibold text-sm">{format(new Date(`2000-01-01T${dueTime}`), 'h:mm a')}</p>
            {givenBy && (
              <p className="text-xs text-muted-foreground">By {givenBy}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          {getStatusBadge(status)}
          {administeredAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(administeredAt), 'h:mm a')}
            </p>
          )}
        </div>
      </div>
      {note && (
        <p className="text-xs text-muted-foreground mt-2 pl-7">{note}</p>
      )}
      {status === 'pending' && (onMarkGiven || onMarkRefused) && (
        <div className={cn("mt-3 pt-3 border-t border-border", isMobile ? "flex flex-col gap-2" : "flex gap-2")}>
          {onMarkGiven && (
            <Button
              size="sm"
              variant="success"
              className={isMobile ? "w-full" : "flex-1"}
              onClick={(e) => {
                e.stopPropagation();
                onMarkGiven();
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Given
            </Button>
          )}
          {onMarkRefused && (
            <Button
              size="sm"
              variant="destructive"
              className={isMobile ? "w-full" : "flex-1"}
              onClick={(e) => {
                e.stopPropagation();
                onMarkRefused();
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Refused
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
