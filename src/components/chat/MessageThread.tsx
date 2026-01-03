import React, { useRef, useEffect } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useMessages, Message } from '@/hooks/useMessages';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageThreadProps {
  conversationId: string;
  conversationName: string;
}

const formatMessageDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'EEEE, d MMMM yyyy');
  }
};

const formatMessageTime = (dateString: string) => {
  return format(new Date(dateString), 'HH:mm');
};

const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
  if (!prevMsg) return true;
  return !isSameDay(new Date(currentMsg.created_at), new Date(prevMsg.created_at));
};

export const MessageThread = ({ conversationId, conversationName }: MessageThreadProps) => {
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : ''}`}>
              {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : undefined;
            const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
            const showSender = !message.is_own && (!prevMessage || prevMessage.sender_id !== message.sender_id || showDateSeparator);

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground px-2">
                      {formatMessageDate(message.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className={`flex gap-2 ${message.is_own ? 'justify-end' : ''}`}>
                  {!message.is_own && (
                    <div className="w-8 shrink-0">
                      {showSender && (
                        <Avatar className="h-8 w-8">
                          {message.sender_avatar && (
                            <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                          )}
                          <AvatarFallback className="bg-muted text-xs">
                            {message.sender_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${message.is_own ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showSender && !message.is_own && (
                      <span className="text-xs text-muted-foreground mb-1 ml-1">
                        {message.sender_name}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.is_own
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
};
