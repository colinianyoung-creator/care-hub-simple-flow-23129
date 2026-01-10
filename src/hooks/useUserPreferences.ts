import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ThemeOption = 'light' | 'dark' | 'system';
export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type Language = 'en-GB' | 'en-US' | 'es' | 'fr' | 'de' | 'cy';

export interface UserPreferences {
  theme: ThemeOption;
  time_format: TimeFormat;
  date_format: DateFormat;
  reduced_motion: boolean;
  high_contrast: boolean;
  font_size: FontSize;
  language: Language;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  time_format: '24h',
  date_format: 'DD/MM/YYYY',
  reduced_motion: false,
  high_contrast: false,
  font_size: 'medium',
  language: 'en-GB'
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const applyAccessibilityClasses = useCallback((prefs: UserPreferences) => {
    const html = document.documentElement;
    
    // Font size classes
    html.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    html.classList.add(`font-${prefs.font_size}`);
    
    // Reduced motion
    if (prefs.reduced_motion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }
    
    // High contrast
    if (prefs.high_contrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
    
    // Language attribute
    html.setAttribute('lang', prefs.language);
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('theme, time_format, date_format, reduced_motion, high_contrast, font_size, language')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const newPreferences: UserPreferences = {
          theme: (profile.theme as ThemeOption) || 'light',
          time_format: (profile.time_format as TimeFormat) || '24h',
          date_format: (profile.date_format as DateFormat) || 'DD/MM/YYYY',
          reduced_motion: profile.reduced_motion ?? false,
          high_contrast: profile.high_contrast ?? false,
          font_size: (profile.font_size as FontSize) || 'medium',
          language: (profile.language as Language) || 'en-GB'
        };
        setPreferences(newPreferences);
        applyAccessibilityClasses(newPreferences);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [applyAccessibilityClasses]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', user.id);

      if (error) throw error;

      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      applyAccessibilityClasses(newPreferences);
      
      toast({
        title: "Preference saved",
        description: "Your preference has been updated.",
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
    refetch: fetchPreferences
  };
};
