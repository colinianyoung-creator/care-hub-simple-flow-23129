import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Copy, Check, Mail, PenLine, Users, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface InviteMembersButtonProps {
  familyId: string;
  variant?: 'default' | 'outline';
  className?: string;
}

interface PlaceholderCarer {
  id: string;
  full_name: string;
  email: string | null;
  is_linked: boolean;
}

const roleLabels: Record<string, string> = {
  carer: 'Carer',
  family_viewer: 'Family Viewer',
  family_admin: 'Family Admin',
  manager: 'Manager',
  disabled_person: 'Care Recipient',
};

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

  // Invite pending carer state
  const [placeholderCarers, setPlaceholderCarers] = useState<PlaceholderCarer[]>([]);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>('');
  const [placeholderInviteCode, setPlaceholderInviteCode] = useState<string>('');
  const [isGeneratingPlaceholder, setIsGeneratingPlaceholder] = useState(false);

  // Email invite state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [placeholderEmailSent, setPlaceholderEmailSent] = useState<Record<string, boolean>>({});
  const [isSendingPlaceholderEmail, setIsSendingPlaceholderEmail] = useState<string | null>(null);

  useEffect(() => {
    if (showDialog && familyId) {
      loadPlaceholderCarers();
    }
  }, [showDialog, familyId]);

  const loadPlaceholderCarers = async () => {
    try {
      const { data, error } = await supabase
        .from('placeholder_carers')
        .select('id, full_name, email, is_linked')
        .eq('family_id', familyId)
        .eq('is_linked', false)
        .order('full_name');

      if (error) throw error;
      setPlaceholderCarers(data || []);
    } catch (error) {
      console.error('Error loading placeholder carers:', error);
    }
  };

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

  const generateInviteForPlaceholder = async () => {
    if (!selectedPlaceholder) {
      toast({
        title: "Error",
        description: "Please select a pending carer",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPlaceholder(true);
    try {
      const { data, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: 'carer' as const,
        _placeholder_carer_id: selectedPlaceholder
      });

      if (error) throw error;

      setPlaceholderInviteCode(data);
      const placeholderName = placeholderCarers.find(p => p.id === selectedPlaceholder)?.full_name;
      toast({
        title: "Invite Generated",
        description: `Invite code created for ${placeholderName}. Their shifts will transfer automatically when they sign up.`,
      });
    } catch (error: any) {
      console.error('Error generating placeholder invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPlaceholder(false);
    }
  };

  const copyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInviteEmail = async (code: string, emailAddress: string, role: string) => {
    if (!emailAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Server now fetches inviterName and familyName from database for security
      const { error } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: emailAddress,
          inviteCode: code,
          role: roleLabels[role] || role,
          expiresIn: '7 days'
        }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email Sent!",
        description: `Invite sent to ${emailAddress}`,
      });
    } catch (error: any) {
      console.error('Error sending invite email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invite email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const sendPlaceholderInviteEmail = async (code: string, placeholder: PlaceholderCarer) => {
    if (!placeholder.email) {
      toast({
        title: "No email",
        description: "This carer doesn't have an email on file",
        variant: "destructive",
      });
      return;
    }

    setIsSendingPlaceholderEmail(placeholder.id);
    try {
      // Server now fetches inviterName and familyName from database for security
      const { error } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: placeholder.email,
          inviteCode: code,
          role: 'Carer',
          expiresIn: '7 days'
        }
      });

      if (error) throw error;

      setPlaceholderEmailSent(prev => ({ ...prev, [placeholder.id]: true }));
      toast({
        title: "Email Sent!",
        description: `Invite sent to ${placeholder.full_name} (${placeholder.email})`,
      });
    } catch (error: any) {
      console.error('Error sending placeholder invite email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invite email",
        variant: "destructive",
      });
    } finally {
      setIsSendingPlaceholderEmail(null);
    }
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

      // Reset form and reload placeholders
      setFullName('');
      setEmail('');
      setPhone('');
      setNotes('');
      loadPlaceholderCarers();
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
    setSelectedPlaceholder('');
    setPlaceholderInviteCode('');
    setRecipientEmail('');
    setEmailSent(false);
    setPlaceholderEmailSent({});
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invite" className="flex items-center gap-1 px-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Invite</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1 px-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Pending</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-1 px-2">
                <PenLine className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Add</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Generate an invite code for someone to join your care team.
              </p>
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

              {!generatedCode && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Recipient Email (optional)</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If provided, we'll email the invite directly
                  </p>
                </div>
              )}

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
                        onClick={() => copyInviteCode(generatedCode)}
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

                      {/* Email section */}
                      {recipientEmail && !emailSent ? (
                        <Button
                          onClick={() => sendInviteEmail(generatedCode, recipientEmail, selectedRole)}
                          disabled={isSendingEmail}
                          className="w-full"
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Email to {recipientEmail}
                            </>
                          )}
                        </Button>
                      ) : emailSent ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Email sent to {recipientEmail}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">or send via email</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              value={recipientEmail}
                              onChange={(e) => setRecipientEmail(e.target.value)}
                              placeholder="Enter email..."
                              className="flex-1"
                            />
                            <Button
                              size="icon"
                              onClick={() => sendInviteEmail(generatedCode, recipientEmail, selectedRole)}
                              disabled={isSendingEmail || !recipientEmail.trim()}
                            >
                              {isSendingEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Generate a linked invite for a pending carer. When they sign up, their existing shifts will transfer automatically.
              </p>
              
              {placeholderCarers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending carers</p>
                  <p className="text-sm">Use the "Add" tab to add carers first</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Pending Carer</Label>
                    <Select value={selectedPlaceholder} onValueChange={setSelectedPlaceholder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a carer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {placeholderCarers.map((carer) => (
                          <SelectItem key={carer.id} value={carer.id}>
                            {carer.full_name}
                            {carer.email && <span className="text-muted-foreground ml-2">({carer.email})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!placeholderInviteCode ? (
                    <Button 
                      onClick={generateInviteForPlaceholder} 
                      disabled={isGeneratingPlaceholder || !selectedPlaceholder}
                      className="w-full"
                    >
                      {isGeneratingPlaceholder ? 'Generating...' : 'Generate Linked Invite'}
                    </Button>
                  ) : (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          {(() => {
                            const placeholder = placeholderCarers.find(p => p.id === selectedPlaceholder);
                            return (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  Invite for {placeholder?.full_name}:
                                </p>
                                <div className="text-2xl font-mono font-bold tracking-wider">
                                  {placeholderInviteCode}
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => copyInviteCode(placeholderInviteCode)}
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

                                {/* Email button for placeholder with email */}
                                {placeholder?.email && !placeholderEmailSent[placeholder.id] ? (
                                  <Button
                                    onClick={() => sendPlaceholderInviteEmail(placeholderInviteCode, placeholder)}
                                    disabled={isSendingPlaceholderEmail === placeholder.id}
                                    className="w-full"
                                  >
                                    {isSendingPlaceholderEmail === placeholder.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Email to {placeholder.email}
                                      </>
                                    )}
                                  </Button>
                                ) : placeholder?.email && placeholderEmailSent[placeholder.id] ? (
                                  <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                    <Check className="h-4 w-4" />
                                    Email sent to {placeholder.email}
                                  </div>
                                ) : null}

                                <p className="text-xs text-muted-foreground">
                                  Their shifts will transfer when they sign up
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
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