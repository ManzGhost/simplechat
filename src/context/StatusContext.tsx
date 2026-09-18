import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStatus, UserStatusGroup, CreateStatusPayload, WsMessagePayload } from '../types';
import { statusService } from '../services/statusService';
import { websocketService } from '../services/websocketService';
import { useAuth } from '../hooks/useAuth';

interface ActiveViewerState {
  user: User;
  statuses: UserStatus[];
  initialIndex: number;
}

interface StatusContextType {
  myStatuses: UserStatus[];
  recentUpdates: UserStatusGroup[];
  viewedUpdates: UserStatusGroup[];
  allContactStatuses: UserStatusGroup[];
  isLoading: boolean;
  error: string | null;
  hasUnviewed: boolean;
  refreshStatuses: () => Promise<void>;
  createStatus: (payload: CreateStatusPayload) => Promise<UserStatus>;
  markViewed: (statusId: string) => Promise<void>;
  deleteStatus: (statusId: string) => Promise<void>;
  deleteAllMyStatuses: () => Promise<void>;
  activeViewer: ActiveViewerState | null;
  openViewer: (user: User, statuses: UserStatus[], initialIndex?: number) => void;
  closeViewer: () => void;
  isCreateOpen: boolean;
  createType: 'TEXT' | 'IMAGE';
  openCreate: (type?: 'TEXT' | 'IMAGE') => void;
  closeCreate: () => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export const StatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [myStatuses, setMyStatuses] = useState<UserStatus[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<UserStatusGroup[]>([]);
  const [viewedUpdates, setViewedUpdates] = useState<UserStatusGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story Viewer Modal state
  const [activeViewer, setActiveViewer] = useState<ActiveViewerState | null>(null);

  // Create Status Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'TEXT' | 'IMAGE'>('TEXT');

  const fetchStatuses = useCallback(async () => {
    if (!user) {
      setMyStatuses([]);
      setRecentUpdates([]);
      setViewedUpdates([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const feed = await statusService.getStatusFeed();
      setMyStatuses(feed.myStatuses || []);
      setRecentUpdates(feed.recentUpdates || []);
      setViewedUpdates(feed.viewedUpdates || []);
    } catch (err: any) {
      console.error('[Status] Failed to fetch statuses:', err);
      setError('Unable to load status updates');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchStatuses();
    } else {
      setMyStatuses([]);
      setRecentUpdates([]);
      setViewedUpdates([]);
    }
  }, [user, fetchStatuses]);

  // Real-time updates subscription via WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = websocketService.onStatusFeedEvent((payload: WsMessagePayload) => {
      if (payload.type === 'STATUS_CREATED' || payload.type === 'STATUS_DELETED') {
        // Refresh statuses to rebuild groups accurately
        fetchStatuses();
      } else if (payload.type === 'STATUS_VIEWED' && payload.statusId && payload.viewer) {
        // If someone viewed my status, update my status viewer list locally
        setMyStatuses((prev) =>
          prev.map((s) => {
            if (s.id === payload.statusId) {
              const viewers = s.viewers || [];
              if (!viewers.some((v) => v.userId === payload.viewer?.id)) {
                return {
                  ...s,
                  viewers: [
                    ...viewers,
                    {
                      userId: payload.viewer.id,
                      viewedAt: payload.viewedAt || new Date().toISOString(),
                      user: payload.viewer,
                    },
                  ],
                };
              }
            }
            return s;
          })
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, fetchStatuses]);

  const createStatus = async (payload: CreateStatusPayload): Promise<UserStatus> => {
    const res = await statusService.createStatus(payload);
    await fetchStatuses();
    return res.status;
  };

  const markViewed = async (statusId: string) => {
    try {
      await statusService.markStatusViewed(statusId);
      // Mark viewed locally in recentUpdates
      setRecentUpdates((prevRecent) => {
        let needsRebalance = false;
        const updatedRecent = prevRecent
          .map((group) => {
            const updatedStatuses = group.statuses.map((st) =>
              st.id === statusId ? { ...st, hasViewed: true } : st
            );
            const allViewed = updatedStatuses.every((st) => st.hasViewed);
            if (allViewed) needsRebalance = true;
            return {
              ...group,
              statuses: updatedStatuses,
              allViewed,
            };
          });

        if (needsRebalance) {
          // Re-sort and separate into recent and viewed
          setTimeout(() => {
            fetchStatuses();
          }, 300);
        }
        return updatedRecent;
      });
    } catch (err) {
      console.error('[Status] Failed to mark viewed:', err);
    }
  };

  const deleteStatus = async (statusId: string) => {
    await statusService.deleteStatus(statusId);
    setMyStatuses((prev) => prev.filter((s) => s.id !== statusId));
    if (activeViewer) {
      const remaining = activeViewer.statuses.filter((s) => s.id !== statusId);
      if (remaining.length === 0) {
        setActiveViewer(null);
      } else {
        setActiveViewer({
          ...activeViewer,
          statuses: remaining,
          initialIndex: Math.min(activeViewer.initialIndex, remaining.length - 1),
        });
      }
    }
    fetchStatuses().catch(() => {});
  };

  const deleteAllMyStatuses = async () => {
    await statusService.deleteAllStatuses();
    setMyStatuses([]);
    if (activeViewer && activeViewer.user.id === user?.id) {
      setActiveViewer(null);
    }
    fetchStatuses().catch(() => {});
  };

  const openViewer = (targetUser: User, statuses: UserStatus[], initialIndex: number = 0) => {
    if (!statuses || statuses.length === 0) return;
    setActiveViewer({
      user: targetUser,
      statuses,
      initialIndex: Math.max(0, Math.min(initialIndex, statuses.length - 1)),
    });
  };

  const closeViewer = () => {
    setActiveViewer(null);
  };

  const openCreate = (type: 'TEXT' | 'IMAGE' = 'TEXT') => {
    setCreateType(type);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
  };

  const allContactStatuses = [...recentUpdates, ...viewedUpdates];
  const hasUnviewed = recentUpdates.length > 0;

  return (
    <StatusContext.Provider
      value={{
        myStatuses,
        recentUpdates,
        viewedUpdates,
        allContactStatuses,
        isLoading,
        error,
        hasUnviewed,
        refreshStatuses: fetchStatuses,
        createStatus,
        markViewed,
        deleteStatus,
        deleteAllMyStatuses,
        activeViewer,
        openViewer,
        closeViewer,
        isCreateOpen,
        createType,
        openCreate,
        closeCreate,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
};

export const useStatus = (): StatusContextType => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};
