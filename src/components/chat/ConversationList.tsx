import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Users, User } from 'lucide-react';
import { Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conversation: Conversation) => void;
}

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'dd/MM/yy');
  }
};

export const ConversationList = ({ conversations, loading, onSelect }: ConversationListProps) => {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new conversation to message your care team
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map(conversation => {
        const displayName = conversation.type === 'group' 
          ? conversation.name || 'Group Chat'
          : conversation.participants
              .map(p => p.full_name)
              .join(', ');

        const avatar = conversation.type === 'direct' && conversation.participants.length > 0
          ? conversation.participants[0]
          : null;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b"
          >
            <div className="relative shrink-0">
              {conversation.type === 'group' ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              ) : avatar ? (
                <Avatar className="h-10 w-10">
                  {avatar.profile_picture_url && (
                    <AvatarImage src={avatar.profile_picture_url} alt={avatar.full_name} />
                  )}
                  <AvatarFallback className="bg-muted">
                    {avatar.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {conversation.unread_count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                  {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium truncate ${conversation.unread_count > 0 ? 'text-foreground' : ''}`}>
                  {displayName}
                </span>
                {conversation.last_message && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatMessageTime(conversation.last_message.created_at)}
                  </span>
                )}
              </div>
              {conversation.last_message && (
                <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {conversation.type === 'group' && (
                    <span className="text-muted-foreground">{conversation.last_message.sender_name}: </span>
                  )}
                  {conversation.last_message.content}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
