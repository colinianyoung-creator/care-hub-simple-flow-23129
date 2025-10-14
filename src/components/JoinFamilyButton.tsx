import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinFamilyButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
  onSuccess?: () => void;
}

export const JoinFamilyButton = ({ variant = 'default', className, onSuccess }: JoinFamilyButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle opening dialog from menu
  useEffect(() => {
    const handleOpenDialog = () => {
      console.log('🔓 Opening join family dialog from menu');
      setShowDialog(true);
    };

    const button = document.querySelector('[data-join-button]');
    if (button) {
      button.addEventListener('click', handleOpenDialog);
      return () => button.removeEventListener('click', handleOpenDialog);
    }
  }, []);

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('redeem_invite', {
        _invite_code: inviteCode.trim().toUpperCase(),
        _user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You've joined the family. Refreshing...",
      });

      setShowDialog(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      console.error('Error joining family:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join family. Check your invite code.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setInviteCode('');
  };

  return (
    <>
      <Button 
        variant={variant} 
        className={className} 
        onClick={() => setShowDialog(true)}
        data-join-button
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Join a Family
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Family</DialogTitle>
            <DialogDescription>
              Enter the invite code provided by your family admin to join their care network.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Invite Code</label>
              <Input
                placeholder="Enter 8-character code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFamily()}
                maxLength={8}
                className="uppercase font-mono"
              />
            </div>

            <Button 
              onClick={handleJoinFamily} 
              disabled={isSubmitting || !inviteCode.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Joining...' : 'Join Family'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
