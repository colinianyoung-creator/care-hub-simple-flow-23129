import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !familyId) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        setCurrentUserId(user.user.id);

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
            .from('profiles')
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

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) return;

    setCreating(true);
    try {
      const type = selectedMembers.length === 1 ? 'direct' : 'group';
      const name = type === 'group' && groupName.trim() ? groupName.trim() : undefined;
      
      const conversationId = await createConversation(type, selectedMembers, name);
      
      if (conversationId) {
        onConversationCreated(conversationId);
        handleClose();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setGroupName('');
    onClose();
  };

  const isGroup = selectedMembers.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
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
            <>
              <div className="space-y-2">
                <Label>Select members</Label>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {members.map(member => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => handleToggleMember(member.id)}
                      />
                      <Avatar className="h-10 w-10">
                        {member.profile_picture_url && (
                          <AvatarImage src={member.profile_picture_url} alt={member.full_name} />
                        )}
                        <AvatarFallback className="bg-muted">
                          {member.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{member.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {isGroup && (
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group name (optional)</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={selectedMembers.length === 0 || creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : isGroup ? 'Create Group' : 'Start Chat'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
