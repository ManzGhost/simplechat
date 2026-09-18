import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Send,
  Pause,
  Play,
  Clock,
  MessageCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { User, UserStatus } from '../types';
import { useStatus } from '../hooks/useStatus';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';
import { formatTimeAgo } from '../utils/dateUtils';

interface StoryViewerModalProps {
  user: User;
  statuses: UserStatus[];
  initialIndex?: number;
  onClose: () => void;
  onReply?: (targetUser: User, status: UserStatus, messageText: string) => void;
}

const STORY_DURATION_MS = 6000;
const REACTION_EMOJIS = ['❤️', '😂', '😮', '👏', '🔥', '🎉', '😍', '🙌'];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  user: storyAuthor,
  statuses,
  initialIndex = 0,
  onClose,
  onReply,
}) => {
  const { user: currentUser } = useAuth();
  const { markViewed, deleteStatus, recentUpdates, viewedUpdates, openViewer } = useStatus();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  const isOwnStory = currentUser?.id === storyAuthor.id;
  const currentStatus = statuses[currentIndex];

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  // Mark current status viewed whenever currentIndex changes
  useEffect(() => {
    if (currentStatus && !isOwnStory && !currentStatus.hasViewed) {
      markViewed(currentStatus.id);
    }
  }, [currentStatus, isOwnStory, markViewed]);

  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = Date.now();
    } else {
      // Find next user with unviewed stories
      const allOtherGroups = [...recentUpdates, ...viewedUpdates].filter(
        (g) => g.user.id !== storyAuthor.id
      );
      const nextGroup = allOtherGroups.find((g) => !g.allViewed) || allOtherGroups[0];
      if (nextGroup && nextGroup.statuses.length > 0) {
        openViewer(nextGroup.user, nextGroup.statuses, 0);
      } else {
        onClose();
      }
    }
  }, [currentIndex, statuses.length, recentUpdates, viewedUpdates, storyAuthor.id, openViewer, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = Date.now();
    }
  }, [currentIndex]);

  // Main timer loop
  useEffect(() => {
    if (isPaused || showViewersDrawer || !currentStatus) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        handleNext();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [currentIndex, isPaused, showViewersDrawer, currentStatus, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const handlePointerDown = () => {
    setIsPaused(true);
    elapsedBeforePauseRef.current = (progress / 100) * STORY_DURATION_MS;
  };

  const handlePointerUp = () => {
    setIsPaused(false);
  };

  const handleSendReply = (textToSend?: string) => {
    const message = (textToSend || replyText).trim();
    if (!message || !currentStatus || sendingFeedback) return;

    setIsPaused(true);
    setSendingFeedback(message);

    if (onReply) {
      onReply(storyAuthor, currentStatus, message);
    }
    setReplyText('');

    setTimeout(() => {
      onClose();
    }, 450);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setIsPaused(true);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentStatus || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteStatus(currentStatus.id);
      setShowDeleteConfirm(false);
      if (statuses.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setProgress(0);
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Failed to delete status', err);
      setShowDeleteConfirm(false);
      setIsPaused(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentStatus) return null;

  return (
    <div
      id="story-viewer-modal"
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none touch-none backdrop-blur-xs"
    >
      {/* Background container constrained like WhatsApp Web / Instagram Stories */}
      <div
        className="relative w-full max-w-md h-full sm:h-[88vh] sm:max-h-[820px] sm:rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl bg-neutral-900 border border-neutral-800"
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
      >
        {/* Top Segmented Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {statuses.map((st, idx) => {
            let width = '0%';
            if (idx < currentIndex) width = '100%';
            else if (idx === currentIndex) width = `${progress}%`;

            return (
              <div
                key={st.id}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header Bar */}
        <div className="relative z-30 pt-8 px-4 pb-3 flex items-center justify-between text-white bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/50 shrink-0">
              {storyAuthor.profileImage ? (
                <img
                  src={storyAuthor.profileImage}
                  alt={storyAuthor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center font-bold text-sm ${getAvatarColor(
                    storyAuthor.name
                  )}`}
                >
                  {getInitials(storyAuthor.name)}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {isOwnStory ? 'My Status' : storyAuthor.name}
              </p>
              <p className="text-xs text-white/75 leading-tight flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(currentStatus.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Pause / Play indicator */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Delete button for own story */}
            {isOwnStory && (
              <button
                id="delete-story-btn"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="p-2 rounded-full text-white/80 hover:text-rose-400 hover:bg-white/10 transition-colors"
                title="Delete this status"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              id="close-story-viewer-btn"
              onClick={onClose}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Content Stage */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {/* Previous / Next Tap Navigation Overlays */}
          <div
            className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 inset-y-0 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />

          {/* Previous & Next Visible Nav Buttons on hover */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="hidden sm:flex absolute left-3 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center transition-colors shadow-lg"
              title="Previous status"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="hidden sm:flex absolute right-3 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center transition-colors shadow-lg"
            title="Next status"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* TEXT Status Content */}
          {currentStatus.type === 'TEXT' ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
              style={{
                background:
                  currentStatus.backgroundColor ||
                  'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              }}
            >
              <p
                className={`text-white leading-relaxed font-semibold break-words max-w-[320px] whitespace-pre-wrap ${
                  currentStatus.content.length < 50
                    ? 'text-2xl sm:text-3xl'
                    : currentStatus.content.length < 120
                    ? 'text-xl sm:text-2xl'
                    : 'text-base sm:text-lg'
                } ${
                  currentStatus.fontStyle === 'serif'
                    ? 'font-serif'
                    : currentStatus.fontStyle === 'mono'
                    ? 'font-mono'
                    : 'font-sans'
                }`}
              >
                {currentStatus.content}
              </p>
            </div>
          ) : (
            /* IMAGE Status Content */
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
              <img
                src={currentStatus.content}
                alt={currentStatus.caption || 'Status'}
                className="w-full h-full object-contain"
              />
              {currentStatus.caption && (
                <div className="absolute bottom-2 inset-x-4 p-3 rounded-xl bg-black/70 backdrop-blur-md text-white text-sm text-center">
                  {currentStatus.caption}
                </div>
              )}
            </div>
          )}

          {/* Reaction & Status Attached Feedback Indicator */}
          {sendingFeedback && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex flex-col items-center gap-2.5 px-6 py-4 rounded-2xl bg-neutral-900/95 border border-neutral-700/80 shadow-2xl text-white text-center">
                <span className="text-4xl animate-bounce">{sendingFeedback}</span>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Status attached & reply sent</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interaction Area */}
        <div className="relative z-30 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Own Story: Viewers Button */}
          {isOwnStory ? (
            <div className="flex items-center justify-center">
              <button
                id="toggle-viewers-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewersDrawer(!showViewersDrawer);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-md transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>
                  {currentStatus.viewers?.length || 0} viewer
                  {(currentStatus.viewers?.length || 0) === 1 ? '' : 's'}
                </span>
              </button>
            </div>
          ) : (
            /* Others' Story: Emoji Reactions & Direct Chat Reply */
            <div className="space-y-2">
              {/* Quick Emojis */}
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendReply(emoji);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-lg transition-transform hover:scale-125"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendReply();
                }}
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  id="story-reply-input"
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  placeholder={`Reply to ${storyAuthor.name.split(' ')[0]}...`}
                  className="flex-1 px-3.5 py-2 text-xs rounded-full bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/25 transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors cursor-pointer"
                  title="Send reply in chat"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Viewers Drawer (for own status) */}
        {showViewersDrawer && isOwnStory && (
          <div
            className="absolute inset-x-0 bottom-0 z-40 max-h-[60%] bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-4 flex flex-col shadow-2xl text-white animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">
                  Viewed by {currentStatus.viewers?.length || 0}
                </span>
              </div>
              <button
                onClick={() => setShowViewersDrawer(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-2 max-h-56 pr-1">
              {!currentStatus.viewers || currentStatus.viewers.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  No views yet. Status updates are visible for 24 hours.
                </p>
              ) : (
                currentStatus.viewers.map((viewerItem, idx) => {
                  const viewer = viewerItem.user;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-800/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center font-bold text-xs">
                          {viewer?.profileImage ? (
                            <img
                              src={viewer.profileImage}
                              alt={viewer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(viewer?.name || 'User')
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white leading-tight">
                            {viewer?.name || 'Someone'}
                          </p>
                          <p className="text-[11px] text-neutral-400 leading-tight">
                            @{viewer?.username || 'user'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {formatTimeAgo(viewerItem.viewedAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* In-Modal Delete Confirmation Dialog (Safe in iframe) */}
        {showDeleteConfirm && (
          <div
            id="status-delete-confirm-overlay"
            className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white dark:bg-slate-900 night:bg-neutral-900 border border-neutral-200 dark:border-slate-800 night:border-neutral-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl text-neutral-900 dark:text-white space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Delete status update?</h4>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 leading-relaxed">
                    This status update will be permanently deleted from MongoDB Atlas for you and all your contacts.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  id="cancel-delete-status-btn"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setIsPaused(false);
                  }}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-status-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
