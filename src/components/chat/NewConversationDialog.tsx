import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface FamilyMember {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
}

interface NewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId?: string;
  onConversationCreated: (conversationId: string) => void;
  createConversation: (
    type: 'group' | 'direct',
    participantIds: string[],
    name?: string
  ) => Promise<string | null>;
}

export const NewConversationDialog = ({
  isOpen,
  onClose,
  familyId,
  onConversationCreated,
  createConversation
}: NewConversationDialogProps) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [activeTab, setActiveTab] = useState<'group' | 'individual'>('group');

  useEffect(() => {
    if (!isOpen || !familyId) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Get family members
        const { data: memberships } = await supabase
          .from('user_memberships')
          .select('user_id')
          .eq('family_id', familyId);

        if (!memberships) return;

        // Get profiles for each member (excluding current user)
        const memberProfiles: FamilyMember[] = [];
        for (const membership of memberships) {
          if (membership.user_id === user.user.id) continue;
          
          const { data: profile } = await supabase
            .from('profiles_limited')
            .select('id, full_name, profile_picture_url')
            .eq('id', membership.user_id)
            .single();

          if (profile) {
            memberProfiles.push({
              id: profile.id,
              full_name: profile.full_name || 'Unknown',
              profile_picture_url: profile.profile_picture_url
            });
          }
        }

        setMembers(memberProfiles);
      } catch (error) {
        console.error('Error fetching family members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [isOpen, familyId]);

  const handleCreateGroup = async () => {
    if (members.length === 0) return;

    setCreating(true);
    try {
      const allMemberIds = members.map(m => m.id);
      const name = groupName.trim() || undefined;
      
      const conversationId = await createConversation('group', allMemberIds, name);
      
      if (conversationId) {
        onConversationCreated(conversationId);
        handleClose();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDirect = async () => {
    if (!selectedMember) return;

    setCreating(true);
    try {
      const conversationId = await createConversation('direct', [selectedMember]);
      
      if (conversationId) {
        onConversationCreated(conversationId);
        handleClose();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setGroupName('');
    setActiveTab('group');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No other family members found</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'group' | 'individual')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Group Chat</span>
                <span className="sm:hidden">Group</span>
              </TabsTrigger>
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Individual</span>
                <span className="sm:hidden">1-on-1</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="group" className="flex-1 flex flex-col space-y-4 mt-4 overflow-hidden">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  Create a group chat with all {members.length} family member{members.length !== 1 ? 's' : ''}.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="groupName">Group name (optional)</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 mt-auto">
                <Button variant="outline" onClick={handleClose} className="w-full sm:flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={creating}
                  className="w-full sm:flex-1"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="flex-1 flex flex-col space-y-4 mt-4 overflow-hidden">
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <Label>Select a member</Label>
                <div className="border rounded-lg divide-y overflow-y-auto flex-1">
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member.id)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        selectedMember === member.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        {member.profile_picture_url && (
                          <AvatarImage src={member.profile_picture_url} alt={member.full_name} />
                        )}
                        <AvatarFallback className="bg-muted">
                          {member.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{member.full_name}</span>
                      {selectedMember === member.id && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="w-full sm:flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateDirect}
                  disabled={!selectedMember || creating}
                  className="w-full sm:flex-1"
                >
                  {creating ? 'Creating...' : 'Start Chat'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
