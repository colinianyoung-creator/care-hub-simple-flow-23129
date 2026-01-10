import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeOption } from '@/hooks/useUserPreferences';

interface AppearanceSettingsProps {
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
  disabled?: boolean;
}

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: <Sun className="h-5 w-5" />,
    description: 'Light background with dark text'
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon className="h-5 w-5" />,
    description: 'Dark background with light text'
  },
  {
    value: 'system',
    label: 'System',
    icon: <Monitor className="h-5 w-5" />,
    description: 'Match your device settings'
  }
];

export const AppearanceSettings = ({
  theme,
  onThemeChange,
  disabled = false
}: AppearanceSettingsProps) => {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Choose how the app looks on your device. This setting only affects your view.
      </div>
      
      <RadioGroup
        value={theme}
        onValueChange={(value) => onThemeChange(value as ThemeOption)}
        disabled={disabled}
        className="space-y-3"
      >
        {THEME_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={option.value}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                {option.icon}
              </div>
              <div>
                <div className="font-medium">{option.label}</div>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
            <RadioGroupItem value={option.value} id={option.value} />
          </label>
        ))}
      </RadioGroup>
    </div>
  );
};
