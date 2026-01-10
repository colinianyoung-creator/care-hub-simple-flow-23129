import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Users, User, MessageCircle, MoreVertical, Trash2 } from 'lucide-react';
import { Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conversation: Conversation) => void;
  onDelete?: (conversationId: string) => Promise<boolean>;
  currentUserId?: string | null;
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

export const ConversationList = ({ conversations, loading, onSelect, onDelete, currentUserId }: ConversationListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete || !onDelete) return;
    setDeleting(true);
    await onDelete(conversationToDelete.id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground max-w-[250px]">
          Start a new conversation to message your care team
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-y-auto h-full p-3 space-y-2">
        {conversations.map(conversation => {
          const otherParticipants = conversation.participants.filter(
            p => p.user_id !== currentUserId
          );
          
          const displayName = conversation.type === 'group' 
            ? conversation.name || 'Group Chat'
            : otherParticipants.map(p => p.full_name).join(', ') || 'Unknown';

          const avatar = conversation.type === 'direct' && otherParticipants.length > 0
            ? otherParticipants[0]
            : null;

          const isFamilyChat = conversation.name === 'Family Chat' && conversation.type === 'group';
          const hasUnread = conversation.unread_count > 0;

          return (
            <div
              key={conversation.id}
              className={`
                relative group w-full p-3 sm:p-4 flex items-center gap-3 
                rounded-xl border transition-all duration-200
                hover:shadow-md hover:border-primary/20
                ${isFamilyChat 
                  ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20' 
                  : 'bg-card hover:bg-accent/50'
                }
                ${hasUnread ? 'border-primary/30 shadow-sm' : 'border-border'}
              `}
            >
              <button
                onClick={() => onSelect(conversation)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="relative shrink-0">
                  {conversation.type === 'group' ? (
                    <div className={`
                      h-12 w-12 rounded-full flex items-center justify-center
                      ${isFamilyChat 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20' 
                        : 'bg-primary/10'
                      }
                    `}>
                      <Users className={`h-5 w-5 ${isFamilyChat ? 'text-primary-foreground' : 'text-primary'}`} />
                    </div>
                  ) : avatar ? (
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      {avatar.profile_picture_url && (
                        <AvatarImage src={avatar.profile_picture_url} alt={avatar.full_name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-foreground font-medium">
                        {avatar.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  {hasUnread && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-semibold shadow-lg"
                    >
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </Badge>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold truncate ${hasUnread ? 'text-foreground' : 'text-foreground/90'}`}>
                      {displayName}
                    </span>
                    {conversation.last_message && (
                      <span className={`text-xs shrink-0 ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {formatMessageTime(conversation.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {conversation.last_message ? (
                    <p className={`text-sm truncate mt-0.5 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conversation.type === 'group' && (
                        <span className="text-muted-foreground">{conversation.last_message.sender_name}: </span>
                      )}
                      {conversation.last_message.content || '📎 Attachment'}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 mt-0.5 italic">No messages yet</p>
                  )}
                </div>
              </button>

              {/* Delete dropdown - visible on hover */}
              {!isFamilyChat && onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDeleteClick(e, conversation)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
