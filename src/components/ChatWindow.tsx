import React from 'react';
import { MessageSquareDashed } from 'lucide-react';
import { Conversation, Message, User, MessageType } from '../types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../hooks/useChat';

interface ChatWindowProps {
  conversation: Conversation | null;
  currentUser: User;
  messages: Message[];
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  onSendMessage: (content: string, messageType?: MessageType) => Promise<void>;
  onDeleteConversation: (conversationId: string) => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUser,
  messages,
  isLoadingMessages,
  isSendingMessage,
  onSendMessage,
  onDeleteConversation,
  onBack,
}) => {
  const { replyingToMessage, setReplyingToMessage } = useChat();

  if (!conversation || !conversation.otherUser) {
    return (
      <div
        id="empty-chat-window"
        className="hidden md:flex flex-1 flex-col items-center justify-center bg-neutral-50/50 dark:bg-slate-950/60 night:bg-black p-8 text-center transition-colors"
      >
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 night:bg-neutral-900 border border-neutral-200 dark:border-slate-800 night:border-neutral-800 shadow-xs flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
          <MessageSquareDashed className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 id="empty-chat-title" className="text-base font-semibold text-neutral-800 dark:text-slate-100 night:text-white mb-1">
          Start a new conversation
        </h3>
        <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 max-w-sm leading-relaxed">
          Select a conversation from the sidebar or search for a user to start chatting in real-time.
        </p>
      </div>
    );
  }

  const replyTargetName = replyingToMessage
    ? replyingToMessage.senderId === currentUser.id
      ? 'yourself'
      : conversation.otherUser.name || 'User'
    : undefined;

  return (
    <div id="active-chat-window" className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 night:bg-black min-w-0 overflow-hidden transition-colors">
      <ChatHeader
        user={conversation.otherUser}
        conversationId={conversation.id}
        onBack={onBack}
        onDeleteConversation={onDeleteConversation}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUser.id}
        isLoading={isLoadingMessages}
        onReply={(msg) => setReplyingToMessage(msg)}
      />

      <MessageInput
        onSendMessage={onSendMessage}
        isSending={isSendingMessage}
        disabled={isLoadingMessages}
        replyingTo={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        replyTargetName={replyTargetName}
      />
    </div>
  );
};
