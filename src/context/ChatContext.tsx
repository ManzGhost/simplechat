import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Conversation, Message, User, MessageType, MessageReplyMetadata, UserStatus } from '../types';
import { chatService } from '../services/chatService';
import { websocketService } from '../services/websocketService';
import { useAuth } from '../hooks/useAuth';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  isWsConnected: boolean;
  conversationsError: string | null;
  replyingToMessage: Message | null;
  setReplyingToMessage: (message: Message | null) => void;
  selectConversation: (conversation: Conversation | null) => Promise<void>;
  openConversationWithUser: (targetUser: User) => Promise<Conversation>;
  sendMessage: (
    content: string,
    messageType?: MessageType,
    replyTo?: MessageReplyMetadata,
    conversationOverride?: Conversation
  ) => Promise<void>;
  sendStoryReply: (
    targetUser: User,
    status: UserStatus,
    replyText: string
  ) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  clearActiveConversation: () => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(websocketService.getIsConnected());
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const activeConversationRef = useRef<Conversation | null>(null);
  activeConversationRef.current = activeConversation;

  // Load conversations from server
  const loadConversations = useCallback(async (isRetry = false) => {
    if (!user) return;
    if (!isRetry) {
      setIsLoadingConversations(true);
    }
    setConversationsError(null);
    try {
      const data = await chatService.getConversations();
      // Sort by latest message or updatedAt
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.lastMessageTimestamp || a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.lastMessageTimestamp || b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      setConversations(sorted);
      setConversationsError(null);

      // Also update activeConversation if it exists
      if (activeConversationRef.current) {
        const currentActiveId = activeConversationRef.current.id;
        const found = sorted.find((c) => c.id === currentActiveId);
        if (found) {
          setActiveConversation(found);
        }
      }
    } catch (err: any) {
      console.warn('Error loading conversations', err?.message || err);
      const isNetError =
        !err?.response ||
        err?.code === 'ERR_NETWORK' ||
        err?.message === 'Network Error' ||
        (err?.response?.status >= 502 && err?.response?.status <= 504);

      if (!isRetry && isNetError) {
        setTimeout(() => {
          loadConversations(true);
        }, 2000);
      } else {
        setConversationsError(err?.response?.data?.message || err?.message || 'Failed to load conversations');
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setConversationsError(null);
    }
  }, [user, loadConversations]);

  // Re-fetch conversations if websocket connection is established
  useEffect(() => {
    if (isWsConnected && user && conversations.length === 0) {
      loadConversations(true);
    }
  }, [isWsConnected, user, conversations.length, loadConversations]);

  // Handle selecting a conversation
  const selectConversation = async (conversation: Conversation | null) => {
    setActiveConversation(conversation);
    setReplyingToMessage(null);
    if (!conversation) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const msgList = await chatService.getMessages(conversation.id);
      setMessages(msgList);

      // If there are unread messages, mark as seen
      if (conversation.unreadCount && conversation.unreadCount > 0) {
        await chatService.markAsSeen(conversation.id);

        // Notify via websocket
        if (conversation.otherUser && user) {
          websocketService.notifySeen(conversation.id, conversation.otherUser.id, user.id);
        }

        // Update local conversation unread count
        setConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages for conversation', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const clearActiveConversation = () => {
    setActiveConversation(null);
    setReplyingToMessage(null);
    setMessages([]);
  };

  // Open or create conversation with another user
  const openConversationWithUser = async (targetUser: User): Promise<Conversation> => {
    const existing = conversations.find(
      (c) => c.otherUser?.id === targetUser.id || c.participantIds.includes(targetUser.id)
    );

    if (existing) {
      await selectConversation(existing);
      return existing;
    }

    const newConv = await chatService.createOrGetConversation(targetUser.id);
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === newConv.id);
      if (exists) return prev;
      return [newConv, ...prev];
    });
    await selectConversation(newConv);
    return newConv;
  };

  // Send message
  const sendMessage = async (
    content: string,
    messageType: MessageType = 'TEXT',
    replyTo?: MessageReplyMetadata,
    conversationOverride?: Conversation
  ) => {
    const trimmed = content.trim();
    const targetConv = conversationOverride || activeConversation;
    if (!trimmed || !targetConv || !user) return;

    const receiverId =
      targetConv.otherUser?.id ||
      targetConv.participantIds.find((id) => id !== user.id);
    if (!receiverId) return;

    // Resolve reply metadata if available
    const activeReply = replyTo || (replyingToMessage ? {
      id: replyingToMessage.id,
      senderId: replyingToMessage.senderId,
      senderName: replyingToMessage.senderId === user.id ? 'You' : (targetConv.otherUser?.name || 'User'),
      content: replyingToMessage.content,
      messageType: replyingToMessage.messageType,
    } : undefined);

    // Reset replying preview
    setReplyingToMessage(null);
    setIsSendingMessage(true);

    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const optimisticMsg: Message = {
      id: tempId,
      conversationId: targetConv.id,
      senderId: user.id,
      receiverId,
      content: trimmed,
      messageType,
      timestamp: now,
      delivered: false,
      seen: false,
      replyTo: activeReply,
    };

    // Immediate optimistic UI feedback: show message instantly
    if (!activeConversation || activeConversation.id === targetConv.id) {
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    // Update conversation preview in sidebar list
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConv.id) {
          return {
            ...c,
            lastMessage: optimisticMsg,
            lastMessageTimestamp: now,
          };
        }
        return c;
      })
    );

    try {
      // Primary send via REST API for persistence
      const savedMsg = await chatService.sendMessage({
        conversationId: targetConv.id,
        receiverId,
        content: trimmed,
        messageType,
        replyTo: activeReply,
      });

      // Replace optimistic temporary message with server-confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMsg : m))
      );

      // Re-sort and update conversation preview with confirmed timestamp
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConv.id) {
            return {
              ...c,
              lastMessage: savedMsg,
              lastMessageTimestamp: savedMsg.timestamp,
            };
          }
          return c;
        })
      );
    } catch (apiErr) {
      console.warn('REST API send notice; attempting WebSocket...', apiErr);

      try {
        if (websocketService.getIsConnected()) {
          websocketService.sendMessage({
            conversationId: targetConv.id,
            receiverId,
            senderId: user.id,
            content: trimmed,
            messageType,
            replyTo: activeReply,
          });
        }
      } catch (wsErr) {
        console.error('WebSocket send attempt failed', wsErr);
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Send story reply with attached status metadata
  const sendStoryReply = async (
    targetUser: User,
    status: UserStatus,
    replyText: string
  ) => {
    const trimmed = replyText.trim();
    if (!trimmed || !user) return;

    // 1. Open or select conversation with the story author
    const targetConv = await openConversationWithUser(targetUser);

    // 2. Build structured status metadata to attach to the message
    const statusReply: MessageReplyMetadata = {
      id: `status_${status.id}`,
      senderId: targetUser.id,
      senderName: `${targetUser.name}'s Status`,
      content:
        status.type === 'IMAGE'
          ? status.caption
            ? `📷 Photo: ${status.caption}`
            : '📷 Photo'
          : status.content,
      messageType: 'TEXT',
      isStatusReply: true,
      statusType: status.type,
      statusThumbnail: status.type === 'IMAGE' ? status.content : undefined,
      statusCaption: status.caption,
      statusBackgroundColor: status.backgroundColor,
    };

    // 3. Dispatch message with attached status to that conversation
    await sendMessage(trimmed, 'TEXT', statusReply, targetConv);
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    await chatService.deleteConversation(conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversation?.id === conversationId) {
      setActiveConversation(null);
      setMessages([]);
    }
  };

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubStatus = websocketService.onStatusChange((connected) => {
      setIsWsConnected(connected);
    });

    const unsubMessage = websocketService.onMessageReceived((newMsg) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && newMsg.conversationId === currentActive.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
          }

          const pendingIdx = prev.findIndex(
            (m) =>
              m.id.startsWith('temp_') &&
              m.senderId === newMsg.senderId &&
              m.content === newMsg.content
          );

          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = newMsg;
            return next;
          }
          return [...prev, newMsg];
        });

        if (user && newMsg.senderId !== user.id) {
          chatService.markAsSeen(currentActive.id);
          websocketService.notifySeen(currentActive.id, newMsg.senderId, user.id);
        }
      }

      setConversations((prev) => {
        const found = prev.find((c) => c.id === newMsg.conversationId);
        if (found) {
          const isCurrentlyActive = currentActive?.id === newMsg.conversationId;
          const isSender = user && newMsg.senderId === user.id;
          const updatedUnread = isCurrentlyActive || isSender ? 0 : (found.unreadCount || 0) + 1;

          const updatedConv: Conversation = {
            ...found,
            lastMessage: newMsg,
            lastMessageTimestamp: newMsg.timestamp,
            unreadCount: updatedUnread,
          };

          const remaining = prev.filter((c) => c.id !== newMsg.conversationId);
          return [updatedConv, ...remaining];
        } else {
          loadConversations();
          return prev;
        }
      });
    });

    const unsubSeen = websocketService.onSeen(({ conversationId }) => {
      if (activeConversationRef.current?.id === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id ? { ...m, seen: true, delivered: true } : m
          )
        );
      }
    });

    const unsubPresence = websocketService.onPresence(({ userId, online, lastSeen }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.otherUser?.id === userId) {
            return {
              ...c,
              otherUser: {
                ...c.otherUser,
                online,
                lastSeen: lastSeen || c.otherUser.lastSeen,
              },
            };
          }
          return c;
        })
      );

      setActiveConversation((prev) => {
        if (prev && prev.otherUser?.id === userId) {
          return {
            ...prev,
            otherUser: {
              ...prev.otherUser,
              online,
              lastSeen: lastSeen || prev.otherUser.lastSeen,
            },
          };
        }
        return prev;
      });
    });

    const unsubDeleted = websocketService.onConversationDeleted(({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationRef.current?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
      unsubSeen();
      unsubPresence();
      unsubDeleted();
    };
  }, [user, loadConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isSendingMessage,
        isWsConnected,
        conversationsError,
        replyingToMessage,
        setReplyingToMessage,
        selectConversation,
        openConversationWithUser,
        sendMessage,
        sendStoryReply,
        deleteConversation,
        refreshConversations: loadConversations,
        clearActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
