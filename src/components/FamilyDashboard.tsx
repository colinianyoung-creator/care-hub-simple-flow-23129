import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardHeader } from './DashboardHeader';
import { HeroBanner } from './HeroBanner';
import { ExpandableDashboardSection } from './ExpandableDashboardSection';
import { SchedulingSection } from './sections/SchedulingSection';
import { TasksSection } from './sections/TasksSection';
import { NotesSection } from './sections/NotesSection';
import { DietSection } from './sections/DietSection';
import { MoneySection } from './sections/MoneySection';
import { KeyInformationSection } from './sections/KeyInformationSection';
import { MedicationsSection } from './sections/MedicationsSection';
import { AppointmentsSection } from './sections/AppointmentsSection';
import { Calendar, CheckSquare, FileText, Pill, Users, Clock, Utensils, Wallet, UserPlus, FileBarChart } from 'lucide-react';
import { AIReportsSection } from './sections/AIReportsSection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { logUserContext } from '@/lib/logContext';
import { useFamilySettings } from '@/hooks/useFamilySettings';
import { APP_REFRESH_EVENT } from '@/hooks/useAppRefresh';

interface FamilyDashboardProps {
  onBack?: () => void;
  onSignOut: () => void;
  familyId?: string;
  familyName: string;
  userRole: string;
  canGoBack?: boolean;
  profilePictureUrl?: string;
  careRecipientPictureUrl?: string;
  currentFamilyId?: string;
  onProfileUpdate?: () => void;
  onFamilySelected?: (familyId: string) => void;
}

export const FamilyDashboard = ({ 
  onBack, 
  onSignOut, 
  familyId, 
  familyName,
  userRole,
  canGoBack = false,
  profilePictureUrl = '',
  careRecipientPictureUrl,
  currentFamilyId,
  onProfileUpdate,
  onFamilySelected
}: FamilyDashboardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [careRecipientName, setCareRecipientName] = useState('');
  const [userName, setUserName] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const { isSectionEnabled } = useFamilySettings(familyId);

  const loadData = useCallback(async () => {
    if (familyId) {
      const { data: careRecipient, error: careError } = await supabase
        .from('care_recipients')
        .select('name')
        .eq('family_id', familyId)
        .limit(1)
        .single();
      
      if (!careError && careRecipient) {
        setCareRecipientName(careRecipient.name);
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.rpc('get_profile_safe');
        
        if (profileData && profileData.length > 0) {
          setUserName(profileData[0].full_name || '');
        }
        
        // Log context after data loads
        logUserContext(user, familyId, userRole);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [familyId, userRole]);

  useEffect(() => {
    loadData();

    // Listen for app-wide refresh events
    const handleAppRefresh = () => {
      console.log('[FamilyDashboard] App refresh event received');
      loadData();
    };

    window.addEventListener(APP_REFRESH_EVENT, handleAppRefresh);

    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, handleAppRefresh);
    };
  }, [loadData]);

  const showJoinMessage = !familyId && userRole === 'family_viewer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-care-background to-care-background-alt">
      <DashboardHeader
        familyName={familyName}
        userRole={userRole}
        onSignOut={onSignOut}
        canGoBack={canGoBack}
        onBack={onBack}
        familyId={familyId}
        showInviteButton={!!familyId}
        showCreateButton={!familyId}
        showJoinButton={!familyId}
        onProfileUpdate={() => {
          setLoading(true);
          if (onProfileUpdate) {
            onProfileUpdate();
          }
          setTimeout(() => setLoading(false), 2000);
        }}
        isLoading={loading}
        onFamilySelected={onFamilySelected}
      />

      <div className="container mx-auto px-2 sm:px-4 py-8 space-y-8">
        <HeroBanner 
          title={t('hero.welcomeBack', { name: userName?.split(' ')[0] || t('hero.defaultName') })}
          subtitle={familyId ? t('hero.manageFamilyCare') : t('hero.createOrJoin')}
          careRecipientName={familyId && userRole !== 'disabled_person' ? careRecipientName : undefined}
          profilePictureUrl={careRecipientPictureUrl || profilePictureUrl}
        />

        {showJoinMessage && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">{t('alerts.joinFamily.title')}</p>
              <p className="text-sm mt-1">{t('alerts.joinFamily.description')}</p>
            </AlertDescription>
          </Alert>
        )}

        {!familyId && !showJoinMessage && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">{t('alerts.createOrJoin.title')}</p>
              <p className="text-sm mt-1">{t('alerts.createOrJoin.description')}</p>
            </AlertDescription>
          </Alert>
        )}

        {familyId && (
          <div className="space-y-4">
          {isSectionEnabled('scheduling') && (
            <ExpandableDashboardSection
              id="scheduling"
              titleKey="sectionTitles.schedulingTime"
              defaultOpen={true}
              icon={<Clock className="h-5 w-5" />}
            >
              <SchedulingSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('tasks') && (
            <ExpandableDashboardSection
              id="tasks"
              titleKey="sectionTitles.tasks"
              icon={<CheckSquare className="h-5 w-5" />}
            >
              <TasksSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('notes') && (
            <ExpandableDashboardSection 
              id="notes"
              titleKey="sectionTitles.careNotes"
              icon={<FileText className="h-5 w-5" />}
            >
              <NotesSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('diet') && (
            <ExpandableDashboardSection 
              id="diet"
              titleKey="sectionTitles.dietTracking"
              icon={<Utensils className="h-5 w-5" />}
            >
              <DietSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('money') && (
            <ExpandableDashboardSection 
              id="money"
              titleKey="sectionTitles.moneyTracking"
              icon={<Wallet className="h-5 w-5" />}
            >
              <MoneySection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('key-information') && (
            <ExpandableDashboardSection
              id="key-information"
              titleKey="sectionTitles.keyInformation"
              icon={<Users className="h-5 w-5" />}
            >
              <KeyInformationSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('medications') && (
            <ExpandableDashboardSection
              id="medications"
              titleKey="sectionTitles.medications"
              icon={<Pill className="h-5 w-5" />}
            >
              <MedicationsSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('appointments') && (
            <ExpandableDashboardSection
              id="appointments"
              titleKey="sectionTitles.appointments"
              icon={<Calendar className="h-5 w-5" />}
            >
              <AppointmentsSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          )}

          {isSectionEnabled('ai-reports') && (
            <ExpandableDashboardSection
              id="ai-reports"
              titleKey="sectionTitles.aiReports"
              icon={<FileBarChart className="h-5 w-5" />}
            >
              <AIReportsSection familyId={familyId} userRole={userRole} careRecipientName={careRecipientName} />
            </ExpandableDashboardSection>
          )}
          </div>
        )}
      </div>
      
      <ProfileDialog 
        isOpen={showProfileDialog} 
        onClose={() => setShowProfileDialog(false)}
        currentFamilyId={currentFamilyId}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
};
