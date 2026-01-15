import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = (familyId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!familyId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get all conversations for the user
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.user.id);

      if (!participants || participants.length === 0) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Count unread messages for each conversation
      let totalUnread = 0;
      for (const participant of participants) {
        const query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', participant.conversation_id)
          .eq('is_deleted', false)
          .neq('sender_id', user.user.id);

        if (participant.last_read_at) {
          query.gt('created_at', participant.last_read_at);
        }

        const { count } = await query;
        totalUnread += count || 0;
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages and read receipt updates
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants'
        },
        async (payload) => {
          const { data: user } = await supabase.auth.getUser();
          // Only refetch if the update was for the current user's participant record
          if (payload.new && (payload.new as { user_id: string }).user_id === user?.user?.id) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, fetchUnreadCount]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
};
