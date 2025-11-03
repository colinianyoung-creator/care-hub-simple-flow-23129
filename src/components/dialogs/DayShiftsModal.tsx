import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Clock, Edit, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { formatShiftType } from "@/lib/textUtils";
import { supabase } from '@/integrations/supabase/client';
import { getShiftTypeColor } from '@/lib/shiftUtils';

interface DayShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  shifts: any[];
  carersMap: Record<string, string>;
  userRole: string;
  onEditShift?: (shift: any) => void;
  onDeleteShift?: (shiftId: string) => void;
  getDisplayNames: (shift: any) => string;
  handleShiftClick: (shift: any) => void;
  canEditShift: () => boolean;
}

export const DayShiftsModal: React.FC<DayShiftsModalProps> = ({
  isOpen,
  onClose,
  date,
  shifts,
  carersMap,
  userRole,
  onEditShift,
  onDeleteShift,
  getDisplayNames,
  handleShiftClick,
  canEditShift
}) => {
  const [carerProfiles, setCarerProfiles] = useState<Record<string, { profile_picture_url: string | null; full_name: string }>>({});

  useEffect(() => {
    const fetchCarerProfiles = async () => {
      const carerIds = [...new Set(shifts.map(s => s.carer_id).filter(Boolean))];
      const profiles: Record<string, any> = {};

      for (const carerId of carerIds) {
        try {
          const { data } = await supabase.rpc('get_profile_safe');
          if (data?.[0]) {
            profiles[carerId] = {
              profile_picture_url: data[0].profile_picture_url,
              full_name: data[0].full_name
            };
          }
        } catch (error) {
          console.error('Error fetching carer profile:', error);
        }
      }

      setCarerProfiles(profiles);
    };

    if (shifts.length > 0) {
      fetchCarerProfiles();
    }
  }, [shifts]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Shifts for {format(date, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {shifts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No shifts scheduled for this day.
            </p>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group relative"
                onClick={() => handleShiftClick(shift)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    
                    <Badge 
                      className={`${getShiftTypeColor(shift.shift_type, shift.is_leave_request)} mb-2`}
                    >
                      {formatShiftType(shift.shift_type || shift.type || 'basic')}
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      <ProfileAvatar 
                        profilePicturePath={carerProfiles[shift.carer_id]?.profile_picture_url || undefined}
                        fallbackIcon={<span className="text-xs">{getInitials(shift.carer_name || carersMap[shift.carer_id] || 'UC')}</span>}
                        className="h-8 w-8"
                      />
                      <p className="text-sm text-muted-foreground">
                        {shift.carer_name || carersMap[shift.carer_id] || 'Unknown Carer'}
                      </p>
                    </div>
                    
                    {shift.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Notes: {shift.notes}
                      </p>
                    )}
                  </div>
                  
                  {canEditShift() && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditShift?.(shift);
                          onClose();
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteShift?.(shift.id);
                          onClose();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};