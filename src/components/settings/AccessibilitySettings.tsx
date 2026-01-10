import React from 'react';
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

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: '14px - Compact text' },
  { value: 'medium', label: 'Medium', description: '16px - Default size' },
  { value: 'large', label: 'Large', description: '18px - Easier to read' },
  { value: 'extra-large', label: 'Extra Large', description: '20px - Maximum readability' },
];

export const AccessibilitySettings = ({
  reducedMotion,
  highContrast,
  fontSize,
  onReducedMotionChange,
  onHighContrastChange,
  onFontSizeChange,
  disabled = false,
}: AccessibilitySettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Motion & Animation Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Motion & Animation
        </h4>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="reduced-motion" className="text-base">
              Reduce motion
            </Label>
            <p className="text-sm text-muted-foreground">
              Minimizes animations and movement throughout the app
            </p>
          </div>
          <Switch
            id="reduced-motion"
            checked={reducedMotion}
            onCheckedChange={onReducedMotionChange}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Visual Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Visual
        </h4>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="high-contrast" className="text-base">
              High contrast
            </Label>
            <p className="text-sm text-muted-foreground">
              Increases contrast for better visibility
            </p>
          </div>
          <Switch
            id="high-contrast"
            checked={highContrast}
            onCheckedChange={onHighContrastChange}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Text Size Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          Text Size
        </h4>
        <RadioGroup
          value={fontSize}
          onValueChange={(value) => onFontSizeChange(value as FontSize)}
          className="space-y-2"
          disabled={disabled}
        >
          {FONT_SIZE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <RadioGroupItem value={option.value} id={`font-${option.value}`} />
              <div className="flex-1">
                <Label htmlFor={`font-${option.value}`} className="text-base cursor-pointer">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Preview */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-2">Preview</p>
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
