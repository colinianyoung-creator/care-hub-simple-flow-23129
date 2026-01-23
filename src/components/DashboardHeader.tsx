import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User, Users, ArrowLeftRight, MessageCircle, Settings, Download, HelpCircle, RefreshCw } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAppRefresh } from '@/hooks/useAppRefresh';
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
import { cn } from '@/lib/utils';
import { AdaptiveMenu, type MenuGroup } from '@/components/adaptive/AdaptiveMenu';

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
  const { triggerRefresh, isRefreshing } = useAppRefresh();

  const handleInstallClick = () => {
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

  // Build menu groups using useMemo for stability
  const menuGroups = useMemo<MenuGroup[]>(() => {
    const mainGroup: MenuGroup = { items: [] };
    const accountGroup: MenuGroup = { items: [] };
    const signOutGroup: MenuGroup = { items: [] };

    // Invite/Join/Create buttons for mobile
    if (showInviteButton && familyId) {
      mainGroup.items.push({
        id: 'invite',
        label: t('menu.inviteMembers'),
        icon: <Users className="h-4 w-4" />,
        onClick: () => document.querySelector<HTMLButtonElement>('[data-invite-button]')?.click(),
      });
    }

    if (showJoinButton) {
      mainGroup.items.push({
        id: 'join',
        label: t('menu.joinFamily'),
        icon: <Users className="h-4 w-4" />,
        onClick: () => document.querySelector<HTMLButtonElement>('[data-join-button]')?.click(),
      });
    }

    if (showCreateButton) {
      mainGroup.items.push({
        id: 'create',
        label: t('menu.createFamily'),
        icon: <Users className="h-4 w-4" />,
        onClick: () => document.querySelector<HTMLButtonElement>('[data-create-button]')?.click(),
      });
    }

    // Messages
    if (familyId) {
      mainGroup.items.push({
        id: 'messages',
        label: t('menu.messages'),
        icon: <MessageCircle className="h-4 w-4" />,
        onClick: () => setShowChatDialog(true),
        badge: unreadCount > 0 ? (
          <span className="h-5 w-5 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : undefined,
      });
    }

    // Account items
    accountGroup.items.push({
      id: 'profile',
      label: t('menu.profile'),
      icon: <User className="h-4 w-4" />,
      onClick: () => setShowProfileDialog(true),
    });

    accountGroup.items.push({
      id: 'settings',
      label: t('menu.settings'),
      icon: <Settings className="h-4 w-4" />,
      onClick: () => setShowSettingsDialog(true),
    });

    // Manage Care Team
    if (familyId && (userRole === 'family_admin' || userRole === 'disabled_person')) {
      accountGroup.items.push({
        id: 'care-team',
        label: t('menu.manageCareTeam'),
        icon: <Users className="h-4 w-4" />,
        onClick: () => setShowCareTeamDialog(true),
      });
    }

    // Switch Family
    if (userRole === 'carer' && onSwitchFamily) {
      accountGroup.items.push({
        id: 'switch-family',
        label: t('menu.switchFamily'),
        icon: <ArrowLeftRight className="h-4 w-4" />,
        onClick: onSwitchFamily,
      });
    }

    // Install app
    if (canShowInstall) {
      accountGroup.items.push({
        id: 'install',
        label: t('menu.installApp'),
        icon: <Download className="h-4 w-4" />,
        onClick: handleInstallClick,
      });
    }

    // Help
    accountGroup.items.push({
      id: 'help',
      label: t('menu.help'),
      icon: <HelpCircle className="h-4 w-4" />,
      onClick: () => setShowHelpCenter(true),
    });

    // Sign out
    signOutGroup.items.push({
      id: 'sign-out',
      label: t('menu.signOut'),
      icon: <LogOut className="h-4 w-4" />,
      onClick: onSignOut,
      destructive: true,
    });

    // Filter out empty groups
    const groups: MenuGroup[] = [];
    if (mainGroup.items.length > 0) groups.push(mainGroup);
    if (accountGroup.items.length > 0) groups.push(accountGroup);
    if (signOutGroup.items.length > 0) groups.push(signOutGroup);

    return groups;
  }, [
    t,
    familyId,
    userRole,
    showInviteButton,
    showJoinButton,
    showCreateButton,
    unreadCount,
    canShowInstall,
    onSwitchFamily,
    onSignOut,
    isIOS,
  ]);

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
        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerRefresh}
          disabled={isRefreshing}
          aria-label={t('refresh.refreshButton')}
          className="shrink-0 touch-manipulation"
        >
          <RefreshCw 
            className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )} 
          />
        </Button>

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
        
        <AdaptiveMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title={t('menu.menu')}
          groups={menuGroups}
          trigger={
            <Button variant="outline" size="sm" className="shrink-0 relative touch-manipulation">
              <Menu className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('menu.menu')}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          }
        />
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
