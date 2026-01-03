import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
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
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              {selectedConversation && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="flex-1">
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
              {!selectedConversation && (
                <Button size="sm" onClick={() => setShowNewConversation(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              )}
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
