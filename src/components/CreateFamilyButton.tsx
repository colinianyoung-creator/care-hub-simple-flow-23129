import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateFamilyButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
  onSuccess?: () => void;
  userRole?: string;
}

export const CreateFamilyButton = ({ 
  variant = 'default', 
  className, 
  onSuccess,
  userRole 
}: CreateFamilyButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [canCreateFamily, setCanCreateFamily] = useState(true);
  const [existingFamilyCount, setExistingFamilyCount] = useState(0);
  const { toast } = useToast();

  // Check if user can create additional families
  useEffect(() => {
    const checkFamilyStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check existing families where user is admin
      const { data: memberships } = await supabase
        .from('user_memberships')
        .select('id, role, family_id')
        .eq('user_id', user.id)
        .in('role', ['family_admin', 'disabled_person']);

      const count = memberships?.length || 0;
      setExistingFamilyCount(count);

      // Prevent additional family creation for admin roles
      if ((userRole === 'family_admin' || userRole === 'disabled_person') && count > 0) {
        setCanCreateFamily(false);
      }
    };

    if (showDialog) {
      checkFamilyStatus();
    }
  }, [showDialog, userRole]);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a family name",
        variant: "destructive",
      });
      return;
    }

    if (!canCreateFamily) {
      toast({
        title: "Cannot create family",
        description: "Admin users can only have one personal care space.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your family has been created. Refreshing...",
      });

      setShowDialog(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      console.error('Error creating family:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create family",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setFamilyName('');
  };

  // Don't show button if admin user already has family
  if ((userRole === 'family_admin' || userRole === 'disabled_person') && existingFamilyCount > 0) {
    return null;
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={() => setShowDialog(true)}>
        <Users className="h-4 w-4 mr-2" />
        Create Family
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Your Family</DialogTitle>
            <DialogDescription>
              Start coordinating care by creating your family network.
            </DialogDescription>
          </DialogHeader>
          
          {!canCreateFamily && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Admin users can only have one personal care space. Use the invite feature to add team members to your existing space.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Family Name</label>
              <Input
                placeholder="e.g., The Smith Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFamily()}
                disabled={!canCreateFamily}
              />
            </div>

            <Button 
              onClick={handleCreateFamily} 
              disabled={isCreating || !familyName.trim() || !canCreateFamily}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Family'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};