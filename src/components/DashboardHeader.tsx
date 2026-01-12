import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, Users, ArrowLeftRight, MessageCircle, Settings } from 'lucide-react';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { ManageCareTeamDialog } from './dialogs/ManageCareTeamDialog';
import { SettingsDialog } from './dialogs/SettingsDialog';
import { InviteMembersButton } from './InviteMembersButton';
import { JoinFamilyButton } from './JoinFamilyButton';
import { CreateFamilyButton } from './CreateFamilyButton';
import { ChatDialog } from './chat/ChatDialog';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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
  isLoading?: boolean;
  onFamilySelected?: (familyId: string) => void;
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
  onProfileUpdate,
  isLoading = false,
  onFamilySelected
}: DashboardHeaderProps) => {
  const { t } = useTranslation();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const { unreadCount } = useUnreadMessages(familyId);

  useEffect(() => {
    const loadUserName = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase.rpc('get_profile_safe');
        
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
        return t('roles.careRecipient');
      case 'family_admin':
        return t('roles.familyAdmin');
      case 'family_viewer':
        return t('roles.familyViewer');
      case 'carer':
        return t('roles.carer');
      case 'manager':
        return t('roles.manager');
      default:
        return t('roles.member');
    }
  };

  return (
    <header className="flex items-center justify-between p-4 md:p-6 bg-card border-b">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {canGoBack && onBack && (
          <Button variant="outline" onClick={onBack} size="sm" className="shrink-0">
            ← {t('common.back')}
          </Button>
        )}
        <div className="min-w-0 flex-1">
          {userRole === 'carer' ? (
            <>
              <h1 className="text-lg md:text-2xl font-bold truncate">{userName}</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{t('roles.carer')}</p>
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
          <JoinFamilyButton 
            variant="outline" 
            className="hidden sm:flex" 
            onSuccess={(familyId) => {
              if (familyId && onFamilySelected) {
                onFamilySelected(familyId);
              }
            }}
          />
        )}
        {showCreateButton && (
          <CreateFamilyButton variant="outline" className="hidden sm:flex" />
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 relative">
              <Menu className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('menu.menu')}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showInviteButton && familyId && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-invite-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.inviteMembers')}
              </DropdownMenuItem>
            )}
            {showJoinButton && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-join-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.joinFamily')}
              </DropdownMenuItem>
            )}
            {showCreateButton && (
              <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-create-button]')?.click()}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.createFamily')}
              </DropdownMenuItem>
            )}
            {familyId && (
              <DropdownMenuItem onClick={() => setShowChatDialog(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('menu.messages')}
                {unreadCount > 0 && (
                  <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
              <User className="mr-2 h-4 w-4" />
              {t('menu.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              {t('menu.settings')}
            </DropdownMenuItem>
            {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
              <DropdownMenuItem onClick={() => setShowCareTeamDialog(true)}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.manageCareTeam')}
              </DropdownMenuItem>
            )}
            {userRole === 'carer' && onSwitchFamily && (
              <DropdownMenuItem onClick={onSwitchFamily}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t('menu.switchFamily')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('menu.signOut')}
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
      
      {familyId && (
        <ChatDialog
          isOpen={showChatDialog}
          onClose={() => setShowChatDialog(false)}
          familyId={familyId}
        />
      )}
      
      {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
        <ManageCareTeamDialog 
          isOpen={showCareTeamDialog} 
          onClose={() => setShowCareTeamDialog(false)}
          familyId={familyId}
        />
      )}
      
      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        familyId={familyId}
        userRole={userRole}
      />
    </header>
  );
};