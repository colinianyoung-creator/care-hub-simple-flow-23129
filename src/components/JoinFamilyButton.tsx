import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  checkClientRateLimit,
  recordClientAttempt,
  clearClientAttempts,
  getRemainingAttempts,
  getTimeUntilReset,
  formatTimeRemaining,
  RATE_LIMITS
} from '@/lib/rateLimiter';

interface JoinFamilyButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
  onSuccess?: (familyId?: string) => void;
}

export const JoinFamilyButton = ({ variant = 'default', className, onSuccess }: JoinFamilyButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(RATE_LIMITS.inviteRedeem.maxAttempts);
  const [timeRemaining, setTimeRemaining] = useState('');
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

  const getUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  };

  const updateRateLimitState = async () => {
    const userId = await getUserId();
    if (!userId) return;
    
    const remaining = getRemainingAttempts('inviteRedeem', userId, RATE_LIMITS.inviteRedeem.maxAttempts, RATE_LIMITS.inviteRedeem.windowMs);
    setAttemptsRemaining(remaining);
    
    const isLimited = !checkClientRateLimit('inviteRedeem', userId, RATE_LIMITS.inviteRedeem.maxAttempts, RATE_LIMITS.inviteRedeem.windowMs);
    setRateLimited(isLimited);
    
    if (isLimited) {
      const time = getTimeUntilReset('inviteRedeem', userId, RATE_LIMITS.inviteRedeem.windowMs);
      setTimeRemaining(formatTimeRemaining(time));
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Check client-side rate limit
    if (!checkClientRateLimit('inviteRedeem', userId, RATE_LIMITS.inviteRedeem.maxAttempts, RATE_LIMITS.inviteRedeem.windowMs)) {
      const time = getTimeUntilReset('inviteRedeem', userId, RATE_LIMITS.inviteRedeem.windowMs);
      setRateLimited(true);
      setTimeRemaining(formatTimeRemaining(time));
      toast({
        title: "Too many attempts",
        description: `Please try again in ${formatTimeRemaining(time)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Record attempt before trying (server will also record)
      recordClientAttempt('inviteRedeem', userId);
      
      const { data, error } = await supabase.rpc('redeem_invite', {
        _code: inviteCode.trim().toLowerCase()
      });

      if (error) {
        updateRateLimitState();
        throw error;
      }

      // Clear attempts on success
      clearClientAttempts('inviteRedeem', userId);

      toast({
        title: "Success!",
        description: "You've joined the family.",
      });

      setShowDialog(false);
      
      // Get the family ID from the newly created membership
      const { data: newMembership } = await supabase
        .from('user_memberships')
        .select('family_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const newFamilyId = newMembership?.family_id;

      if (onSuccess) {
        onSuccess(newFamilyId);
      } else if (newFamilyId) {
        // Fallback if no handler provided
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
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Join a Family</DialogTitle>
            <DialogDescription>
              Enter the invite code provided by your family admin to join their care network.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {rateLimited && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Too many attempts. Please try again in {timeRemaining}.
                </AlertDescription>
              </Alert>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Invite Code</label>
              <Input
                placeholder="Enter 8-character code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFamily()}
                maxLength={8}
                className="uppercase font-mono"
                disabled={rateLimited}
              />
            </div>
            
            {attemptsRemaining < RATE_LIMITS.inviteRedeem.maxAttempts && attemptsRemaining > 0 && (
              <p className="text-sm text-muted-foreground">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}

            <Button 
              onClick={handleJoinFamily} 
              disabled={isSubmitting || !inviteCode.trim() || rateLimited}
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
