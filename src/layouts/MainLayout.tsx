import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useStatus } from '../hooks/useStatus';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { ActiveCallOverlay } from '../components/ActiveCallOverlay';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { CreateStatusModal } from '../components/CreateStatusModal';
import { User, UserStatus } from '../types';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { sendStoryReply } = useChat();
  const { activeViewer, closeViewer, isCreateOpen, closeCreate, createType } = useStatus();

  if (isLoading) {
    return (
      <div id="layout-loading" className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" label="Initializing SimpleChat..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleStoryReply = (targetUser: User, status: UserStatus, messageText: string) => {
    sendStoryReply(targetUser, status, messageText);
  };

  return (
    <>
      <Outlet />
      <IncomingCallModal />
      <ActiveCallOverlay />

      {/* Global Story Viewer Modal */}
      {activeViewer && (
        <StoryViewerModal
          user={activeViewer.user}
          statuses={activeViewer.statuses}
          initialIndex={activeViewer.initialIndex}
          onClose={closeViewer}
          onReply={handleStoryReply}
        />
      )}

      {/* Global Create Status Modal */}
      <CreateStatusModal
        isOpen={isCreateOpen}
        onClose={closeCreate}
        initialType={createType}
      />
    </>
  );
};
