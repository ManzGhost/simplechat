import React, { useState } from 'react';
import { MessageSquare, MessageSquarePlus, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { Conversation, User } from '../types';
import { ConversationItem } from './ConversationItem';
import { UserSearch } from './UserSearch';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusTab } from './StatusTab';
import { useStatus } from '../hooks/useStatus';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  error?: string | null;
  activeTab?: 'chats' | 'status';
  onTabChange?: (tab: 'chats' | 'status') => void;
  onRetry?: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onSelectUserFromSearch: (user: User) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversation,
  isLoading,
  error,
  activeTab: externalTab,
  onTabChange,
  onRetry,
  onSelectConversation,
  onDeleteConversation,
  onSelectUserFromSearch,
}) => {
  const [internalTab, setInternalTab] = useState<'chats' | 'status'>('chats');
  const currentTab = externalTab ?? internalTab;
  const setTab = (tab: 'chats' | 'status') => {
    if (onTabChange) onTabChange(tab);
    setInternalTab(tab);
  };

  const { recentUpdates, hasUnviewed } = useStatus();
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <aside
      id="conversations-sidebar"
      className="flex flex-col h-full bg-white dark:bg-slate-900 night:bg-black border-r border-neutral-200 dark:border-slate-800 night:border-neutral-800 w-full md:w-80 lg:w-96 shrink-0 select-none transition-colors"
    >
      {/* Top Sidebar Tab Switcher: Chats vs Status */}
      <div className="flex border-b border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-white dark:bg-slate-900 night:bg-black px-2 pt-1 shrink-0">
        <button
          id="sidebar-tab-chats"
          onClick={() => setTab('chats')}
          className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            currentTab === 'chats'
              ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {totalUnread > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              {totalUnread}
            </span>
          )}
        </button>

        <button
          id="sidebar-tab-status"
          onClick={() => setTab('status')}
          className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            currentTab === 'status'
              ? 'border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-3.5 h-3.5" />
            {hasUnviewed && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </div>
          <span>Status</span>
          {recentUpdates.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              {recentUpdates.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Body */}
      {currentTab === 'status' ? (
        <div className="flex-1 overflow-hidden">
          <StatusTab onSelectUserForChat={onSelectUserFromSearch} />
        </div>
      ) : (
        <>
          {/* Search Header */}
          <UserSearch onSelectUser={onSelectUserFromSearch} />

      {/* Conversations Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 bg-neutral-50/70 dark:bg-slate-900/60 night:bg-neutral-950/80 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 night:text-neutral-400">
            Messages ({conversations.length})
          </span>
          {onRetry && (
            <button
              id="refresh-conversations-btn"
              onClick={() => onRetry()}
              disabled={isLoading}
              title="Refresh messages"
              className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}
        </div>

        {isLoading && conversations.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner size="md" label="Loading conversations..." />
          </div>
        ) : error && conversations.length === 0 ? (
          <div
            id="error-conversations-state"
            className="p-8 flex flex-col items-center justify-center text-center text-neutral-500 dark:text-slate-400 gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">Unable to load messages</p>
              <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto">
                {error}
              </p>
            </div>
            {onRetry && (
              <button
                id="retry-load-conversations-btn"
                onClick={() => onRetry()}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div
            id="empty-conversations-state"
            className="p-8 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-slate-500 night:text-neutral-500 gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 night:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-slate-200 night:text-neutral-200">No conversations yet</p>
              <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 mt-1 max-w-[200px] mx-auto">
                Search users above to start a new conversation
              </p>
            </div>
          </div>
        ) : (
          <div id="conversations-list-container" className="divide-y divide-neutral-100 dark:divide-slate-800/60 night:divide-neutral-900">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                onSelect={() => onSelectConversation(conv)}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )}
</aside>
  );
};
