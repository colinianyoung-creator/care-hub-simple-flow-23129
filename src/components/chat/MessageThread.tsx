import React, { useRef, useEffect, useState } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useMessages, Message } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const { messages, loading, sendMessage, deleteMessage } = useMessages(conversationId);
  const { typingUsers, setTyping } = useTypingIndicator(conversationId);
  const { getReadersForMessage } = useReadReceipts(conversationId);
  const [userName, setUserName] = useState('');
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setUserName(profile?.full_name || 'You');
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleTyping = (isTyping: boolean) => {
    setTyping(isTyping, userName);
  };

  const handleSend = async (content: string, attachment?: { url: string; type: string; name: string }) => {
    return sendMessage(content, attachment);
  };

  const handleDeleteMessage = async () => {
    if (messageToDelete) {
      await deleteMessage(messageToDelete);
      setMessageToDelete(null);
    }
  };

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
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
            const showSender = !message.is_own && (!prevMessage || prevMessage.sender_id !== message.sender_id || showDateSeparator);
            const isLastOwnMessage = message.is_own && (!nextMessage || !nextMessage.is_own);
            const readers = getReadersForMessage(message.created_at);

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
                <div className={`flex gap-2 group ${message.is_own ? 'justify-end' : ''}`}>
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
                    <div className="flex items-center gap-1">
                      {message.is_own && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMessageToDelete(message.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.is_own
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {/* Attachment display */}
                        {message.attachment_url && (
                          <div className="mb-2">
                            {message.attachment_type === 'image' ? (
                              <img 
                                src={message.attachment_url} 
                                alt={message.attachment_name || 'Image'} 
                                className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                                onClick={() => window.open(message.attachment_url, '_blank')}
                              />
                            ) : (
                              <a 
                                href={message.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg ${
                                  message.is_own ? 'bg-primary-foreground/10' : 'bg-background'
                                }`}
                              >
                                <FileText className="h-5 w-5" />
                                <span className="text-xs flex-1 truncate">
                                  {message.attachment_name || 'File'}
                                </span>
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                      {!message.is_own && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMessageToDelete(message.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete for me
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isLastOwnMessage && (
                        <ReadReceiptIndicator readers={readers} isOwn={message.is_own} />
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={handleSend} onTyping={handleTyping} />

      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the message from this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
