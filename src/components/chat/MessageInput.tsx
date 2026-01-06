import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, Image, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface MessageInputProps {
  onSend: (content: string, attachment?: { url: string; type: string; name: string }) => Promise<boolean>;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageInput = ({ onSend, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [onTyping]);

  const uploadAttachment = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    try {
      setUploading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload the file. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || sending || uploading) return;

    setSending(true);
    
    // Clear typing indicator
    if (onTyping) {
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    let attachmentData: { url: string; type: string; name: string } | undefined;

    if (attachment) {
      const uploaded = await uploadAttachment(attachment.file);
      if (uploaded) {
        attachmentData = uploaded;
      } else {
        setSending(false);
        return;
      }
    }

    const success = await onSend(message || (attachment ? `Sent ${attachment.type === 'image' ? 'an image' : 'a file'}` : ''), attachmentData);
    if (success) {
      setMessage('');
      setAttachment(null);
    }
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive'
      });
      return;
    }

    const isImage = file.type.startsWith('image/');
    const newAttachment: Attachment = {
      file,
      type: isImage ? 'image' : 'file'
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newAttachment.preview = e.target?.result as string;
        setAttachment(newAttachment);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment(newAttachment);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="p-3 sm:p-4 border-t bg-background">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-2">
          {attachment.type === 'image' && attachment.preview ? (
            <img 
              src={attachment.preview} 
              alt="Preview" 
              className="h-12 w-12 object-cover rounded"
            />
          ) : (
            <div className="h-12 w-12 bg-background rounded flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={removeAttachment}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          disabled={sending || uploading}
        />
        <Button 
          onClick={handleSend} 
          disabled={(!message.trim() && !attachment) || sending || uploading}
          size="icon"
          className="shrink-0"
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
