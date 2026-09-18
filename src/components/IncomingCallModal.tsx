import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../hooks/useCall';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  useEffect(() => {
    if (!incomingCall) return;

    // Trigger subtle vibration pattern on supported mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([250, 150, 250, 150, 250]);
      } catch {
        // ignore
      }
    }

    // Keyboard support: Enter accepts, Escape rejects
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        acceptCall();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        rejectCall('declined');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [incomingCall, acceptCall, rejectCall]);

  if (!incomingCall) return null;

  const { caller, callType } = incomingCall;
  const callerName = caller?.name || 'Incoming Caller';
  const callerUsername = caller?.username || 'user';
  const isVideo = callType === 'video';

  return (
    <div
      id="incoming-call-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-caller-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="incoming-call-card"
        className="w-full max-w-sm bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Call Type Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-300 mb-6 shadow-xs">
          {isVideo ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Incoming {isVideo ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping duration-1000" />
          <div className="absolute -inset-3 rounded-full bg-emerald-500/15 animate-pulse duration-700" />

          {caller?.profileImage ? (
            <img
              src={caller.profileImage}
              alt={callerName}
              className="relative w-24 h-24 rounded-full object-cover border-2 border-emerald-500/60 shadow-xl"
            />
          ) : (
            <div
              className={`relative w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-emerald-500/60 shadow-xl ${getAvatarColor(
                callerName
              )}`}
            >
              {getInitials(callerName)}
            </div>
          )}
        </div>

        {/* Caller Info */}
        <h3 id="incoming-caller-name" className="text-xl font-bold text-white mb-1">
          {callerName}
        </h3>
        <p className="text-sm text-slate-400 mb-8">@{callerUsername} is calling you...</p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Decline Button */}
          <button
            id="decline-call-btn"
            type="button"
            onClick={() => rejectCall('declined')}
            className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
            title="Decline call (Esc)"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-all transform group-hover:scale-105 active:scale-95 focus:ring-4 focus:ring-rose-500/40">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-rose-400 transition-colors">
              Decline (Esc)
            </span>
          </button>

          {/* Accept Button */}
          <button
            id="accept-call-btn"
            type="button"
            onClick={() => acceptCall()}
            className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
            title="Accept call (Enter)"
            autoFocus
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce transition-all transform group-hover:scale-105 active:scale-95 focus:ring-4 focus:ring-emerald-500/40">
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
              Accept (Enter)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
