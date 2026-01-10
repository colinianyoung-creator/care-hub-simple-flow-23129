import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Palette, Monitor } from 'lucide-react';
import { DashboardSectionsSettings } from '@/components/settings/DashboardSectionsSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { useFamilySettings, SectionId } from '@/hooks/useFamilySettings';
import { useUserPreferences, ThemeOption, TimeFormat, DateFormat } from '@/hooks/useUserPreferences';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId?: string;
  userRole?: string;
}

export const SettingsDialog = ({
  isOpen,
  onClose,
  familyId,
  userRole
}: SettingsDialogProps) => {
  const { 
    enabledSections, 
    loading: settingsLoading, 
    updateEnabledSections 
  } = useFamilySettings(familyId);
  
  const { 
    preferences, 
    loading: preferencesLoading, 
    updatePreference 
  } = useUserPreferences();
  
  const { setTheme } = useTheme();

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';

  const handleSectionToggle = (sectionId: SectionId, enabled: boolean) => {
    const newSections = enabled
      ? [...enabledSections, sectionId]
      : enabledSections.filter(s => s !== sectionId);
    updateEnabledSections(newSections);
  };

  const handleThemeChange = (theme: ThemeOption) => {
    updatePreference('theme', theme);
    setTheme(theme);
  };

  const handleTimeFormatChange = (format: TimeFormat) => {
    updatePreference('time_format', format);
  };

  const handleDateFormatChange = (format: DateFormat) => {
    updatePreference('date_format', format);
  };

  // Sync theme on preferences load
  useEffect(() => {
    if (preferences.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences.theme, setTheme]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={isAdmin && familyId ? "dashboard" : "appearance"} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {isAdmin && familyId && (
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Display</span>
            </TabsTrigger>
          </TabsList>
          
          {isAdmin && familyId && (
            <TabsContent value="dashboard" className="mt-4">
              {settingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <DashboardSectionsSettings
                  enabledSections={enabledSections}
                  onSectionToggle={handleSectionToggle}
                />
              )}
            </TabsContent>
          )}
          
          <TabsContent value="appearance" className="mt-4">
            {preferencesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <AppearanceSettings
                theme={preferences.theme}
                onThemeChange={handleThemeChange}
              />
            )}
          </TabsContent>
          
          <TabsContent value="display" className="mt-4">
            {preferencesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <DisplaySettings
                timeFormat={preferences.time_format}
                dateFormat={preferences.date_format}
                onTimeFormatChange={handleTimeFormatChange}
                onDateFormatChange={handleDateFormatChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
