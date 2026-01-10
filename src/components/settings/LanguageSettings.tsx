import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type Language = 'en-GB' | 'en-US' | 'es' | 'fr' | 'de' | 'cy';

interface LanguageSettingsProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'en-GB', label: 'English (UK)', nativeLabel: 'English (UK)' },
  { value: 'en-US', label: 'English (US)', nativeLabel: 'English (US)' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' },
  { value: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { value: 'cy', label: 'Welsh', nativeLabel: 'Cymraeg' },
];

export const LanguageSettings = ({
  language,
  onLanguageChange,
  disabled = false,
}: LanguageSettingsProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          App Language
        </h4>
        <p className="text-sm text-muted-foreground">
          Select your preferred language for the app interface
        </p>

        <Select
          value={language}
          onValueChange={(value) => onLanguageChange(value as Language)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span>{option.label}</span>
                  {option.label !== option.nativeLabel && (
                    <span className="text-muted-foreground">({option.nativeLabel})</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Some content may still appear in English until fully translated. Your language preference
          will be saved and applied when translations become available.
        </AlertDescription>
      </Alert>
    </div>
  );
};
