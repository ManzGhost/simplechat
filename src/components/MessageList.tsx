import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from './LoadingSpinner';
import { MessageSquare } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading: boolean;
  onReply?: (message: Message) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading,
  onReply,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`message-bubble-row-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((prev) => (prev === messageId ? null : prev));
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div id="messages-loading-state" className="flex-1 flex items-center justify-center p-8">
        <LoadingSpinner size="md" label="Loading messages..." />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        id="empty-messages-state"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400 dark:text-slate-500 night:text-neutral-500 gap-2 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 night:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200">No messages yet. Say hello!</p>
        <p className="text-xs text-neutral-400 dark:text-slate-500 night:text-neutral-500">Send a message below to start this conversation</p>
      </div>
    );
  }

  return (
    <div
      id="message-list-scrollable"
      className="flex-1 overflow-y-auto p-4 space-y-1 bg-neutral-50/50 dark:bg-slate-950/60 night:bg-black transition-colors scroll-smooth"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isSender={message.senderId === currentUserId}
          onReply={onReply}
          onScrollToMessage={handleScrollToMessage}
          isHighlighted={highlightedMessageId === message.id}
        />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
