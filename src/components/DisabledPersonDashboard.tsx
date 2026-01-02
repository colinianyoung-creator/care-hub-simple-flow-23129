import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, FileText, UserPlus, Copy, CheckSquare, Pill, Calendar, Utensils, Wallet, FileBarChart } from "lucide-react";
import { AIReportsSection } from "./sections/AIReportsSection";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroBanner } from "@/components/HeroBanner";
import { ExpandableDashboardSection } from "./ExpandableDashboardSection";
import { KeyInformationSection } from "./sections/KeyInformationSection";
import { SchedulingSection } from "./sections/SchedulingSection";
import { TasksSection } from "./sections/TasksSection";
import { NotesSection } from "./sections/NotesSection";
import { DietSection } from "./sections/DietSection";
import { MoneySection } from "./sections/MoneySection";
import { MedicationsSection } from "./sections/MedicationsSection";
import { AppointmentsSection } from "./sections/AppointmentsSection";
import { DashboardHeader } from './DashboardHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { logUserContext } from '@/lib/logContext';
// ActionMenu removed - using accordion sections instead

interface DisabledPersonDashboardProps {
  familyId?: string;
  familyName: string;
  userRole: string;
  onBack?: () => void;
  onSignOut: () => void;
  canGoBack?: boolean;
  profilePictureUrl?: string;
  careRecipientPictureUrl?: string;
  currentFamilyId?: string;
  onProfileUpdate?: () => void;
  onFamilySelected?: (familyId: string) => void;
}

export const DisabledPersonDashboard = ({ 
  familyId, 
  familyName, 
  userRole,
  onBack, 
  onSignOut, 
  canGoBack = false,
  profilePictureUrl = '',
  careRecipientPictureUrl,
  currentFamilyId,
  onProfileUpdate,
  onFamilySelected
}: DisabledPersonDashboardProps) => {
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [recentNotes, setRecentNotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'carer' | 'family_admin' | 'family_viewer'>('carer');
  const [generatedCode, setGeneratedCode] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [schedulingSectionTab, setSchedulingSectionTab] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      if (familyId) {
        await loadDashboardData();
      }
      await loadUserName();
      
      // Log context after data loads
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logUserContext(user, familyId, userRole);
      }
    };
    
    loadData();
  }, [familyId, userRole]);

  const loadUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('get_profile_safe');
        
        if (data?.[0]?.full_name) {
          const firstName = data[0].full_name.split(' ')[0];
          setUserFirstName(firstName);
        }
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get this week's approved hours
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out')
        .eq('family_id', familyId)
        .gte('clock_in', weekStart.toISOString());

      const totalHours = timeEntries?.reduce((total, entry) => {
        if (entry.clock_out) {
          const start = new Date(entry.clock_in);
          const end = new Date(entry.clock_out);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
        return total;
      }, 0) || 0;

      setWeeklyHours(Math.round(totalHours * 10) / 10);

      // Get pending tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('family_id', familyId)
        .is('completed_at', null);

      setPendingTasks(tasks?.length || 0);

      // Get recent notes count
      const { data: notes } = await supabase
        .from('care_notes')
        .select('id')
        .eq('family_id', familyId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setRecentNotes(notes?.length || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      const { data: inviteCode, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: inviteRole
      });

      if (error) throw error;

      setGeneratedCode(inviteCode);
      toast({
        title: "Invite code generated!",
        description: `Share this code with your ${inviteRole}`,
      });
    } catch (error: any) {
      console.error('Error generating invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite code",
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        familyName={familyName}
        userRole={userRole}
        onSignOut={onSignOut}
        canGoBack={canGoBack}
        onBack={onBack}
        familyId={familyId}
        showInviteButton={!!familyId}
        showCreateButton={!familyId}
        onProfileUpdate={onProfileUpdate}
        onFamilySelected={onFamilySelected}
      />

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
      <HeroBanner 
        title={userFirstName ? `Welcome back, ${userFirstName}` : `Welcome back, there`}
        subtitle={familyId ? "Your care coordination hub" : "Create your family to get started"}
        profilePictureUrl={careRecipientPictureUrl || profilePictureUrl}
      />

        {!familyId && (
          <Alert>
            <UserPlus className="h-5 w-5" />
            <AlertDescription>
              <p className="font-medium">Create your family to start coordinating care</p>
              <p className="text-sm mt-1">Click "Create Family" above to set up your care network.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Action menu removed - using accordion sections */}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week's Care Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyHours}h</div>
              <p className="text-xs text-muted-foreground">Approved care time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks to complete</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Notes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentNotes}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => {
            const schedulingSection = document.querySelector('[id="scheduling"]');
            if (schedulingSection) {
              setSchedulingSectionTab('requests');
              schedulingSection.scrollIntoView({ behavior: 'smooth' });
              // Expand the section if collapsed
              const button = schedulingSection.querySelector('button[data-state]');
              if (button && button.getAttribute('data-state') === 'closed') {
                (button as HTMLButtonElement).click();
              }
            }
          }}
        >
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>View and manage care team requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-16 flex flex-col items-center justify-center bg-card border border-border hover:bg-muted">
              <UserPlus className="w-6 h-6 mb-2" />
              View Requests/Changes
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 flex flex-col items-center justify-center bg-card border border-border hover:bg-muted">
                <UserPlus className="w-6 h-6 mb-2" />
                Invite Care Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Care Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carer">Carer</SelectItem>
                      <SelectItem value="family_admin">Family Member (Admin)</SelectItem>
                      <SelectItem value="family_viewer">Family Member (Viewer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!generatedCode ? (
                  <Button onClick={generateInviteCode} className="w-full">
                    Generate Invite Code
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label>Share this code:</Label>
                    <div className="flex items-center gap-2">
                      <Input value={generatedCode} readOnly />
                      <Button size="sm" onClick={copyInviteCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send this code to your {inviteRole} so they can join your care team.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button className="h-16 flex flex-col items-center justify-center bg-card border border-border hover:bg-muted">
            <FileText className="w-6 h-6 mb-2" />
            View Care Plan
          </Button>
        </div>

        {/* All Care Coordination Sections */}
        <div className="space-y-4">
          <ExpandableDashboardSection
            id="scheduling"
            title="Scheduling & Time Management"
            defaultOpen={true}
            icon={<Clock className="h-5 w-5" />}
          >
            <SchedulingSection familyId={familyId} userRole={userRole} defaultActiveTab={schedulingSectionTab} />
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
            title="Key Information & Risk Assessments"
            icon={<Users className="h-5 w-5" />}
          >
            <KeyInformationSection familyId={familyId} userRole="disabled_person" />
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

          <ExpandableDashboardSection
            id="ai-reports"
            title="AI Reports"
            icon={<FileBarChart className="h-5 w-5" />}
          >
            <AIReportsSection familyId={familyId} userRole={userRole} />
          </ExpandableDashboardSection>
        </div>
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