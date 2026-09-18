import React, { useState } from 'react';
import { Trash2, Mic } from 'lucide-react';
import { Conversation } from '../types';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatConversationTime } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { parseSticker, getStickerById } from '../data/stickers';
import { parseVoiceMessage, isVoiceMessage, formatAudioDuration } from '../utils/voiceUtils';
import { StatusAvatarRing } from './StatusAvatarRing';
import { useStatus } from '../hooks/useStatus';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { allContactStatuses, openViewer } = useStatus();

  const otherUser = conversation.otherUser;
  const name = otherUser?.name || 'Unknown User';
  const username = otherUser?.username || '';
  const isOnline = otherUser?.online || false;
  const lastMsg = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  const statusGroup = otherUser ? allContactStatuses.find((g) => g.user.id === otherUser.id) : null;
  const hasStatus = !!(statusGroup && statusGroup.statuses.length > 0);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(conversation.id);
      setShowConfirmDelete(false);
    } catch (err) {
      console.error('Failed to delete conversation', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        id={`conversation-item-${conversation.id}`}
        onClick={onSelect}
        className={`group relative flex items-center gap-3 p-3 cursor-pointer border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900 transition-colors ${
          isActive
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 night:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 night:border-emerald-800/40'
            : 'hover:bg-neutral-50 dark:hover:bg-slate-800/60 night:hover:bg-neutral-900/60'
        }`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {hasStatus && otherUser ? (
            <StatusAvatarRing
              user={otherUser}
              statuses={statusGroup.statuses}
              size="md"
              allViewed={statusGroup.allViewed}
              showOnlineDot={true}
              onClick={(e) => {
                e.stopPropagation();
                openViewer(otherUser, statusGroup.statuses, 0);
              }}
            />
          ) : (
            <>
              {otherUser?.profileImage ? (
                <img
                  src={otherUser.profileImage}
                  alt={name}
                  className="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-slate-700 night:border-neutral-700"
                />
              ) : (
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(
                    name
                  )}`}
                >
                  {getInitials(name)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
                  isOnline ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-slate-600 night:bg-neutral-700'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1 mb-1">
            <h3
              id={`conversation-name-${conversation.id}`}
              className={`text-sm font-semibold truncate ${
                isActive
                  ? 'text-emerald-950 dark:text-emerald-300 night:text-emerald-400 font-bold'
                  : 'text-neutral-900 dark:text-slate-100 night:text-white'
              }`}
            >
              {name}
            </h3>
            <span className="text-[11px] text-neutral-400 dark:text-slate-400 night:text-neutral-400 shrink-0">
              {formatConversationTime(conversation.lastMessageTimestamp || conversation.updatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              id={`conversation-last-msg-${conversation.id}`}
              className={`text-xs truncate ${
                unreadCount > 0
                  ? 'font-semibold text-neutral-900 dark:text-white night:text-white'
                  : 'text-neutral-500 dark:text-slate-400 night:text-neutral-400'
              }`}
            >
              {lastMsg ? (
                (() => {
                  const sticker =
                    parseSticker(lastMsg.content) ||
                    (lastMsg.messageType === 'STICKER' ? getStickerById(lastMsg.content) : null);
                  if (sticker) {
                    return (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 night:text-emerald-400">
                        <span>🎨 Sticker</span>
                        <span>{sticker.emoji}</span>
                        <span>{sticker.badgeText}</span>
                      </span>
                    );
                  }

                  if (lastMsg.messageType === 'VOICE' || isVoiceMessage(lastMsg.content)) {
                    const voice = parseVoiceMessage(lastMsg.content);
                    return (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 night:text-emerald-400">
                        <Mic className="w-3.5 h-3.5 shrink-0" />
                        <span>Voice message</span>
                        {voice?.duration ? <span>({formatAudioDuration(voice.duration)})</span> : null}
                      </span>
                    );
                  }

                  if (lastMsg.replyTo?.isStatusReply) {
                    return (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 night:text-emerald-400">
                          {lastMsg.replyTo.statusType === 'IMAGE' ? '📷 Status:' : '📝 Status:'}
                        </span>
                        <span className="truncate">{lastMsg.content}</span>
                      </span>
                    );
                  }

                  return lastMsg.content;
                })()
              ) : (
                <span className="italic text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                  No messages yet
                </span>
              )}
            </p>

            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <span
                  id={`unread-badge-${conversation.id}`}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-emerald-600 dark:bg-emerald-500 rounded-full min-w-[18px] text-center shadow-2xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              {/* Delete Button shown on hover or when active */}
              <button
                id={`delete-conversation-btn-${conversation.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 dark:text-slate-500 night:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 night:hover:bg-rose-950/40 rounded-md transition-opacity transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Conversation"
        message={`Are you sure you want to delete this conversation with ${name}? All messages will be permanently deleted.`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
};
