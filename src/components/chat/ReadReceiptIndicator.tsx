import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadReceipt {
  odialogd: string;
  userName: string;
  avatarUrl: string | null;
  lastReadAt: string;
}

interface ReadReceiptIndicatorProps {
  readers: ReadReceipt[];
  isOwn: boolean;
}

export const ReadReceiptIndicator = ({ readers, isOwn }: ReadReceiptIndicatorProps) => {
  if (!isOwn || readers.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5 mt-0.5">
            <CheckCheck className="h-3 w-3 text-primary" />
            <div className="flex -space-x-1.5">
              {readers.slice(0, 3).map((reader) => (
                <Avatar key={reader.odialogd} className="h-3.5 w-3.5 border border-background">
                  {reader.avatarUrl && (
                    <AvatarImage src={reader.avatarUrl} alt={reader.userName} />
                  )}
                  <AvatarFallback className="text-[6px] bg-muted">
                    {reader.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {readers.length > 3 && (
              <span className="text-[9px] text-muted-foreground ml-0.5">
                +{readers.length - 3}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          <p>Read by {readers.map(r => r.userName).join(', ')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
