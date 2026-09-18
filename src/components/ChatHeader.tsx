import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, Trash2, Phone, Video } from 'lucide-react';
import { User } from '../types';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatLastSeen } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { useCall } from '../hooks/useCall';
import { StatusAvatarRing } from './StatusAvatarRing';
import { useStatus } from '../hooks/useStatus';

interface ChatHeaderProps {
  user: User;
  conversationId: string;
  onBack?: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  conversationId,
  onBack,
  onDeleteConversation,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { initiateCall, activeCall } = useCall();
  const { allContactStatuses, openViewer } = useStatus();

  const statusGroup = allContactStatuses.find((g) => g.user.id === user.id);
  const hasStatus = !!(statusGroup && statusGroup.statuses.length > 0);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteConversation(conversationId);
      setShowConfirmDelete(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        id="chat-header-container"
        className="bg-white dark:bg-slate-900 night:bg-black border-b border-neutral-200 dark:border-slate-800 night:border-neutral-800 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-2xs z-10 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button for mobile */}
          {onBack && (
            <button
              id="chat-back-button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-neutral-900 dark:hover:text-white night:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-900 rounded-lg transition-colors"
              title="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* User avatar with status indicator */}
          <div className="relative shrink-0">
            {hasStatus && statusGroup ? (
              <StatusAvatarRing
                user={user}
                statuses={statusGroup.statuses}
                size="sm"
                allViewed={statusGroup.allViewed}
                showOnlineDot={true}
                onClick={() => openViewer(user, statusGroup.statuses, 0)}
              />
            ) : (
              <>
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-slate-700 night:border-neutral-700"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(
                      user.name
                    )}`}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
                    user.online ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-slate-600 night:bg-neutral-700'
                  }`}
                />
              </>
            )}
          </div>

          {/* User name and status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="chat-header-username" className="text-sm font-bold text-neutral-900 dark:text-white night:text-white leading-tight truncate">
                {user.name}
              </h2>
              {hasStatus && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                  onClick={() => openViewer(user, statusGroup!.statuses, 0)}>
                  Story
                </span>
              )}
            </div>
            <div id="chat-header-status" className="flex items-center gap-1.5 text-xs">
              {user.online ? (
                <span className="text-emerald-600 dark:text-emerald-400 night:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-neutral-500 dark:text-slate-400 night:text-neutral-400">
                  {formatLastSeen(user.lastSeen, false)}
                </span>
              )}
              {user.about && (
                <>
                  <span className="text-neutral-300 dark:text-slate-600 night:text-neutral-700">•</span>
                  <span className="text-neutral-500 dark:text-slate-400 night:text-neutral-400 truncate max-w-[140px] italic">
                    "{user.about}"
                  </span>
                </>
              )}
              <span className="text-neutral-300 dark:text-slate-600 night:text-neutral-700">•</span>
              <span className="text-neutral-400 dark:text-slate-500 night:text-neutral-500 truncate">@{user.username}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Voice Call Button */}
          <button
            id="chat-header-voice-call-btn"
            onClick={() => initiateCall(user, conversationId, 'voice')}
            disabled={!!activeCall}
            className="p-2 sm:px-2.5 sm:py-2 text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 night:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 night:hover:bg-emerald-950/40 active:scale-95 border border-transparent hover:border-emerald-500/20 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            title={activeCall ? 'Call in progress' : `Voice call ${user.name}`}
            aria-label={`Voice call ${user.name}`}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-105" />
          </button>

          {/* Video Call Button */}
          <button
            id="chat-header-video-call-btn"
            onClick={() => initiateCall(user, conversationId, 'video')}
            disabled={!!activeCall}
            className="p-2 sm:px-2.5 sm:py-2 text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 night:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 night:hover:bg-blue-950/40 active:scale-95 border border-transparent hover:border-blue-500/20 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            title={activeCall ? 'Call in progress' : `Video call ${user.name}`}
            aria-label={`Video call ${user.name}`}
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-105" />
          </button>

          {/* Menu Button */}
          <div className="relative">
            <button
              id="chat-header-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-neutral-500 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 night:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              title="Conversation options"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {menuOpen && (
              <div
                id="chat-header-menu-dropdown"
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 night:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-slate-700 night:border-neutral-800 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  id="menu-delete-conversation-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowConfirmDelete(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 night:hover:bg-rose-950/40 flex items-center gap-2 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Conversation"
        message={`Delete this conversation with ${user.name}? This will permanently remove all chat history between both users.`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
};
