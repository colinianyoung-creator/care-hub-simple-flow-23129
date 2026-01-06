import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  user_id: string;
  full_name: string;
  profile_picture_url: string | null;
}

export interface Conversation {
  id: string;
  family_id: string;
  type: 'group' | 'direct';
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
}

export const useConversations = (familyId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getOrCreateFamilyGroupChat = async (): Promise<string | null> => {
    if (!familyId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Look for existing family group chat
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('family_id', familyId)
        .eq('type', 'group')
        .eq('name', 'Family Chat')
        .maybeSingle();

      if (existingConvo) {
        // Check if current user is a participant
        const { data: participation } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', existingConvo.id)
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (!participation) {
          // Add current user to the family chat
          await supabase.from('conversation_participants').insert({
            conversation_id: existingConvo.id,
            user_id: userData.user.id
          });
        }
        return existingConvo.id;
      }

      // Get all family members
      const { data: familyMembers } = await supabase
        .from('user_memberships')
        .select('user_id')
        .eq('family_id', familyId);

      if (!familyMembers || familyMembers.length === 0) return null;

      // Create family group chat
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          family_id: familyId,
          type: 'group',
          name: 'Family Chat',
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error || !newConvo) return null;

      // Add all family members as participants
      const participants = familyMembers.map(member => ({
        conversation_id: newConvo.id,
        user_id: member.user_id
      }));

      await supabase.from('conversation_participants').insert(participants);

      return newConvo.id;
    } catch (error) {
      console.error('Error getting/creating family group chat:', error);
      return null;
    }
  };

  const fetchConversations = async () => {
    if (!familyId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get conversations the user participates in
      const { data: convos, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id, last_read_at)
        `)
        .eq('family_id', familyId)
        .eq('conversation_participants.user_id', user.user.id);

      if (error) throw error;

      // Enrich with participant info and last message
      const enrichedConversations: Conversation[] = await Promise.all(
        (convos || []).map(async (convo) => {
          // Get all participants with their profiles
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', convo.id);

          const participantProfiles: Participant[] = [];
          for (const p of participants || []) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('id', p.user_id)
              .single();
            
            participantProfiles.push({
              user_id: p.user_id,
              full_name: profile?.full_name || 'Unknown',
              profile_picture_url: profile?.profile_picture_url || null
            });
          }

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', convo.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastMessage;
          if (lastMessageData) {
            const sender = participantProfiles.find(p => p.user_id === lastMessageData.sender_id);
            lastMessage = {
              content: lastMessageData.content,
              created_at: lastMessageData.created_at,
              sender_name: sender?.full_name || 'Unknown'
            };
          }

          // Get unread count
          const userParticipant = convo.conversation_participants.find(
            (p: { user_id: string }) => p.user_id === user.user!.id
          );
          const lastReadAt = userParticipant?.last_read_at;
          
          let unreadCount = 0;
          const unreadQuery = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .eq('is_deleted', false)
            .neq('sender_id', user.user!.id);
          
          if (lastReadAt) {
            unreadQuery.gt('created_at', lastReadAt);
          }
          
          const { count } = await unreadQuery;
          unreadCount = count || 0;

          return {
            id: convo.id,
            family_id: convo.family_id,
            type: convo.type as 'group' | 'direct',
            name: convo.name,
            created_by: convo.created_by,
            created_at: convo.created_at,
            updated_at: convo.updated_at,
            participants: participantProfiles,
            last_message: lastMessage,
            unread_count: unreadCount
          };
        })
      );

      // Sort: Family Chat first, then by last message time
      enrichedConversations.sort((a, b) => {
        // Family Chat always first
        if (a.name === 'Family Chat' && a.type === 'group') return -1;
        if (b.name === 'Family Chat' && b.type === 'group') return 1;
        
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [familyId]);

  const createConversation = async (
    type: 'group' | 'direct',
    participantIds: string[],
    name?: string
  ): Promise<string | null> => {
    if (!familyId) return null;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Create conversation
      const { data: convo, error: convoError } = await supabase
        .from('conversations')
        .insert({
          family_id: familyId,
          type,
          name: name || null,
          created_by: user.user.id
        })
        .select()
        .single();

      if (convoError) throw convoError;

      // Add participants (include creator)
      const allParticipants = [...new Set([user.user.id, ...participantIds])];
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map(userId => ({
            conversation_id: convo.id,
            user_id: userId
          }))
        );

      if (participantsError) throw participantsError;

      await fetchConversations();
      return convo.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive'
      });
      return null;
    }
  };

  const getOrCreateDirectConversation = async (otherUserId: string): Promise<string | null> => {
    if (!familyId) return null;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Check if a direct conversation already exists between these two users
      const existingConvo = conversations.find(c => 
        c.type === 'direct' && 
        c.participants.length === 2 &&
        c.participants.some(p => p.user_id === otherUserId)
      );

      if (existingConvo) {
        return existingConvo.id;
      }

      // Create new direct conversation
      return createConversation('direct', [otherUserId]);
    } catch (error) {
      console.error('Error getting/creating direct conversation:', error);
      return null;
    }
  };

  return {
    conversations,
    loading,
    createConversation,
    getOrCreateDirectConversation,
    getOrCreateFamilyGroupChat,
    refetch: fetchConversations
  };
};
