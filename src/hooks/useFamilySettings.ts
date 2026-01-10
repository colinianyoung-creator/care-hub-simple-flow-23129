import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ALL_SECTIONS = [
  'scheduling',
  'tasks',
  'notes',
  'diet',
  'money',
  'key-information',
  'medications',
  'appointments',
  'ai-reports'
] as const;

export type SectionId = typeof ALL_SECTIONS[number];

export interface FamilySettings {
  id: string;
  family_id: string;
  enabled_sections: SectionId[];
  created_at: string;
  updated_at: string;
}

export const useFamilySettings = (familyId?: string) => {
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('family_settings')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          enabled_sections: (data.enabled_sections as SectionId[]) || [...ALL_SECTIONS]
        });
      } else {
        // No settings exist yet, use defaults
        setSettings({
          id: '',
          family_id: familyId,
          enabled_sections: [...ALL_SECTIONS],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching family settings:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateEnabledSections = async (sections: SectionId[]) => {
    if (!familyId) return;

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('family_settings')
        .select('id')
        .eq('family_id', familyId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('family_settings')
          .update({ enabled_sections: sections })
          .eq('family_id', familyId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('family_settings')
          .insert({ family_id: familyId, enabled_sections: sections });

        if (error) throw error;
      }

      setSettings(prev => prev ? { ...prev, enabled_sections: sections } : null);
      
      toast({
        title: "Settings saved",
        description: "Dashboard sections have been updated.",
      });
    } catch (error) {
      console.error('Error updating family settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isSectionEnabled = (sectionId: SectionId): boolean => {
    if (!settings) return true; // Default to all enabled
    return settings.enabled_sections.includes(sectionId);
  };

  return {
    settings,
    loading,
    enabledSections: settings?.enabled_sections || [...ALL_SECTIONS],
    updateEnabledSections,
    isSectionEnabled,
    refetch: fetchSettings
  };
};
