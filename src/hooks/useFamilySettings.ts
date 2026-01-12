import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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

const fetchFamilySettings = async (familyId: string): Promise<FamilySettings> => {
  const { data, error } = await supabase
    .from('family_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return {
      ...data,
      enabled_sections: (data.enabled_sections as SectionId[]) || [...ALL_SECTIONS]
    };
  }
  
  // No settings exist yet, return defaults
  return {
    id: '',
    family_id: familyId,
    enabled_sections: [...ALL_SECTIONS],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const useFamilySettings = (familyId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const queryKey = ['family_settings', familyId];

  const { data: settings, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchFamilySettings(familyId!),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (sections: SectionId[]) => {
      if (!familyId) throw new Error('No family ID');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('family_settings')
        .select('id')
        .eq('family_id', familyId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('family_settings')
          .update({ enabled_sections: sections })
          .eq('family_id', familyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('family_settings')
          .insert({ family_id: familyId, enabled_sections: sections });
        if (error) throw error;
      }

      return sections;
    },
    onMutate: async (newSections) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<FamilySettings>(queryKey);

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData<FamilySettings>(queryKey, {
          ...previousSettings,
          enabled_sections: newSections
        });
      }

      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: t('notifications.preferenceSaved'),
        description: t('notifications.preferenceUpdated'),
      });
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKey, context.previousSettings);
      }
      console.error('Error updating family settings:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.errorSaving'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isSectionEnabled = (sectionId: SectionId): boolean => {
    if (!settings) return true;
    return settings.enabled_sections.includes(sectionId);
  };

  return {
    settings: settings || null,
    loading,
    enabledSections: settings?.enabled_sections || [...ALL_SECTIONS],
    updateEnabledSections: updateMutation.mutate,
    isSectionEnabled,
    refetch: () => queryClient.invalidateQueries({ queryKey })
  };
};
