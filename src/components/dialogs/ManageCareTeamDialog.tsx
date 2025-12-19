
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Copy, Trash2, Clock, Link, Ghost, Mail, Phone, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddPlaceholderCarerDialog } from './AddPlaceholderCarerDialog';
import { InviteMembersButton } from '@/components/InviteMembersButton';
import { BulkDeleteShiftsDialog } from './BulkDeleteShiftsDialog';

interface ManageCareTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

type UserRole = 'disabled_person' | 'family_admin' | 'family_viewer' | 'carer' | 'manager';

interface PlaceholderCarer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_linked: boolean;
  linked_user_id: string | null;
  created_at: string;
}

export const ManageCareTeamDialog = ({ isOpen, onClose, familyId }: ManageCareTeamDialogProps) => {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [placeholderCarers, setPlaceholderCarers] = useState<PlaceholderCarer[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('carer');
  const [newInviteCode, setNewInviteCode] = useState('');
  const [roleChangeRequests, setRoleChangeRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showAddPlaceholderDialog, setShowAddPlaceholderDialog] = useState(false);
  const [generatingInviteFor, setGeneratingInviteFor] = useState<string | null>(null);
  const [placeholderInviteCodes, setPlaceholderInviteCodes] = useState<Record<string, string>>({});
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
    mode: 'carer' | 'placeholder';
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTeamData();
    }
  }, [isOpen, familyId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      // Load family members with their profiles in a single query
      const { data: membersData, error: membersError } = await supabase
        .from('user_memberships')
        .select(`
          *,
          profiles!user_memberships_user_id_fkey (
            id,
            full_name,
            email,
            contact_email
          )
        `)
        .eq('family_id', familyId);

      if (membersError) throw membersError;

      // Load pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('family_id', familyId)
        .is('used_by', null)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Load placeholder carers
      const { data: placeholderData, error: placeholderError } = await supabase
        .from('placeholder_carers')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (placeholderError) throw placeholderError;

      setMembers(membersData || []);
      setInvites(invitesData || []);
      setPlaceholderCarers(placeholderData || []);

      // Load role change requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('role_change_requests')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRoleChangeRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: inviteRole
      });

      if (error) throw error;

      setNewInviteCode(data);
      toast({
        title: "Invite Generated",
        description: "New invite code created successfully",
      });

      loadTeamData();
    } catch (error) {
      console.error('Error generating invite:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite",
        variant: "destructive",
      });
    }
  };

  const generateInviteForPlaceholder = async (placeholderId: string, placeholderName: string) => {
    setGeneratingInviteFor(placeholderId);
    try {
      const { data, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: 'carer' as const,
        _placeholder_carer_id: placeholderId
      });

      if (error) throw error;

      setPlaceholderInviteCodes(prev => ({ ...prev, [placeholderId]: data }));
      toast({
        title: "Invite Generated",
        description: `Invite code created for ${placeholderName}. When they sign up with this code, their shifts will be automatically transferred.`,
      });

      loadTeamData();
    } catch (error) {
      console.error('Error generating invite for placeholder:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite",
        variant: "destructive",
      });
    } finally {
      setGeneratingInviteFor(null);
    }
  };

  const copyPlaceholderInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Invite code copied to clipboard",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Invite code copied to clipboard",
    });
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: "Invite Revoked",
        description: "Invite code has been deleted",
      });

      loadTeamData();
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast({
        title: "Error",
        description: "Failed to revoke invite",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the care team? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: "Team member has been removed",
      });

      loadTeamData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const removePlaceholderCarer = async (placeholderId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}? Any assigned shifts will need to be reassigned.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('placeholder_carers')
        .delete()
        .eq('id', placeholderId);

      if (error) throw error;

      toast({
        title: "Carer Removed",
        description: `${name} has been removed`,
      });

      loadTeamData();
    } catch (error) {
      console.error('Error removing placeholder carer:', error);
      toast({
        title: "Error",
        description: "Failed to remove carer",
        variant: "destructive",
      });
    }
  };

  const handleApproveRoleChange = async (requestId: string, requesterId: string, newRole: UserRole) => {
    setProcessingRequest(requestId);
    try {
      // Update user membership
      const { error: updateError } = await supabase
        .from('user_memberships')
        .update({ role: newRole })
        .eq('user_id', requesterId)
        .eq('family_id', familyId);

      if (updateError) throw updateError;

      // Update request status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: requestError } = await supabase
        .from('role_change_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      toast({
        title: "Request Approved",
        description: "Role change has been approved successfully",
      });

      loadTeamData();
    } catch (error) {
      console.error('Error approving role change:', error);
      toast({
        title: "Error",
        description: "Failed to approve role change",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDenyRoleChange = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('role_change_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Denied",
        description: "Role change request has been denied",
      });

      loadTeamData();
    } catch (error) {
      console.error('Error denying role change:', error);
      toast({
        title: "Error",
        description: "Failed to deny role change",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role as UserRole) {
      case 'disabled_person':
        return 'default';
      case 'family_admin':
        return 'default';
      case 'carer':
        return 'secondary';
      case 'family_viewer':
        return 'outline';
      case 'manager':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const unlinkedPlaceholders = placeholderCarers.filter(p => !p.is_linked);
  const linkedPlaceholders = placeholderCarers.filter(p => p.is_linked);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Care Team
            </DialogTitle>
            <DialogDescription>
              Add new team members and manage existing ones
            </DialogDescription>
          </DialogHeader>

          {/* Invite/Add Members Button at Top */}
          <div className="py-2">
            <InviteMembersButton familyId={familyId} className="w-full" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="members">Members ({members.length + unlinkedPlaceholders.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({unlinkedPlaceholders.length})
                </TabsTrigger>
                <TabsTrigger value="invites">Invites ({invites.length})</TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {roleChangeRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-1">{roleChangeRequests.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Team Members</CardTitle>
                    <CardDescription>People who are part of this care team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Registered Members */}
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">
                              {member.profiles?.full_name || 'Unnamed User'}
                            </div>
                            {member.profiles?.contact_email && (
                              <div className="text-sm text-muted-foreground">
                                {member.profiles.contact_email}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground opacity-75">
                              Contact info may be masked for privacy
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role ? (member.role as string).replace('_', ' ') : 'Unknown Role'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Clear all shifts"
                              onClick={() => setBulkDeleteTarget({
                                mode: 'carer',
                                id: member.user_id,
                                name: member.profiles?.full_name || 'Unnamed User'
                              })}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeMember(member.id, member.profiles?.full_name || 'Unnamed User')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Placeholder Carers (Awaiting Signup) */}
                      {unlinkedPlaceholders.map((placeholder) => (
                        <div key={placeholder.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {placeholder.full_name}
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Awaiting signup
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                              {placeholder.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {placeholder.email}
                                </span>
                              )}
                              {placeholder.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {placeholder.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">carer</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Clear all shifts"
                              onClick={() => setBulkDeleteTarget({
                                mode: 'placeholder',
                                id: placeholder.id,
                                name: placeholder.full_name
                              })}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removePlaceholderCarer(placeholder.id, placeholder.full_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {members.length === 0 && unlinkedPlaceholders.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No team members yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ghost className="h-5 w-5" />
                        Pending Carers
                      </CardTitle>
                      <CardDescription>Carers who haven't signed up yet</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddPlaceholderDialog(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Carer
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {unlinkedPlaceholders.map((placeholder) => (
                        <div key={placeholder.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {placeholder.full_name}
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Awaiting signup
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                                {placeholder.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {placeholder.email}
                                  </span>
                                )}
                                {placeholder.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {placeholder.phone}
                                  </span>
                                )}
                              </div>
                              {placeholder.notes && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {placeholder.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateInviteForPlaceholder(placeholder.id, placeholder.full_name)}
                                disabled={generatingInviteFor === placeholder.id}
                                title="Generate invite code"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removePlaceholderCarer(placeholder.id, placeholder.full_name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Show generated invite code inline */}
                          {placeholderInviteCodes[placeholder.id] && (
                            <div className="flex items-center gap-2 p-2 bg-background rounded border">
                              <span className="text-sm text-muted-foreground">Invite code:</span>
                              <code className="font-mono font-bold">{placeholderInviteCodes[placeholder.id]}</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(placeholderInviteCodes[placeholder.id])}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      {unlinkedPlaceholders.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Ghost className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No pending carers</p>
                          <p className="text-sm">Add carers who haven't signed up yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {linkedPlaceholders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        Recently Linked
                      </CardTitle>
                      <CardDescription>Carers who have signed up and been linked</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {linkedPlaceholders.map((placeholder) => (
                          <div key={placeholder.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {placeholder.full_name}
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                                  <Link className="h-3 w-3 mr-1" />
                                  Linked
                                </Badge>
                              </div>
                              {placeholder.email && (
                                <div className="text-sm text-muted-foreground">
                                  {placeholder.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="invites" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Generate New Invite
                    </CardTitle>
                    <CardDescription>Create an invite code for a new team member</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="carer">Carer</SelectItem>
                          <SelectItem value="family_admin">Family Admin</SelectItem>
                          <SelectItem value="family_viewer">Family Viewer</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={generateInvite} className="w-full">
                      Generate Invite Code
                    </Button>

                    {newInviteCode && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">New Invite Code:</div>
                            <div className="font-mono text-lg">{newInviteCode}</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard(newInviteCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {(inviteRole === 'family_admin' || inviteRole === 'disabled_person') && (
                          <p className="text-xs text-muted-foreground">
                            ⚠️ This will add a co-admin to your care space who will share full administrative access with you. Neither admin can remove or demote the other.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invites</CardTitle>
                    <CardDescription>Invite codes that haven't been used yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {invites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                         <div className="flex-1">
                           <div className="font-medium font-mono">{invite.code}</div>
                           <div className="text-sm text-muted-foreground">
                             Role: {invite.role ? (invite.role as string).replace('_', ' ') : 'Unknown Role'} • 
                             Created: {new Date(invite.created_at).toLocaleDateString()} •
                             Expires: {new Date(invite.expires_at).toLocaleDateString()}
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => copyToClipboard(invite.code)}
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                           <Button
                             size="sm"
                             variant="destructive"
                             onClick={() => revokeInvite(invite.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                        </div>
                      ))}
                      {invites.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No pending invites
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Role Change Requests</CardTitle>
                    <CardDescription>Review and approve role change requests from team members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {roleChangeRequests.map((request) => (
                        <div key={request.id} className="flex flex-col p-3 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                {request.profiles?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Requesting: {request.from_role?.replace('_', ' ')} → {request.requested_role?.replace('_', ' ')}
                              </div>
                              {request.reason && (
                                <div className="text-sm mt-1 p-2 bg-muted rounded">
                                  <span className="font-medium">Reason:</span> {request.reason}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Requested: {new Date(request.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDenyRoleChange(request.id)}
                              disabled={processingRequest === request.id}
                            >
                              Deny
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRoleChange(request.id, request.user_id, request.requested_role)}
                              disabled={processingRequest === request.id}
                            >
                              {processingRequest === request.id ? 'Processing...' : 'Approve'}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {roleChangeRequests.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No pending role change requests
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AddPlaceholderCarerDialog
        isOpen={showAddPlaceholderDialog}
        onClose={() => setShowAddPlaceholderDialog(false)}
        familyId={familyId}
        onSuccess={loadTeamData}
      />

      {bulkDeleteTarget && (
        <BulkDeleteShiftsDialog
          isOpen={!!bulkDeleteTarget}
          onClose={() => setBulkDeleteTarget(null)}
          familyId={familyId}
          mode={bulkDeleteTarget.mode}
          carerId={bulkDeleteTarget.id}
          carerName={bulkDeleteTarget.name}
          onSuccess={loadTeamData}
        />
      )}
    </>
  );
};
