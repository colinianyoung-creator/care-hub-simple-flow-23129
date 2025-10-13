import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateFamilyButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
  onSuccess?: () => void;
}

export const CreateFamilyButton = ({ variant = 'default', className, onSuccess }: CreateFamilyButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a family name",
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
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Family Name</label>
              <Input
                placeholder="e.g., The Smith Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFamily()}
              />
            </div>

            <Button 
              onClick={handleCreateFamily} 
              disabled={isCreating || !familyName.trim()}
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
