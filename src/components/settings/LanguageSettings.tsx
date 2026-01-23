import React from 'react';
import { useTranslation } from 'react-i18next';
import { AdaptiveSelect } from '@/components/adaptive';
import { Globe, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type Language = 'en-GB' | 'en-US' | 'es' | 'fr' | 'de' | 'cy';

interface LanguageSettingsProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

export const LanguageSettings = ({
  language,
  onLanguageChange,
  disabled = false,
}: LanguageSettingsProps) => {
  const { t } = useTranslation();

  const LANGUAGE_OPTIONS: { value: Language; labelKey: string; nativeLabelKey?: string }[] = [
    { value: 'en-GB', labelKey: 'language.enGB' },
    { value: 'en-US', labelKey: 'language.enUS' },
    { value: 'es', labelKey: 'language.es', nativeLabelKey: 'language.nativeES' },
    { value: 'fr', labelKey: 'language.fr', nativeLabelKey: 'language.nativeFR' },
    { value: 'de', labelKey: 'language.de', nativeLabelKey: 'language.nativeDE' },
    { value: 'cy', labelKey: 'language.cy', nativeLabelKey: 'language.nativeCY' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('language.title')}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t('language.subtitle')}
        </p>

        <AdaptiveSelect
          value={language}
          onValueChange={(value) => onLanguageChange(value as Language)}
          disabled={disabled}
          placeholder={t('language.selectLanguage')}
          title={t('language.title')}
          options={LANGUAGE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.nativeLabelKey 
              ? `${t(option.labelKey)} (${t(option.nativeLabelKey)})`
              : t(option.labelKey)
          }))}
        />
      </div>

      <Alert className="py-2.5 sm:py-3">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          {t('language.translationNotice')}
        </AlertDescription>
      </Alert>
    </div>
  );
};
