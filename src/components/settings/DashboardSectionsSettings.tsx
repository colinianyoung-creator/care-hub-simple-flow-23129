import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, CheckSquare, FileText, Utensils, Wallet, Users, Pill, Calendar, FileBarChart } from 'lucide-react';
import { ALL_SECTIONS, SectionId } from '@/hooks/useFamilySettings';
import { useTranslation } from 'react-i18next';

interface DashboardSectionsSettingsProps {
  enabledSections: SectionId[];
  onSectionToggle: (sectionId: SectionId, enabled: boolean) => void;
  disabled?: boolean;
}

const getSectionConfig = (t: (key: string) => string): Record<SectionId, { labelKey: string; icon: React.ReactNode; descriptionKey: string }> => ({
  'scheduling': {
    labelKey: 'dashboardSections.scheduling.label',
    icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.scheduling.description'
  },
  'tasks': {
    labelKey: 'dashboardSections.tasks.label',
    icon: <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.tasks.description'
  },
  'notes': {
    labelKey: 'dashboardSections.notes.label',
    icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.notes.description'
  },
  'diet': {
    labelKey: 'dashboardSections.diet.label',
    icon: <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.diet.description'
  },
  'money': {
    labelKey: 'dashboardSections.money.label',
    icon: <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.money.description'
  },
  'key-information': {
    labelKey: 'dashboardSections.keyInformation.label',
    icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.keyInformation.description'
  },
  'medications': {
    labelKey: 'dashboardSections.medications.label',
    icon: <Pill className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.medications.description'
  },
  'appointments': {
    labelKey: 'dashboardSections.appointments.label',
    icon: <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.appointments.description'
  },
  'ai-reports': {
    labelKey: 'dashboardSections.aiReports.label',
    icon: <FileBarChart className="h-4 w-4 sm:h-5 sm:w-5" />,
    descriptionKey: 'dashboardSections.aiReports.description'
  }
});

export const DashboardSectionsSettings = ({
  enabledSections,
  onSectionToggle,
  disabled = false
}: DashboardSectionsSettingsProps) => {
  const { t } = useTranslation();
  const SECTION_CONFIG = getSectionConfig(t);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        {t('dashboardSections.subtitle')}
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        {ALL_SECTIONS.map((sectionId) => {
          const config = SECTION_CONFIG[sectionId];
          const isEnabled = enabledSections.includes(sectionId);
          
          return (
            <div
              key={sectionId}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="text-muted-foreground shrink-0">
                  {config.icon}
                </div>
                <div className="min-w-0">
                  <Label htmlFor={sectionId} className="font-medium cursor-pointer text-sm sm:text-base">
                    {t(config.labelKey)}
                  </Label>
                  <p className="text-xs text-muted-foreground truncate">
                    {t(config.descriptionKey)}
                  </p>
                </div>
              </div>
              <Switch
                id={sectionId}
                checked={isEnabled}
                onCheckedChange={(checked) => onSectionToggle(sectionId, checked)}
                disabled={disabled}
                size="sm"
                className="shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
