import React from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeOption } from '@/hooks/useUserPreferences';

interface AppearanceSettingsProps {
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
  disabled?: boolean;
}

export const AppearanceSettings = ({
  theme,
  onThemeChange,
  disabled = false
}: AppearanceSettingsProps) => {
  const { t } = useTranslation();

  const THEME_OPTIONS: { value: ThemeOption; labelKey: string; icon: React.ReactNode; descriptionKey: string }[] = [
    {
      value: 'light',
      labelKey: 'settings.lightMode',
      icon: <Sun className="h-4 w-4 sm:h-5 sm:w-5" />,
      descriptionKey: 'settings.lightDescription'
    },
    {
      value: 'dark',
      labelKey: 'settings.darkMode',
      icon: <Moon className="h-4 w-4 sm:h-5 sm:w-5" />,
      descriptionKey: 'settings.darkDescription'
    },
    {
      value: 'system',
      labelKey: 'settings.systemDefault',
      icon: <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />,
      descriptionKey: 'settings.systemDescription'
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4 min-w-0 overflow-hidden">
      <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        {t('settings.themeSubtitle')}
      </div>
      
      <RadioGroup
        value={theme}
        onValueChange={(value) => onThemeChange(value as ThemeOption)}
        disabled={disabled}
        className="space-y-2 sm:space-y-3"
      >
        {THEME_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={option.value}
            className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="text-muted-foreground shrink-0">
                {option.icon}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm sm:text-base">{t(option.labelKey)}</div>
                <p className="text-xs text-muted-foreground">
                  {t(option.descriptionKey)}
                </p>
              </div>
            </div>
            <RadioGroupItem 
              value={option.value} 
              id={option.value} 
              className="shrink-0 scale-90 sm:scale-100"
            />
          </label>
        ))}
      </RadioGroup>
    </div>
  );
};
