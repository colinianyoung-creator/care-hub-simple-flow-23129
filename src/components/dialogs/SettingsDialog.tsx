import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Palette, Monitor, Accessibility, Globe } from 'lucide-react';
import { DashboardSectionsSettings } from '@/components/settings/DashboardSectionsSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { AccessibilitySettings, FontSize } from '@/components/settings/AccessibilitySettings';
import { LanguageSettings, Language } from '@/components/settings/LanguageSettings';
import { useFamilySettings, SectionId } from '@/hooks/useFamilySettings';
import { useUserPreferences, ThemeOption, TimeFormat, DateFormat } from '@/hooks/useUserPreferences';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const tabCount = isAdmin && familyId ? 5 : 4;

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

  const handleReducedMotionChange = (enabled: boolean) => {
    updatePreference('reduced_motion', enabled);
  };

  const handleHighContrastChange = (enabled: boolean) => {
    updatePreference('high_contrast', enabled);
  };

  const handleFontSizeChange = (size: FontSize) => {
    updatePreference('font_size', size);
  };

  const handleLanguageChange = (language: Language) => {
    updatePreference('language', language);
  };

  // Sync theme on preferences load
  useEffect(() => {
    if (preferences.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences.theme, setTheme]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={isAdmin && familyId ? "dashboard" : "appearance"} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className={`grid w-full ${tabCount === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {isAdmin && familyId && (
              <TabsTrigger value="dashboard" className="flex items-center gap-1 px-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden lg:inline text-xs">Dashboard</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance" className="flex items-center gap-1 px-2">
              <Palette className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-1 px-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Display</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-1 px-2">
              <Accessibility className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Access</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-1 px-2">
              <Globe className="h-4 w-4" />
              <span className="hidden lg:inline text-xs">Language</span>
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4">
              {isAdmin && familyId && (
                <TabsContent value="dashboard" className="mt-0">
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
              
              <TabsContent value="appearance" className="mt-0">
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
              
              <TabsContent value="display" className="mt-0">
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

              <TabsContent value="accessibility" className="mt-0">
                {preferencesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <AccessibilitySettings
                    reducedMotion={preferences.reduced_motion}
                    highContrast={preferences.high_contrast}
                    fontSize={preferences.font_size}
                    onReducedMotionChange={handleReducedMotionChange}
                    onHighContrastChange={handleHighContrastChange}
                    onFontSizeChange={handleFontSizeChange}
                  />
                )}
              </TabsContent>

              <TabsContent value="language" className="mt-0">
                {preferencesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <LanguageSettings
                    language={preferences.language}
                    onLanguageChange={handleLanguageChange}
                  />
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
