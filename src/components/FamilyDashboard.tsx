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
import { Calendar, CheckSquare, FileText, Pill, Users, Clock, Utensils, Wallet, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface FamilyDashboardProps {
  onBack?: () => void;
  onSignOut: () => void;
  familyId?: string;
  familyName: string;
  userRole: string;
  canGoBack?: boolean;
  profilePictureUrl?: string;
  currentFamilyId?: string;
  onProfileUpdate?: () => void;
}

export const FamilyDashboard = ({ 
  onBack, 
  onSignOut, 
  familyId, 
  familyName,
  userRole,
  canGoBack = false,
  profilePictureUrl = '',
  currentFamilyId,
  onProfileUpdate
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
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadData();
  }, [familyId]);

  const isAdminRole = userRole === 'family_admin' || userRole === 'disabled_person';
  const isViewerRole = userRole === 'family_viewer';
  const canEditWithoutFamily = isAdminRole; // Admin roles can edit sections even without family
  const showJoinMessage = !familyId && isViewerRole; // Viewers need to join a family first

  return (
    <div className="min-h-screen bg-gradient-to-br from-care-background to-care-background-alt">
      <DashboardHeader
        familyName={familyName}
        userRole={userRole}
        onSignOut={onSignOut}
        canGoBack={canGoBack}
        onBack={onBack}
        familyId={familyId}
        showInviteButton={!!familyId && isAdminRole}
        showCreateButton={!familyId && isAdminRole}
        showJoinButton={!familyId && (userRole === 'family_viewer' || userRole === 'carer')}
        onProfileUpdate={() => {
          setLoading(true);
          if (onProfileUpdate) {
            onProfileUpdate();
          }
          setTimeout(() => setLoading(false), 2000);
        }}
        isLoading={loading}
      />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <HeroBanner 
          title={`Welcome back, ${userName?.split(' ')[0] || 'there'}`}
          subtitle={familyId ? "Manage your family's care with ease" : canEditWithoutFamily ? "Create a family to start coordinating care" : "Join a family to access care features"}
          careRecipientName={familyId && userRole !== 'disabled_person' ? careRecipientName : undefined}
          profilePictureUrl={profilePictureUrl}
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

        {!familyId && isAdminRole && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">Create your family to get started</p>
              <p className="text-sm mt-1">Click "Create Family" above to begin coordinating care.</p>
            </AlertDescription>
          </Alert>
        )}

        {(familyId || canEditWithoutFamily) && !showJoinMessage && (
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
            title="Medications"
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
