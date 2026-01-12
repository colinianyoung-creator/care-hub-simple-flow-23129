import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

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

const applyAccessibilityClasses = (prefs: UserPreferences) => {
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
};

const fetchUserPreferences = async (): Promise<UserPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFERENCES;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('theme, time_format, date_format, reduced_motion, high_contrast, font_size, language')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  if (profile) {
    return {
      theme: (profile.theme as ThemeOption) || 'light',
      time_format: (profile.time_format as TimeFormat) || '24h',
      date_format: (profile.date_format as DateFormat) || 'DD/MM/YYYY',
      reduced_motion: profile.reduced_motion ?? false,
      high_contrast: profile.high_contrast ?? false,
      font_size: (profile.font_size as FontSize) || 'medium',
      language: (profile.language as Language) || 'en-GB'
    };
  }

  return DEFAULT_PREFERENCES;
};

export const useUserPreferences = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const queryKey = ['user_preferences'];

  const { data: preferences = DEFAULT_PREFERENCES, isLoading: loading } = useQuery({
    queryKey,
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Apply accessibility classes when preferences change
  useEffect(() => {
    if (preferences) {
      applyAccessibilityClasses(preferences);
    }
  }, [preferences]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof UserPreferences; value: UserPreferences[keyof UserPreferences] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', user.id);

      if (error) throw error;
      return { key, value };
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousPreferences = queryClient.getQueryData<UserPreferences>(queryKey);

      // Optimistically update
      queryClient.setQueryData<UserPreferences>(queryKey, (old) => ({
        ...old!,
        [key]: value
      }));

      // Apply changes immediately
      const newPrefs = { ...previousPreferences!, [key]: value };
      applyAccessibilityClasses(newPrefs);
      
      // Handle language change immediately
      if (key === 'language') {
        i18n.changeLanguage(value as string);
      }

      return { previousPreferences };
    },
    onSuccess: () => {
      toast({
        title: t('notifications.preferenceSaved'),
        description: t('notifications.preferenceUpdated'),
      });
    },
    onError: (error, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKey, context.previousPreferences);
        applyAccessibilityClasses(context.previousPreferences);
        
        // Revert language if it was the one that failed
        i18n.changeLanguage(context.previousPreferences.language);
      }
      console.error('Error updating preference:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorSaving'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    updateMutation.mutate({ key, value });
  }, [updateMutation]);

  return {
    preferences,
    loading,
    updatePreference,
    refetch: () => queryClient.invalidateQueries({ queryKey })
  };
};
