import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ThemeOption = 'light' | 'dark' | 'system';
export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface UserPreferences {
  theme: ThemeOption;
  time_format: TimeFormat;
  date_format: DateFormat;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  time_format: '24h',
  date_format: 'DD/MM/YYYY'
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('theme, time_format, date_format')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setPreferences({
          theme: (profile.theme as ThemeOption) || 'light',
          time_format: (profile.time_format as TimeFormat) || '24h',
          date_format: (profile.date_format as DateFormat) || 'DD/MM/YYYY'
        });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

      setPreferences(prev => ({ ...prev, [key]: value }));
      
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
