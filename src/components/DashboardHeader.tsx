import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, Users, ArrowLeftRight } from 'lucide-react';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { ManageCareTeamDialog } from './dialogs/ManageCareTeamDialog';
import { InviteMembersButton } from './InviteMembersButton';
import { JoinFamilyButton } from './JoinFamilyButton';
import { CreateFamilyButton } from './CreateFamilyButton';
import { supabase } from "@/integrations/supabase/client";

interface DashboardHeaderProps {
  familyName: string;
  userRole?: string;
  onSignOut: () => void;
  canGoBack?: boolean;
  onBack?: () => void;
  familyId?: string;
  onSwitchFamily?: () => void;
  onConnectToFamily?: () => void;
  showInviteButton?: boolean;
  showJoinButton?: boolean;
  showCreateButton?: boolean;
  onProfileUpdate?: () => void;
}

export const DashboardHeader = ({ 
  familyName, 
  userRole = 'member',
  onSignOut,
  canGoBack = false,
  onBack,
  familyId,
  onSwitchFamily,
  onConnectToFamily,
  showInviteButton = false,
  showJoinButton = false,
  showCreateButton = false,
  onProfileUpdate
}: DashboardHeaderProps) => {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserName = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase.rpc('get_profile_safe', { 
          profile_user_id: user.user.id 
        });
        
        const fullName = profile?.[0]?.full_name || 'User';
        const firstName = fullName.split(' ')[0];
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        setUserName(capitalizedFirstName);
      }
    };

    loadUserName();
  }, []);

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'disabled_person':
        return 'Care Recipient';
      case 'family_admin':
        return 'Family Admin';
      case 'family_viewer':
        return 'Family Viewer';
      case 'carer':
        return 'Carer';
      case 'manager':
        return 'Manager';
      default:
        return 'Member';
    }
  };

  return (
    <header className="flex items-center justify-between p-4 md:p-6 bg-card border-b">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {canGoBack && onBack && (
          <Button variant="outline" onClick={onBack} size="sm" className="shrink-0">
            ← Back
          </Button>
        )}
        <div className="min-w-0 flex-1">
          {userRole === 'carer' ? (
            <>
              <h1 className="text-lg md:text-2xl font-bold truncate">{userName}</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Carer</p>
            </>
          ) : (
            <>
              <h1 className="text-lg md:text-2xl font-bold truncate">{familyName}</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{userName} • {getRoleDisplay(userRole)}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showInviteButton && familyId && (
          <InviteMembersButton familyId={familyId} variant="outline" className="hidden sm:flex" />
        )}
        {showJoinButton && (
          <JoinFamilyButton variant="outline" className="hidden sm:flex" />
        )}
        {showCreateButton && (
          <CreateFamilyButton variant="outline" className="hidden sm:flex" />
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <Menu className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showInviteButton && familyId && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-invite-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                Invite Members
              </DropdownMenuItem>
            )}
            {showJoinButton && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-join-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                Join a Family
              </DropdownMenuItem>
            )}
            {showCreateButton && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-create-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                Create Family
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
              <DropdownMenuItem onClick={() => setShowCareTeamDialog(true)}>
                <Users className="mr-2 h-4 w-4" />
                Manage Care Team
              </DropdownMenuItem>
            )}
            {userRole === 'carer' && onSwitchFamily && (
              <DropdownMenuItem onClick={onSwitchFamily}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Switch Family
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <ProfileDialog 
        isOpen={showProfileDialog} 
        onClose={() => setShowProfileDialog(false)}
        currentFamilyId={familyId}
        onProfileUpdate={onProfileUpdate}
      />
      
      {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
        <ManageCareTeamDialog 
          isOpen={showCareTeamDialog} 
          onClose={() => setShowCareTeamDialog(false)}
          familyId={familyId}
        />
      )}
    </header>
  );
};