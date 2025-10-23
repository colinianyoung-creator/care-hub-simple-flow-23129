
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
import { ProfileDialog } from './dialogs/ProfileDialog';
import { ManageCareTeamDialog } from './dialogs/ManageCareTeamDialog';
import { FamilySwitcher } from './FamilySwitcher';
// Mobile tabs and action menu removed - using accordion for all screens
import { Clock, CheckSquare, FileText, Pill, Calendar, Users, Utensils, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus } from 'lucide-react';

type AppRole = 'disabled_person' | 'family_admin' | 'family_viewer' | 'manager' | 'carer';

interface CarerDashboardProps {
  onSignOut: () => void;
  familyId?: string;
  familyName: string;
  userRole: AppRole;
  careRecipientNameHint?: string;
  profilePictureUrl?: string;
  currentFamilyId?: string;
  onProfileUpdate?: () => void;
}

export const CarerDashboard = ({ onSignOut, familyId, familyName, userRole, careRecipientNameHint, profilePictureUrl = '', currentFamilyId, onProfileUpdate }: CarerDashboardProps) => {
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showFamilySwitcher, setShowFamilySwitcher] = useState(false);
  const [userName, setUserName] = useState('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (familyId) {
      loadWeeklyHours();
    } else {
      setLoading(false);
    }
    loadUserName();
  }, [familyId]);

  const loadUserName = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: profile } = await supabase.rpc('get_profile_safe');
      
      setUserName(profile?.[0]?.full_name || 'User');
    }
  };

  const loadWeeklyHours = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }
      
      if (!familyId) {
        setLoading(false);
        return;
      }

      // Get current week's start and end dates
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Query time entries for current week
      const { data, error } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out')
        .eq('family_id', familyId)
        .eq('user_id', user.user.id)
        .gte('clock_in', startOfWeek.toISOString())
        .lte('clock_in', endOfWeek.toISOString())
        .not('clock_out', 'is', null);

      if (error) throw error;

      // Calculate total hours
      const totalHours = data?.reduce((sum, entry) => {
        if (entry.clock_out) {
          const start = new Date(entry.clock_in);
          const end = new Date(entry.clock_out);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0) || 0;

      setWeeklyHours(totalHours);
    } catch (error) {
      console.error('Error loading weekly hours:', error);
      toast({
        title: "Error",
        description: "Failed to load weekly hours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    <SchedulingSection familyId={familyId} userRole={userRole} careRecipientNameHint={careRecipientNameHint || familyName} />,
    <TasksSection familyId={familyId} userRole={userRole} />,
    <NotesSection familyId={familyId} userRole={userRole} />,
    <KeyInformationSection familyId={familyId} userRole={userRole} />,
    <MedicationsSection familyId={familyId} userRole={userRole} />,
    <AppointmentsSection familyId={familyId} userRole={userRole} />
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <>
          <DashboardHeader 
            familyName={familyName}
            userRole={userRole}
            onSignOut={onSignOut}
            familyId={familyId}
            onSwitchFamily={() => setShowFamilySwitcher(true)}
            showJoinButton={true}
            onProfileUpdate={onProfileUpdate}
          />
          
          <HeroBanner 
            title={`Welcome back, ${userName}!`}
            subtitle={familyId ? `Managing care for ${familyName}` : "Join a family to start coordinating care"}
            profilePictureUrl={profilePictureUrl}
            onProfileClick={() => setShowProfileDialog(true)}
          />

          {!familyId && (
            <Alert>
              <UserPlus className="h-5 w-5" />
              <AlertDescription>
                <p className="font-medium">Join a family to access care coordination features</p>
                <p className="text-sm mt-1">Click "Join a Family" above or ask your family admin for an invite code.</p>
              </AlertDescription>
            </Alert>
          )}

          {familyId ? (
            <div className="space-y-4">
              <ExpandableDashboardSection 
                id="scheduling"
                title="Scheduling & Time Tracking" 
                defaultOpen={true}
                icon={<Clock className="h-5 w-5" />}
              >
                <SchedulingSection familyId={familyId} userRole={userRole} careRecipientNameHint={careRecipientNameHint || familyName} />
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
                title="Notes"
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
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground text-lg">
                Once you join a family, you'll be able to access:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                <li className="flex items-center gap-2 justify-center">📅 Scheduling & Time Tracking</li>
                <li className="flex items-center gap-2 justify-center">✅ Tasks Management</li>
                <li className="flex items-center gap-2 justify-center">📝 Care Notes</li>
                <li className="flex items-center gap-2 justify-center">🍽️ Diet Tracking</li>
                <li className="flex items-center gap-2 justify-center">💰 Money Tracking</li>
                <li className="flex items-center gap-2 justify-center">👤 Key Information (View Only)</li>
                <li className="flex items-center gap-2 justify-center">💊 Medications (View Only)</li>
                <li className="flex items-center gap-2 justify-center">📅 Appointments</li>
              </ul>
            </div>
          )}
        </>
      )}

      
      <ProfileDialog 
        isOpen={showProfileDialog} 
        onClose={() => setShowProfileDialog(false)}
        currentFamilyId={currentFamilyId}
        onProfileUpdate={onProfileUpdate}
      />
      
      <ManageCareTeamDialog 
        isOpen={showCareTeamDialog} 
        onClose={() => setShowCareTeamDialog(false)}
        familyId={familyId}
      />

      <FamilySwitcher 
        isOpen={showFamilySwitcher}
        onClose={() => setShowFamilySwitcher(false)}
        onFamilySelected={(family) => {
          // Reload page to switch family context
          window.location.reload();
        }}
      />
    </div>
  );
};
