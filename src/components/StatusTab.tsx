import React, { useState } from 'react';
import {
  Plus,
  Camera,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock,
  Sparkles,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useStatus } from '../hooks/useStatus';
import { useAuth } from '../hooks/useAuth';
import { StatusAvatarRing } from './StatusAvatarRing';
import { formatTimeAgo } from '../utils/dateUtils';
import { User, UserStatus } from '../types';

interface StatusTabProps {
  onSelectUserForChat?: (user: User) => void;
}

export const StatusTab: React.FC<StatusTabProps> = () => {
  const { user } = useAuth();
  const {
    myStatuses,
    recentUpdates,
    viewedUpdates,
    isLoading,
    refreshStatuses,
    openViewer,
    openCreate,
    deleteStatus,
    deleteAllMyStatuses,
  } = useStatus();

  const [showViewedUpdates, setShowViewedUpdates] = useState(true);
  const [showMyStatusDetails, setShowMyStatusDetails] = useState(true);
  const [statusToDelete, setStatusToDelete] = useState<UserStatus | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  if (!user) return null;

  const hasMyStatus = myStatuses.length > 0;
  const totalMyViews = myStatuses.reduce(
    (acc, st) => acc + (st.viewers?.length || 0),
    0
  );

  const handleConfirmSingleDelete = async () => {
    if (!statusToDelete) return;
    setIsDeletingId(statusToDelete.id);
    try {
      await deleteStatus(statusToDelete.id);
      setStatusToDelete(null);
    } catch (err) {
      console.error('[Status] Failed to delete single status:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllMyStatuses();
      setConfirmDeleteAll(false);
    } catch (err) {
      console.error('[Status] Failed to delete all statuses:', err);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div
      id="status-tab-content"
      className="relative flex flex-col h-full bg-white dark:bg-slate-900 night:bg-black overflow-y-auto select-none transition-colors"
    >
      {/* Header with Quick Actions */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-slate-800 night:border-neutral-900 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-slate-900/60 night:bg-neutral-950/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-slate-300">
            Status
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
            24h
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="create-text-status-header-btn"
            onClick={() => openCreate('TEXT')}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            title="Write text status"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            id="create-photo-status-header-btn"
            onClick={() => openCreate('IMAGE')}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
            title="Add photo status"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            id="refresh-status-feed-btn"
            onClick={() => refreshStatuses()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh status feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Status Feed List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-slate-800/60 night:divide-neutral-900">
        {/* MY STATUS CARD */}
        <div className="p-3.5 hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
              onClick={() => {
                if (hasMyStatus) {
                  openViewer(user, myStatuses, 0);
                } else {
                  openCreate('TEXT');
                }
              }}
            >
              <div className="relative shrink-0">
                <StatusAvatarRing
                  user={user}
                  statuses={myStatuses}
                  size="md"
                  allViewed={false}
                />
                {!hasMyStatus && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-white night:text-white leading-tight truncate">
                  My Status
                </p>
                <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 leading-tight truncate mt-0.5">
                  {hasMyStatus
                    ? `${myStatuses.length} update${
                        myStatuses.length > 1 ? 's' : ''
                      } • ${totalMyViews} view${totalMyViews === 1 ? '' : 's'}`
                    : 'Tap to add status update'}
                </p>
              </div>
            </div>

            {/* Quick buttons to create text/photo & toggle manage updates */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                id="my-status-create-text-btn"
                onClick={() => openCreate('TEXT')}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 transition-colors"
                title="New text status"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                id="my-status-create-photo-btn"
                onClick={() => openCreate('IMAGE')}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 transition-colors"
                title="New photo status"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              {hasMyStatus && (
                <button
                  id="toggle-my-status-list-btn"
                  onClick={() => setShowMyStatusDetails(!showMyStatusDetails)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
                  title={showMyStatusDetails ? 'Hide status list' : 'Manage status updates'}
                >
                  {showMyStatusDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MY STATUS INDIVIDUAL UPDATES LIST (WITH DIRECT DELETE ACTION) */}
        {hasMyStatus && showMyStatusDetails && (
          <div
            id="my-status-updates-container"
            className="bg-neutral-50/60 dark:bg-slate-900/50 night:bg-neutral-950/70 border-y border-neutral-100 dark:border-slate-800/80 px-3.5 py-2.5"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                My Updates ({myStatuses.length})
              </span>
              {myStatuses.length > 1 && (
                <button
                  type="button"
                  id="delete-all-my-statuses-btn"
                  onClick={() => setConfirmDeleteAll(true)}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete all</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {myStatuses.map((st, idx) => {
                const viewerCount = st.viewers?.length || 0;
                return (
                  <div
                    key={st.id}
                    id={`my-status-item-${st.id}`}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800/60 night:bg-neutral-900 border border-neutral-200/70 dark:border-slate-700/50 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-colors"
                  >
                    {/* Preview Thumbnail & Text */}
                    <div
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      onClick={() => openViewer(user, myStatuses, idx)}
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold ring-1 ring-neutral-200 dark:ring-slate-700">
                        {st.type === 'IMAGE' && st.content ? (
                          <img
                            src={st.content}
                            alt="Status thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[10px] p-1 text-center font-medium leading-tight overflow-hidden"
                            style={{ backgroundColor: st.backgroundColor || '#0f766e' }}
                          >
                            {st.content?.slice(0, 16) || 'Status'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-800 dark:text-slate-200 truncate">
                          {st.type === 'IMAGE' ? (st.caption || 'Photo status') : st.content}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-slate-400 mt-0.5">
                          <span>{formatTimeAgo(st.createdAt)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <Eye className="w-3 h-3" />
                            {viewerCount} {viewerCount === 1 ? 'view' : 'views'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: View & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openViewer(user, myStatuses, idx)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
                        title="View this status"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        id={`delete-status-btn-${st.id}`}
                        onClick={() => setStatusToDelete(st)}
                        disabled={isDeletingId === st.id}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                        title="Delete this status"
                      >
                        {isDeletingId === st.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RECENT UPDATES (Unviewed) */}
        {recentUpdates.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Recent updates ({recentUpdates.length})
            </div>

            <div className="divide-y divide-neutral-50 dark:divide-slate-800/40">
              {recentUpdates.map((group) => {
                const latestStatus = group.statuses[group.statuses.length - 1];
                return (
                  <div
                    key={group.user.id}
                    onClick={() => openViewer(group.user, group.statuses, 0)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors"
                  >
                    <StatusAvatarRing
                      user={group.user}
                      statuses={group.statuses}
                      size="md"
                      allViewed={false}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white night:text-white truncate">
                          {group.user.name}
                        </p>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatTimeAgo(latestStatus.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 dark:text-slate-400 truncate mt-0.5">
                        {latestStatus.type === 'IMAGE' ? (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3 text-emerald-500" />
                            <span>{latestStatus.caption || 'Photo status'}</span>
                          </span>
                        ) : (
                          latestStatus.content
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEWED UPDATES (Viewed) */}
        {viewedUpdates.length > 0 && (
          <div className="py-2">
            <button
              onClick={() => setShowViewedUpdates(!showViewedUpdates)}
              className="w-full px-4 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200 transition-colors"
            >
              <span>Viewed updates ({viewedUpdates.length})</span>
              {showViewedUpdates ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showViewedUpdates && (
              <div className="divide-y divide-neutral-50 dark:divide-slate-800/40">
                {viewedUpdates.map((group) => {
                  const latestStatus = group.statuses[group.statuses.length - 1];
                  return (
                    <div
                      key={group.user.id}
                      onClick={() => openViewer(group.user, group.statuses, 0)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors opacity-85 hover:opacity-100"
                    >
                      <StatusAvatarRing
                        user={group.user}
                        statuses={group.statuses}
                        size="md"
                        allViewed={true}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-neutral-800 dark:text-slate-200 truncate">
                            {group.user.name}
                          </p>
                          <span className="text-[11px] text-neutral-400">
                            {formatTimeAgo(latestStatus.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {latestStatus.type === 'IMAGE' ? (
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              <span>{latestStatus.caption || 'Photo status'}</span>
                            </span>
                          ) : (
                            latestStatus.content
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE */}
        {recentUpdates.length === 0 && viewedUpdates.length === 0 && !hasMyStatus && (
          <div className="p-8 text-center text-neutral-400 dark:text-slate-500 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-slate-200">
                No status updates yet
              </p>
              <p className="text-xs text-neutral-400 max-w-[220px] mx-auto mt-1">
                Share photos or text updates with your contacts. They disappear after 24 hours.
              </p>
            </div>
            <button
              onClick={() => openCreate('TEXT')}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Status
            </button>
          </div>
        )}
      </div>

      {/* Bottom Privacy Notice */}
      <div className="p-3 border-t border-neutral-100 dark:border-slate-800/80 night:border-neutral-900 bg-neutral-50/50 dark:bg-slate-900/40 text-center shrink-0">
        <p className="text-[11px] text-neutral-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          <span>Status updates disappear automatically after 24 hours</span>
        </p>
      </div>

      {/* MODAL: SINGLE STATUS DELETE CONFIRMATION */}
      {statusToDelete && (
        <div
          id="delete-status-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeletingId) setStatusToDelete(null);
          }}
        >
          <div
            id="delete-status-modal"
            className="bg-white dark:bg-slate-900 night:bg-neutral-900 border border-neutral-200 dark:border-slate-800 night:border-neutral-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-neutral-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Delete Status Update?</h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 leading-relaxed">
                  This update will be deleted from MongoDB Atlas for you and everyone who can view your status.
                </p>
              </div>
            </div>

            {/* Preview of item being deleted */}
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-700/60 flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
                {statusToDelete.type === 'IMAGE' && statusToDelete.content ? (
                  <img src={statusToDelete.content} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: statusToDelete.backgroundColor || '#0f766e' }}
                  >
                    Text
                  </div>
                )}
              </div>
              <p className="truncate text-neutral-700 dark:text-slate-300 flex-1 font-medium">
                {statusToDelete.type === 'IMAGE' ? (statusToDelete.caption || 'Photo status') : statusToDelete.content}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="cancel-single-delete-btn"
                onClick={() => setStatusToDelete(null)}
                disabled={!!isDeletingId}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-single-delete-btn"
                onClick={handleConfirmSingleDelete}
                disabled={!!isDeletingId}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isDeletingId ? (
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

      {/* MODAL: DELETE ALL STATUSES CONFIRMATION */}
      {confirmDeleteAll && (
        <div
          id="delete-all-status-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeletingAll) setConfirmDeleteAll(false);
          }}
        >
          <div
            id="delete-all-status-modal"
            className="bg-white dark:bg-slate-900 night:bg-neutral-900 border border-neutral-200 dark:border-slate-800 night:border-neutral-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-neutral-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Delete all status updates?</h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete all {myStatuses.length} of your active status updates? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="cancel-delete-all-btn"
                onClick={() => setConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-all-btn"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting all...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
