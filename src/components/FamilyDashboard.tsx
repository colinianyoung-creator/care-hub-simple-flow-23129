import React, { useState, useEffect } from 'react';
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
  const { toast } = useToast();
  const [careRecipientName, setCareRecipientName] = useState('');
  const [userName, setUserName] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
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
    };

    loadData();
  }, [familyId, userRole]);

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

      <div className="container mx-auto px-4 py-8 space-y-8">
        <HeroBanner 
          title={`Welcome back, ${userName?.split(' ')[0] || 'there'}`}
          subtitle={familyId ? "Manage your family's care with ease" : "Create or join a family to access care features"}
          careRecipientName={familyId && userRole !== 'disabled_person' ? careRecipientName : undefined}
          profilePictureUrl={careRecipientPictureUrl || profilePictureUrl}
          onProfileClick={() => setShowProfileDialog(true)}
        />

        {showJoinMessage && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">Join a family to access care coordination features</p>
              <p className="text-sm mt-1">Click "Join Family" above or ask a family admin to invite you.</p>
            </AlertDescription>
          </Alert>
        )}

        {!familyId && !showJoinMessage && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">Create or join a family to get started</p>
              <p className="text-sm mt-1">Use the buttons above to create or join a family.</p>
            </AlertDescription>
          </Alert>
        )}

        {familyId && (
          <div className="space-y-4">
          <ExpandableDashboardSection
            id="scheduling"
            title="Scheduling & Time Management"
            defaultOpen={true}
            icon={<Clock className="h-5 w-5" />}
          >
            <SchedulingSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection
            id="tasks"
            title="Tasks"
            icon={<CheckSquare className="h-5 w-5" />}
          >
            <TasksSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection 
            id="notes"
            title="Care Notes" 
            icon={<FileText className="h-5 w-5" />}
          >
            <NotesSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection 
            id="diet"
            title="Diet Tracking" 
            icon={<Utensils className="h-5 w-5" />}
          >
            <DietSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection 
            id="money"
            title="Money Tracking" 
            icon={<Wallet className="h-5 w-5" />}
          >
            <MoneySection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection
            id="key-information"
            title="Key Information"
            icon={<Users className="h-5 w-5" />}
          >
            <KeyInformationSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection
            id="medications"
            title="Medication Administration Record (MAR)"
            icon={<Pill className="h-5 w-5" />}
          >
            <MedicationsSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection
            id="appointments"
            title="Appointments"
            icon={<Calendar className="h-5 w-5" />}
          >
            <AppointmentsSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>

          <ExpandableDashboardSection
            id="ai-reports"
            title="AI Reports"
            icon={<FileBarChart className="h-5 w-5" />}
          >
            <AIReportsSection familyId={familyId} userRole={userRole} careRecipientName={careRecipientName} />
          </ExpandableDashboardSection>
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
