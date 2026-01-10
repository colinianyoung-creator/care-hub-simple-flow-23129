import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, CheckSquare, FileText, Utensils, Wallet, Users, Pill, Calendar, FileBarChart } from 'lucide-react';
import { ALL_SECTIONS, SectionId } from '@/hooks/useFamilySettings';

interface DashboardSectionsSettingsProps {
  enabledSections: SectionId[];
  onSectionToggle: (sectionId: SectionId, enabled: boolean) => void;
  disabled?: boolean;
}

const SECTION_CONFIG: Record<SectionId, { label: string; icon: React.ReactNode; description: string }> = {
  'scheduling': {
    label: 'Scheduling & Time',
    icon: <Clock className="h-5 w-5" />,
    description: 'Manage shifts and time tracking'
  },
  'tasks': {
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
    description: 'Track to-do items and assignments'
  },
  'notes': {
    label: 'Care Notes',
    icon: <FileText className="h-5 w-5" />,
    description: 'Document daily care activities'
  },
  'diet': {
    label: 'Diet Tracking',
    icon: <Utensils className="h-5 w-5" />,
    description: 'Log meals and nutrition'
  },
  'money': {
    label: 'Money Tracking',
    icon: <Wallet className="h-5 w-5" />,
    description: 'Track expenses and income'
  },
  'key-information': {
    label: 'Key Information',
    icon: <Users className="h-5 w-5" />,
    description: 'Important details and contacts'
  },
  'medications': {
    label: 'Medications (MAR)',
    icon: <Pill className="h-5 w-5" />,
    description: 'Medication administration records'
  },
  'appointments': {
    label: 'Appointments',
    icon: <Calendar className="h-5 w-5" />,
    description: 'Manage upcoming appointments'
  },
  'ai-reports': {
    label: 'AI Reports',
    icon: <FileBarChart className="h-5 w-5" />,
    description: 'Generate care summaries'
  }
};

export const DashboardSectionsSettings = ({
  enabledSections,
  onSectionToggle,
  disabled = false
}: DashboardSectionsSettingsProps) => {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Choose which sections appear on your family's dashboard. All family members will see the same sections.
      </div>
      
      <div className="space-y-3">
        {ALL_SECTIONS.map((sectionId) => {
          const config = SECTION_CONFIG[sectionId];
          const isEnabled = enabledSections.includes(sectionId);
          
          return (
            <div
              key={sectionId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {config.icon}
                </div>
                <div>
                  <Label htmlFor={sectionId} className="font-medium cursor-pointer">
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
              <Switch
                id={sectionId}
                checked={isEnabled}
                onCheckedChange={(checked) => onSectionToggle(sectionId, checked)}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
