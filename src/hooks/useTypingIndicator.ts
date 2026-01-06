import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  userId: string;
  userName: string;
}

export const useTypingIndicator = (conversationId?: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== currentUserId) {
            const presence = presences[0] as { typing?: boolean; userName?: string };
            if (presence?.typing) {
              users.push({
                userId: key,
                userName: presence.userName || 'Someone'
              });
            }
          }
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId]);

  const setTyping = useCallback(async (isTyping: boolean, userName: string) => {
    if (!channelRef.current || !currentUserId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      await channelRef.current.track({
        typing: isTyping,
        userName,
        online_at: new Date().toISOString()
      });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(async () => {
          if (channelRef.current) {
            await channelRef.current.track({
              typing: false,
              userName,
              online_at: new Date().toISOString()
            });
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }, [currentUserId]);

  return { typingUsers, setTyping };
};
