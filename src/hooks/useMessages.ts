import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender_name: string;
  sender_avatar: string | null;
  is_own: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

export const useMessages = (conversationId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Get unique sender IDs and batch fetch profiles
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Build enriched messages
      type MessageWithAttachment = typeof messagesData[number] & {
        attachment_url?: string | null;
        attachment_type?: string | null;
        attachment_name?: string | null;
      };

      const enrichedMessages: Message[] = (messagesData as MessageWithAttachment[]).map((msg) => {
        const profile = profileMap.get(msg.sender_id);
        return {
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          is_deleted: msg.is_deleted,
          sender_name: profile?.full_name || 'Unknown',
          sender_avatar: profile?.profile_picture_url || null,
          is_own: msg.sender_id === user.user!.id,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          attachment_name: msg.attachment_name
        };
      });

      setMessages(enrichedMessages);

      // Mark as read
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.user.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) return;

          const newMsg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
            is_deleted: boolean;
            attachment_url?: string | null;
            attachment_type?: string | null;
            attachment_name?: string | null;
          };

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('id', newMsg.sender_id)
            .single();

          const enrichedMessage: Message = {
            id: newMsg.id,
            conversation_id: newMsg.conversation_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            is_deleted: newMsg.is_deleted,
            sender_name: profile?.full_name || 'Unknown',
            sender_avatar: profile?.profile_picture_url || null,
            is_own: newMsg.sender_id === user.user!.id,
            attachment_url: newMsg.attachment_url,
            attachment_type: newMsg.attachment_type,
            attachment_name: newMsg.attachment_name
          };

          setMessages(prev => [...prev, enrichedMessage]);

          // Mark as read if it's not our own message
          if (!enrichedMessage.is_own) {
            await supabase
              .from('conversation_participants')
              .update({ last_read_at: new Date().toISOString() })
              .eq('conversation_id', conversationId)
              .eq('user_id', user.user!.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const updatedMsg = payload.new as { id: string; is_deleted: boolean };
          if (updatedMsg.is_deleted) {
            setMessages(prev => prev.filter(m => m.id !== updatedMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (
    content: string, 
    attachment?: { url: string; type: string; name: string }
  ): Promise<boolean> => {
    if (!conversationId || (!content.trim() && !attachment)) return false;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const messageData: {
        conversation_id: string;
        sender_id: string;
        content: string;
        attachment_url?: string;
        attachment_type?: string;
        attachment_name?: string;
      } = {
        conversation_id: conversationId,
        sender_id: user.user.id,
        content: content.trim()
      };

      if (attachment) {
        messageData.attachment_url = attachment.url;
        messageData.attachment_type = attachment.type;
        messageData.attachment_name = attachment.name;
      }

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;

      // Remove from local state immediately
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      toast({
        title: 'Message deleted',
        description: 'The message has been removed'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages
  };
};
