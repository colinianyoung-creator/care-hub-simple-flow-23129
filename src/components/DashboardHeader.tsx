import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, User, Users, ArrowLeftRight, MessageCircle, Settings, Download, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share, Plus } from 'lucide-react';
import { ProfileDialog } from './dialogs/ProfileDialog';
import { ManageCareTeamDialog } from './dialogs/ManageCareTeamDialog';
import { SettingsDialog } from './dialogs/SettingsDialog';
import { InviteMembersButton } from './InviteMembersButton';
import { JoinFamilyButton } from './JoinFamilyButton';
import { CreateFamilyButton } from './CreateFamilyButton';
import { ChatDialog } from './chat/ChatDialog';
import { HelpCenterModal } from './instructions/HelpCenterModal';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCareTeamDialog, setShowCareTeamDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [userName, setUserName] = useState('');
  const [showIOSInstallDialog, setShowIOSInstallDialog] = useState(false);
  const { unreadCount } = useUnreadMessages(familyId);
  const { isIOS, isInstalled, isInstallable, promptInstall, canShowInstall } = usePWAInstall();

  const closeMenu = () => setMenuOpen(false);

  const handleInstallClick = () => {
    closeMenu();
    if (isIOS) {
      setShowIOSInstallDialog(true);
    } else {
      promptInstall();
    }
  };

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
        
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 relative touch-manipulation">
              <Menu className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('menu.menu')}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            {showInviteButton && familyId && (
              <DropdownMenuItem onSelect={() => { closeMenu(); document.querySelector<HTMLButtonElement>('[data-invite-button]')?.click(); }}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.inviteMembers')}
              </DropdownMenuItem>
            )}
            {showJoinButton && (
              <DropdownMenuItem onSelect={() => { closeMenu(); document.querySelector<HTMLButtonElement>('[data-join-button]')?.click(); }}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.joinFamily')}
              </DropdownMenuItem>
            )}
            {showCreateButton && (
              <DropdownMenuItem onSelect={() => { closeMenu(); document.querySelector<HTMLButtonElement>('[data-create-button]')?.click(); }}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.createFamily')}
              </DropdownMenuItem>
            )}
            {familyId && (
              <DropdownMenuItem onSelect={() => { closeMenu(); setShowChatDialog(true); }}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('menu.messages')}
                {unreadCount > 0 && (
                  <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => { closeMenu(); setShowProfileDialog(true); }}>
              <User className="mr-2 h-4 w-4" />
              {t('menu.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { closeMenu(); setShowSettingsDialog(true); }}>
              <Settings className="mr-2 h-4 w-4" />
              {t('menu.settings')}
            </DropdownMenuItem>
            {familyId && (userRole === 'family_admin' || userRole === 'disabled_person') && (
              <DropdownMenuItem onSelect={() => { closeMenu(); setShowCareTeamDialog(true); }}>
                <Users className="mr-2 h-4 w-4" />
                {t('menu.manageCareTeam')}
              </DropdownMenuItem>
            )}
            {userRole === 'carer' && onSwitchFamily && (
              <DropdownMenuItem onSelect={() => { closeMenu(); onSwitchFamily(); }}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t('menu.switchFamily')}
              </DropdownMenuItem>
            )}
            {canShowInstall && (
              <DropdownMenuItem onSelect={handleInstallClick}>
                <Download className="mr-2 h-4 w-4" />
                {t('menu.installApp')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => { closeMenu(); setShowHelpCenter(true); }}>
              <HelpCircle className="mr-2 h-4 w-4" />
              {t('menu.help')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { closeMenu(); onSignOut(); }}>
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

      <HelpCenterModal
        open={showHelpCenter}
        onOpenChange={setShowHelpCenter}
      />
      
      <Dialog open={showIOSInstallDialog} onOpenChange={setShowIOSInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pwa.iosTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('pwa.description')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
                <span className="text-sm flex items-center gap-1">
                  {t('pwa.iosStep1')}
                  <Share className="h-4 w-4 inline mx-1 text-primary" />
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
                <span className="text-sm flex items-center gap-1">
                  {t('pwa.iosStep2')}
                  <Plus className="h-4 w-4 inline mx-1 text-primary" />
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};