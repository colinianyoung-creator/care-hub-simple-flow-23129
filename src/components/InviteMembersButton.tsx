import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InviteMembersButtonProps {
  familyId: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export const InviteMembersButton = ({ familyId, variant = 'default', className }: InviteMembersButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('carer');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateInviteCode = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: selectedRole as 'carer' | 'disabled_person' | 'family_admin' | 'family_viewer' | 'manager'
      });

      if (error) throw error;

      setGeneratedCode(data);
      toast({
        title: "Invite code generated!",
        description: "Share this code with your team member.",
      });
    } catch (error: any) {
      console.error('Error generating invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShowDialog(false);
    setGeneratedCode('');
    setSelectedRole('carer');
    setCopied(false);
  };

  return (
    <>
      <Button 
        variant={variant} 
        className={className} 
        onClick={() => setShowDialog(true)}
        data-invite-button
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Invite Members
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Care Team Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carer">Carer</SelectItem>
                  <SelectItem value="family_viewer">Family Viewer</SelectItem>
                  <SelectItem value="family_admin">Family Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!generatedCode ? (
              <Button 
                onClick={generateInviteCode} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Invite Code'}
              </Button>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Share this code:</p>
                    <div className="text-2xl font-mono font-bold tracking-wider">
                      {generatedCode}
                    </div>
                    <Button
                      variant="outline"
                      onClick={copyInviteCode}
                      className="w-full"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
