import React from 'react';
import { MessageSquare, LogOut, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';

interface NavbarProps {
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile }) => {
  const { user, logout } = useAuth();
  const { isWsConnected } = useChat();

  return (
    <header
      id="main-navbar"
      className="bg-white dark:bg-slate-900 night:bg-black border-b border-neutral-200 dark:border-slate-800 night:border-neutral-800 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20 transition-colors"
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 id="app-heading-title" className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white night:text-white tracking-tight">
              SimpleChat
            </h1>
            <span
              id="ws-status-badge"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                isWsConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 night:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 night:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 night:border-emerald-800/40'
                  : 'bg-amber-50 dark:bg-amber-950/50 night:bg-amber-950/40 text-amber-700 dark:text-amber-400 night:text-amber-400 border border-amber-200 dark:border-amber-800/50 night:border-amber-800/40'
              }`}
              title={isWsConnected ? 'Connected to real-time server' : 'Connecting to real-time server...'}
            >
              {isWsConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden xs:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="hidden xs:inline">Connecting...</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {user && (
          <>
            <button
              id="nav-profile-btn"
              onClick={onOpenProfile}
              className="flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-slate-700/60 night:hover:border-neutral-800 transition-colors text-left"
              title="View & edit profile"
            >
              <div className="relative">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-slate-700 night:border-neutral-700"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${getAvatarColor(
                      user.name
                    )}`}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
                    user.online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-slate-600'
                  }`}
                />
              </div>
              <div className="hidden md:block text-xs">
                <p className="font-semibold text-neutral-800 dark:text-slate-200 night:text-neutral-200 leading-tight truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-neutral-500 dark:text-slate-400 night:text-neutral-400 leading-tight truncate max-w-[120px]">
                  @{user.username}
                </p>
              </div>
            </button>

            <button
              id="nav-logout-btn"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 night:hover:bg-rose-950/30 border border-neutral-200 dark:border-slate-700 night:border-neutral-800 hover:border-rose-200 dark:hover:border-rose-800/50 rounded-lg transition-colors shadow-2xs"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
