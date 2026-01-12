import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReadReceipt {
  odialogd: string;
  userName: string;
  avatarUrl: string | null;
  lastReadAt: string;
}

export const useReadReceipts = (conversationId?: string) => {
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchReadReceipts = useCallback(async () => {
    if (!conversationId) {
      setReadReceipts([]);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      setCurrentUserId(user.user.id);

      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.user.id);

      if (error) throw error;

      // Get profile info for each participant
      const receipts: ReadReceipt[] = await Promise.all(
        (participants || [])
          .filter(p => p.last_read_at)
          .map(async (p) => {
            const { data: profile } = await supabase
              .from('profiles_secure')
              .select('full_name, profile_picture_url')
              .eq('id', p.user_id)
              .single();

            return {
              odialogd: p.user_id,
              userName: profile?.full_name || 'Unknown',
              avatarUrl: profile?.profile_picture_url || null,
              lastReadAt: p.last_read_at!
            };
          })
      );

      setReadReceipts(receipts);
    } catch (error) {
      console.error('Error fetching read receipts:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchReadReceipts();

    if (!conversationId) return;

    // Subscribe to changes in conversation_participants
    const channel = supabase
      .channel(`read-receipts-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchReadReceipts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchReadReceipts]);

  // Get who has read up to a specific message
  const getReadersForMessage = useCallback((messageCreatedAt: string): ReadReceipt[] => {
    return readReceipts.filter(r => new Date(r.lastReadAt) >= new Date(messageCreatedAt));
  }, [readReceipts]);

  return { readReceipts, getReadersForMessage, currentUserId, refetch: fetchReadReceipts };
};
