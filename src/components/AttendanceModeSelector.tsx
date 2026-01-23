import React from 'react';
import { AdaptiveSelect } from "@/components/adaptive";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, ClipboardCheck, Calculator, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type AttendanceMode = 'none' | 'confirm_only' | 'actuals';

interface AttendanceModeSelectorProps {
  value: AttendanceMode;
  onChange: (value: AttendanceMode) => void;
  disabled?: boolean;
  showLabel?: boolean;
  compact?: boolean;
}

const ATTENDANCE_MODE_CONFIG: Record<AttendanceMode, {
  label: string;
  description: string;
  paySource: string;
  icon: React.ReactNode;
  badgeVariant: 'default' | 'secondary' | 'outline';
}> = {
  none: {
    label: 'No Clock-in',
    description: 'No clock-in required. Pay based on scheduled hours.',
    paySource: 'Scheduled',
    icon: <ClipboardCheck className="h-4 w-4" />,
    badgeVariant: 'secondary'
  },
  confirm_only: {
    label: 'Confirm Attendance',
    description: 'Clock-in confirms attendance. Pay based on scheduled hours.',
    paySource: 'Scheduled',
    icon: <Clock className="h-4 w-4" />,
    badgeVariant: 'default'
  },
  actuals: {
    label: 'Actual Hours',
    description: 'Clock-in required. Pay based on actual hours worked.',
    paySource: 'Actual',
    icon: <Calculator className="h-4 w-4" />,
    badgeVariant: 'outline'
  }
};

export const getAttendanceModeConfig = (mode: AttendanceMode) => {
  return ATTENDANCE_MODE_CONFIG[mode] || ATTENDANCE_MODE_CONFIG.none;
};

export const AttendanceModeSelector = ({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  compact = false
}: AttendanceModeSelectorProps) => {
  const config = getAttendanceModeConfig(value);

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-2">
          <Label>Attendance Mode</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls whether clock-in is required and how pay is calculated.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      <AdaptiveSelect 
        value={value} 
        onValueChange={(v) => onChange(v as AttendanceMode)} 
        disabled={disabled}
        placeholder="Select attendance mode"
        title="Attendance Mode"
        className={compact ? "w-[180px]" : "w-full"}
        options={(Object.keys(ATTENDANCE_MODE_CONFIG) as AttendanceMode[]).map((mode) => {
          const modeConfig = ATTENDANCE_MODE_CONFIG[mode];
          return {
            value: mode,
            label: `${modeConfig.label} (Pay: ${modeConfig.paySource})`
          };
        })}
      />

      {!compact && (
        <p className="text-xs text-muted-foreground">
          {config.description}
        </p>
      )}
    </div>
  );
};

// Badge component for displaying attendance mode inline
export const AttendanceModeBadge = ({ mode }: { mode: AttendanceMode }) => {
  const config = getAttendanceModeConfig(mode);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.badgeVariant} className="gap-1 text-xs">
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
          <p className="text-xs mt-1">Pay source: {config.paySource}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
