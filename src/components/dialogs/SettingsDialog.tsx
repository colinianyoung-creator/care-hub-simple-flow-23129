import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

import i18n from '@/lib/i18n';

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
  const { t } = useTranslation();
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
    // Update i18n language immediately for real-time effect
    i18n.changeLanguage(language);
  };

  // Sync theme on preferences load
  useEffect(() => {
    if (preferences.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences.theme, setTheme]);

  // Sync language on preferences load
  useEffect(() => {
    if (preferences.language && i18n.language !== preferences.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={isAdmin && familyId ? "dashboard" : "appearance"} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className={`grid w-full ${tabCount === 5 ? 'grid-cols-5' : 'grid-cols-4'} h-auto flex-shrink-0`}>
            {isAdmin && familyId && (
              <TabsTrigger value="dashboard" className="flex items-center gap-1 px-1.5 sm:px-2 py-2 text-xs sm:text-sm">
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden md:inline truncate">{t('settings.dashboard')}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance" className="flex items-center gap-1 px-1.5 sm:px-2 py-2 text-xs sm:text-sm">
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden md:inline truncate">{t('settings.appearance')}</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-1 px-1.5 sm:px-2 py-2 text-xs sm:text-sm">
              <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden md:inline truncate">{t('settings.display')}</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-1 px-1.5 sm:px-2 py-2 text-xs sm:text-sm">
              <Accessibility className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden md:inline truncate">{t('settings.accessibility')}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-1 px-1.5 sm:px-2 py-2 text-xs sm:text-sm">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden md:inline truncate">{t('settings.language')}</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-4 overflow-y-auto min-h-0">
            <div className="px-1 pb-4">
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
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
