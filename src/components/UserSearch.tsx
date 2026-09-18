import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, MessageSquare, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { LoadingSpinner } from './LoadingSpinner';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  onClose?: () => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser, onClose }) => {
  const { user: currentUser } = useAuth();
  const { openConversationWithUser } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const users = await userService.searchUsers(query.trim());
        // Filter out currently logged in user
        const filtered = users.filter((u) => u.id !== currentUser?.id);
        setResults(filtered);
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, currentUser?.id]);

  const handleStartChat = async (targetUser: User) => {
    setIsStartingChat(targetUser.id);
    try {
      await openConversationWithUser(targetUser);
      onSelectUser(targetUser);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to start conversation', err);
    } finally {
      setIsStartingChat(null);
    }
  };

  return (
    <div id="user-search-container" className="p-3 border-b border-neutral-200 dark:border-slate-800 night:border-neutral-800 bg-neutral-50/50 dark:bg-slate-900/80 night:bg-black transition-colors">
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 dark:text-slate-500 night:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="user-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name, @username, or email..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 night:bg-neutral-900 border border-neutral-200 dark:border-slate-700 night:border-neutral-800 text-neutral-900 dark:text-slate-100 night:text-white rounded-lg placeholder:text-neutral-400 dark:placeholder:text-slate-500 night:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors"
        />
        {query && (
          <button
            id="clear-search-btn"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 night:hover:text-neutral-200 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search dropdown results */}
      {query.trim() && (
        <div
          id="user-search-results-box"
          className="mt-2 bg-white dark:bg-slate-800 night:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-slate-700 night:border-neutral-800 shadow-lg max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-slate-700/50 night:divide-neutral-800"
        >
          {isLoading ? (
            <div className="py-6">
              <LoadingSpinner size="sm" label="Searching users..." />
            </div>
          ) : results.length > 0 ? (
            results.map((u) => (
              <div
                key={u.id}
                id={`search-user-item-${u.id}`}
                className="flex items-center justify-between p-2.5 hover:bg-neutral-50 dark:hover:bg-slate-700/50 night:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="relative shrink-0">
                    {u.profileImage ? (
                      <img
                        src={u.profileImage}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-slate-700 night:border-neutral-700"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(
                          u.name
                        )}`}
                      >
                        {getInitials(u.name)}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 night:ring-neutral-900 ${
                        u.online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white night:text-white truncate">{u.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 truncate">@{u.username}</p>
                  </div>
                </div>

                <button
                  id={`chat-user-btn-${u.id}`}
                  onClick={() => handleStartChat(u)}
                  disabled={isStartingChat === u.id}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shrink-0 disabled:opacity-50 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isStartingChat === u.id ? 'Opening...' : 'Chat'}</span>
                </button>
              </div>
            ))
          ) : hasSearched ? (
            <div id="no-users-found-msg" className="p-4 text-center text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 flex flex-col items-center gap-1">
              <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-slate-500" />
              <span>No users found</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
