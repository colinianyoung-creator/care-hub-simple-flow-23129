import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, X } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { NewConversationDialog } from './NewConversationDialog';
import { useConversations, Conversation } from '@/hooks/useConversations';

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId?: string;
}

export const ChatDialog = ({ isOpen, onClose, familyId }: ChatDialogProps) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { conversations, loading, createConversation, refetch } = useConversations(familyId);

  const handleConversationCreated = async (conversationId: string) => {
    setShowNewConversation(false);
    await refetch();
    const newConvo = conversations.find(c => c.id === conversationId);
    if (newConvo) {
      setSelectedConversation(newConvo);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col p-0" showClose={false}>
          <DialogHeader className="p-3 sm:p-4 pb-2 border-b shrink-0">
            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
              <div className="flex items-center">
                {selectedConversation && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <DialogTitle className="text-sm sm:text-base truncate min-w-0">
                {selectedConversation 
                  ? selectedConversation.name || 
                    selectedConversation.participants
                      .filter(p => !selectedConversation.participants.some(op => op.user_id === p.user_id && selectedConversation.type === 'direct'))
                      .map(p => p.full_name)
                      .join(', ') ||
                    'Chat'
                  : 'Messages'
                }
              </DialogTitle>
              <div className="flex items-center gap-1">
                {!selectedConversation && (
                  <Button size="sm" className="shrink-0 text-xs sm:text-sm" onClick={() => setShowNewConversation(true)}>
                    <Plus className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">New</span>
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {selectedConversation ? (
              <MessageThread 
                conversationId={selectedConversation.id}
                conversationName={selectedConversation.name || 'Chat'}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                loading={loading}
                onSelect={setSelectedConversation}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewConversationDialog
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        familyId={familyId}
        onConversationCreated={handleConversationCreated}
        createConversation={createConversation}
      />
    </>
  );
};
