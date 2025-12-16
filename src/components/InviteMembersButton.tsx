import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Copy, Check, Mail, PenLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  // Manual add carer state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isAddingCarer, setIsAddingCarer] = useState(false);

  const generateInviteCode = async () => {
    if (!familyId) {
      console.error('❌ No familyId provided to InviteMembersButton');
      toast({
        title: "Error",
        description: "Cannot generate invite - no family selected",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    console.log('🎟️ Generating invite code for family:', familyId, 'role:', selectedRole);
    
    try {
      const { data, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: selectedRole as 'carer' | 'disabled_person' | 'family_admin' | 'family_viewer' | 'manager'
      });

      if (error) {
        console.error('❌ RPC error details:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No invite code generated');
      }

      console.log('✅ Invite code generated:', data);
      setGeneratedCode(data);
      toast({
        title: "Invite code generated!",
        description: "Share this code with your team member.",
      });
    } catch (error: any) {
      console.error('❌ Error generating invite:', error);
      
      let errorMessage = "Failed to generate invite code";
      if (error.message?.includes('Only family admins') || error.message?.includes('care recipients')) {
        errorMessage = "You must be a family admin or care recipient to generate invites";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  const handleAddCarer = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the carer's full name",
        variant: "destructive",
      });
      return;
    }

    setIsAddingCarer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('placeholder_carers')
        .insert({
          family_id: familyId,
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Carer added!",
        description: email 
          ? "They'll be automatically linked when they sign up with this email."
          : "You can assign them to shifts right away.",
      });

      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setNotes('');
      handleClose();
    } catch (error: any) {
      console.error('Error adding placeholder carer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add carer",
        variant: "destructive",
      });
    } finally {
      setIsAddingCarer(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setGeneratedCode('');
    setSelectedRole('carer');
    setCopied(false);
    setFullName('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  return (
    <>
      <Button 
        variant={variant} 
        className={className} 
        onClick={() => setShowDialog(true)}
        data-invite-button
      >
        <UserPlus className="h-4 w-4 flex-shrink-0" />
        <span className={isMobile ? "sr-only" : "ml-2"}>
          {isMobile ? "" : "Invite/Add Members"}
        </span>
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite or Add Care Team Member</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="invite" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Invite with Code</span>
                <span className="sm:hidden">Invite</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                <span className="hidden sm:inline">Add Manually</span>
                <span className="sm:hidden">Add</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Role</Label>
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
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Add a carer who hasn't signed up yet. They'll be automatically linked when they register with the same email.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter carer's name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For auto-linking on signup"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contact number"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes"
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleAddCarer} 
                  disabled={isAddingCarer || !fullName.trim()}
                  className="w-full"
                >
                  {isAddingCarer ? 'Adding...' : 'Add Carer'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};