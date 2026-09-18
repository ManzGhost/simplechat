import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { Navbar } from '../components/Navbar';
import { ConversationList } from '../components/ConversationList';
import { ChatWindow } from '../components/ChatWindow';
import { ProfileModal } from '../components/ProfileModal';
import { User } from '../types';

export const ChatDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    conversationsError,
    refreshConversations,
    selectConversation,
    openConversationWithUser,
    sendMessage,
    deleteConversation,
    clearActiveConversation,
  } = useChat();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'status'>('chats');

  // When an active conversation is opened (e.g. from story reply or user selection), ensure chats tab is active
  useEffect(() => {
    if (activeConversation) {
      setActiveTab('chats');
    }
  }, [activeConversation?.id]);

  if (!user) return null;

  const handleSelectConversation = (conv: any) => {
    setActiveTab('chats');
    selectConversation(conv);
  };

  const handleSelectUserFromSearch = (targetUser: User) => {
    setActiveTab('chats');
    openConversationWithUser(targetUser);
  };

  return (
    <div id="chat-dashboard-container" className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-slate-950 night:bg-black transition-colors">
      {/* Top Navigation */}
      <Navbar
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Chat Interface */}
      <main id="chat-main-area" className="flex-1 flex overflow-hidden relative">
        {/* Sidebar / Conversation List:
            On mobile: hidden when activeConversation is selected.
            On desktop: always visible as the left column */}
        <div
          className={`h-full w-full md:w-auto ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            isLoading={isLoadingConversations}
            error={conversationsError}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onRetry={refreshConversations}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={(id) => deleteConversation(id)}
            onSelectUserFromSearch={handleSelectUserFromSearch}
          />
        </div>

        {/* Chat Area / Chat Window:
            On mobile: visible only when activeConversation is selected.
            On desktop: always visible as right column (shows empty state if none selected) */}
        <div
          className={`h-full flex-1 ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatWindow
            conversation={activeConversation}
            currentUser={user}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isSendingMessage={isSendingMessage}
            onSendMessage={sendMessage}
            onDeleteConversation={deleteConversation}
            onBack={clearActiveConversation}
          />
        </div>
      </main>

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};
