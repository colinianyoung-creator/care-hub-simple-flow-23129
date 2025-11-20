
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
import { Clock, CheckSquare, FileText, Pill, Calendar, Users, Utensils, Wallet, Info, CalendarClock, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { logUserContext } from '@/lib/logContext';

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
  onFamilySelected?: (familyId: string) => void;
}

export const CarerDashboard = ({ onSignOut, familyId, familyName, userRole, careRecipientNameHint, profilePictureUrl = '', currentFamilyId, onProfileUpdate, onFamilySelected }: CarerDashboardProps) => {
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showFamilySwitcher, setShowFamilySwitcher] = useState(false);
  const [userName, setUserName] = useState('');
  const [showJoinButton, setShowJoinButton] = useState(false);
  const [isConnectedToFamily, setIsConnectedToFamily] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadMemberships = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('user_memberships')
        .select('id, role, family_id')
        .eq('user_id', user.id);
      
      setMemberships(data || []);
      
      // Check if connected to other families (more than just personal space)
      const membershipCount = (data || []).length;
      setIsConnectedToFamily(membershipCount > 1);
      
      // Show join button if user has one or no memberships (their personal space or none)
      setShowJoinButton(membershipCount <= 1);
      
      // Log context after data loads
      if (user) {
        logUserContext(user, familyId, userRole);
      }
    };
    
    loadMemberships();
    
    if (familyId) {
      loadWeeklyHours();
    } else {
      setLoading(false);
    }
    loadUserName();
  }, [familyId, userRole]);

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
            showJoinButton={showJoinButton}
            onProfileUpdate={onProfileUpdate}
            onFamilySelected={onFamilySelected}
          />
          
          <HeroBanner 
            title={`Welcome back, ${userName}!`}
            subtitle={familyId ? `Managing care for ${familyName}` : "Join a family to start coordinating care"}
            profilePictureUrl={profilePictureUrl}
            onProfileClick={() => setShowProfileDialog(true)}
          />

          <div className="space-y-4">
            <ExpandableDashboardSection id="scheduling" title="Scheduling & Time Tracking" icon={<Calendar className="h-5 w-5" />}>
              <SchedulingSection familyId={familyId} userRole={userRole} careRecipientNameHint={careRecipientNameHint} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="tasks" title="Tasks" icon={<CheckSquare className="h-5 w-5" />}>
              <TasksSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="notes" title="Care Notes" icon={<FileText className="h-5 w-5" />}>
              <NotesSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="diet" title="Diet & Nutrition" icon={<Utensils className="h-5 w-5" />}>
              <DietSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="money" title="Money & Expenses" icon={<Wallet className="h-5 w-5" />}>
              <MoneySection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="key-info" title="Key Information" icon={<Info className="h-5 w-5" />}>
              <KeyInformationSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="medications" title="Medication Administration Record (MAR)" icon={<Pill className="h-5 w-5" />}>
              <MedicationsSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>

            <ExpandableDashboardSection id="appointments" title="Appointments" icon={<CalendarClock className="h-5 w-5" />}>
              <AppointmentsSection familyId={familyId} userRole={userRole} />
            </ExpandableDashboardSection>
          </div>
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
          console.log('🔄 Family selected:', family.family_id);
          if (onFamilySelected) {
            onFamilySelected(family.family_id);
          }
          setShowFamilySwitcher(false);
        }}
      />
    </div>
  );
};
