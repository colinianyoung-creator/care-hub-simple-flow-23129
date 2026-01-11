import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye, Zap, Type } from 'lucide-react';

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface AccessibilitySettingsProps {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  onReducedMotionChange: (enabled: boolean) => void;
  onHighContrastChange: (enabled: boolean) => void;
  onFontSizeChange: (size: FontSize) => void;
  disabled?: boolean;
}

export const AccessibilitySettings = ({
  reducedMotion,
  highContrast,
  fontSize,
  onReducedMotionChange,
  onHighContrastChange,
  onFontSizeChange,
  disabled = false,
}: AccessibilitySettingsProps) => {
  const { t } = useTranslation();

  const fontSizeOptions = [
    { value: 'small' as FontSize, label: t('accessibility.small'), description: '14px' },
    { value: 'medium' as FontSize, label: t('accessibility.medium'), description: '16px' },
    { value: 'large' as FontSize, label: t('accessibility.large'), description: '18px' },
    { value: 'extra-large' as FontSize, label: t('accessibility.extraLarge'), description: '20px' },
  ];

  return (
    <div className="space-y-6">
      {/* Motion & Animation Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {t('accessibility.motionAnimation')}
        </h4>
        <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
          <div className="space-y-0.5 flex-1 min-w-0 pr-3">
            <Label htmlFor="reduced-motion" className="text-sm sm:text-base">
              {t('accessibility.reducedMotion')}
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('accessibility.reducedMotionDescription')}
            </p>
          </div>
          <div className="flex-shrink-0 scale-90 sm:scale-100">
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={onReducedMotionChange}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Visual Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {t('accessibility.visual')}
        </h4>
        <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
          <div className="space-y-0.5 flex-1 min-w-0 pr-3">
            <Label htmlFor="high-contrast" className="text-sm sm:text-base">
              {t('accessibility.highContrast')}
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('accessibility.highContrastDescription')}
            </p>
          </div>
          <div className="flex-shrink-0 scale-90 sm:scale-100">
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={onHighContrastChange}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Text Size Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          {t('accessibility.textSize')}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t('accessibility.textSizeDescription')}
        </p>
        <RadioGroup
          value={fontSize}
          onValueChange={(value) => onFontSizeChange(value as FontSize)}
          className="space-y-2"
          disabled={disabled}
        >
          {fontSizeOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 sm:space-x-3 rounded-lg border p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 scale-90 sm:scale-100">
                <RadioGroupItem value={option.value} id={`font-${option.value}`} />
              </div>
              <div className="flex-1 min-w-0">
                <Label htmlFor={`font-${option.value}`} className="text-sm sm:text-base cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Preview */}
        <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('accessibility.preview')}</p>
          <p
            className="text-foreground"
            style={{
              fontSize:
                fontSize === 'small' ? '14px' :
                fontSize === 'medium' ? '16px' :
                fontSize === 'large' ? '18px' : '20px',
            }}
          >
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </div>
    </div>
  );
};
