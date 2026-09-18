import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  MonitorUp,
  AlertCircle,
  X,
  RotateCw,
  SwitchCamera,
  FlipHorizontal,
  Camera,
  Layers,
  Columns,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { useCall } from '../hooks/useCall';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const ActiveCallOverlay: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    isMinimized,
    callDuration,
    callError,
    cameraFacing,
    cameraRotation,
    peerCameraRotation,
    isMirrored,
    availableCamerasCount,
    isDualCamera,
    dualLayout,
    dualMainFacing,
    secondaryStream,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleMinimize,
    switchCamera,
    rotateCamera,
    toggleMirror,
    toggleDualCamera,
    toggleDualLayout,
    swapDualCameras,
    clearError,
  } = useCall();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [manualRemoteRotation, setManualRemoteRotation] = useState<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2200);
  }, []);

  const handleSwitchCamera = useCallback(async () => {
    const targetFacing = cameraFacing === 'user' ? 'Back' : 'Front';
    await switchCamera();
    showToast(`Switched to ${targetFacing} Camera`);
  }, [cameraFacing, switchCamera, showToast]);

  const handleRotateCamera = useCallback(() => {
    const nextRotation = (cameraRotation + 90) % 360;
    rotateCamera();
    showToast(`Camera rotated to ${nextRotation}°`);
  }, [cameraRotation, rotateCamera, showToast]);

  const handleToggleDualCamera = useCallback(async () => {
    await toggleDualCamera();
    showToast(!isDualCamera ? 'Dual Camera (Front + Back) Activated' : 'Single Camera mode restored');
  }, [isDualCamera, toggleDualCamera, showToast]);

  const handleToggleDualLayout = useCallback(() => {
    toggleDualLayout();
    showToast(`Switched layout to ${dualLayout === 'pip' ? 'Split Screen' : 'Picture-in-Picture'}`);
  }, [dualLayout, toggleDualLayout, showToast]);

  const handleSwapDualCameras = useCallback(() => {
    swapDualCameras();
    showToast('Swapped Front and Back camera positions');
  }, [swapDualCameras, showToast]);

  // Callback ref for remote video to guarantee attachment when element mounts
  const setRemoteVideoElement = useCallback((element: HTMLVideoElement | null) => {
    remoteVideoRef.current = element;
    if (element && remoteStream) {
      if (element.srcObject !== remoteStream) {
        console.log('[WebRTC] Remote stream attached via ref callback');
        element.srcObject = remoteStream;
      }
      element.play().catch((err) => {
        console.warn('[WebRTC] Remote video playback notice:', err);
      });
    }
  }, [remoteStream]);

  // Callback ref for local video
  const setLocalVideoElement = useCallback((element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    if (element && localStream) {
      if (element.srcObject !== localStream) {
        element.srcObject = localStream;
      }
      element.play().catch(() => {});
    }
  }, [localStream]);

  // Attach local media stream whenever it changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, activeCall?.callType, isVideoEnabled, isScreenSharing, isMinimized]);

  // Attach remote media stream to remote video and audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        console.log('[WebRTC] Remote stream attached to remote video element');
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch((err) => {
        console.warn('[WebRTC] Remote video playback notice:', err);
      });
    }

    if (remoteAudioRef.current && remoteStream) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, activeCall?.callType, activeCall?.status, activeCall?.isPeerVideoEnabled, isMinimized]);

  // Cleanup srcObjects on unmount
  useEffect(() => {
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, []);

  if (!activeCall) return null;

  const { peerUser, callType, status, isPeerVideoEnabled, isPeerMuted } = activeCall;
  const isVideoCall = callType === 'video';
  const isConnected = status === 'connected';

  // Render Minimized Floating Widget (PiP)
  if (isMinimized) {
    return (
      <div
        id="minimized-call-widget"
        className="fixed bottom-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200"
      >
        <audio ref={remoteAudioRef} autoPlay />

        {/* Small Avatar with Status Ring */}
        <div className="relative shrink-0">
          {peerUser.profileImage ? (
            <img
              src={peerUser.profileImage}
              alt={peerUser.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-600"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(
                peerUser.name
              )}`}
            >
              {getInitials(peerUser.name)}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </div>

        {/* Name and Duration / Status */}
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold truncate max-w-[110px]">{peerUser.name}</p>
          <p className="text-[11px] text-slate-400 font-mono">
            {isConnected ? formatDuration(callDuration) : status === 'calling' ? 'Calling...' : 'Connecting...'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            id="minimized-mute-toggle"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isVideoCall && (
            <>
              <button
                id="minimized-dual-cam-btn"
                onClick={handleToggleDualCamera}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDualCamera
                    ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isDualCamera ? 'Disable Dual Camera' : 'Enable Dual Camera (Both Front & Back)'}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                id="minimized-switch-cam-btn"
                onClick={handleSwitchCamera}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                title={cameraFacing === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              <button
                id="minimized-rotate-cam-btn"
                onClick={handleRotateCamera}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                title={`Rotate Camera (${cameraRotation}°)`}
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            id="expand-call-btn"
            onClick={toggleMinimize}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Expand call view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            id="minimized-hangup-btn"
            onClick={endCall}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            title="End call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render Full Call Modal
  return (
    <div
      id="active-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Audio element ensures sound is routed properly */}
      <audio ref={remoteAudioRef} autoPlay />

      <div
        id="active-call-container"
        className="w-full max-w-4xl h-[92vh] max-h-[780px] bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col relative"
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            {/* Peer info */}
            <div className="relative shrink-0">
              {peerUser.profileImage ? (
                <img
                  src={peerUser.profileImage}
                  alt={peerUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow ${getAvatarColor(
                    peerUser.name
                  )}`}
                >
                  {getInitials(peerUser.name)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-snug truncate">{peerUser.name}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-mono">
                  {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  {isConnected
                    ? formatDuration(callDuration)
                    : status === 'calling'
                    ? 'Calling...'
                    : 'Connecting...'}
                </span>
                {isPeerMuted && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    Peer Muted
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Window & View Controls */}
          <div className="flex items-center gap-2">
            {isVideoCall && (isPeerVideoEnabled || activeCall.isPeerScreenSharing) && isConnected && (
              <button
                id="rotate-remote-video-btn"
                onClick={() => {
                  setManualRemoteRotation((prev) => (prev + 90) % 360);
                  showToast('Rotated peer video 90°');
                }}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs font-mono"
                title="Rotate incoming video feed"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">{manualRemoteRotation > 0 ? `${manualRemoteRotation}°` : 'Peer'}</span>
              </button>
            )}

            <button
              id="minimize-call-btn"
              onClick={toggleMinimize}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Minimize call"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Feedback Toast for Camera and Controls */}
        {toastMessage && (
          <div className="absolute top-18 inset-x-0 z-40 flex justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Error notification banner if any */}
        {callError && (
          <div className="absolute top-20 inset-x-4 z-40 mx-auto max-w-md bg-amber-500/90 text-slate-950 px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{callError}</span>
            </div>
            <button onClick={clearError} className="p-0.5 hover:bg-black/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Stage: Video / Voice Canvas */}
        <div className="flex-1 relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-900">
          {isVideoCall || isScreenSharing || activeCall.isPeerScreenSharing ? (
            <>
              {/* Remote Peer Screen Sharing Notification Banner */}
              {activeCall.isPeerScreenSharing && (
                <div
                  id="peer-screenshare-badge"
                  className="absolute top-18 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-blue-400/40"
                >
                  <MonitorUp className="w-4 h-4 animate-bounce text-blue-200" />
                  <span>{peerUser.name} is sharing screen</span>
                </div>
              )}

              {/* Dual Camera Mode Active Banner */}
              {isDualCamera && isVideoEnabled && !isScreenSharing && (
                <div
                  id="local-dual-camera-badge"
                  className="absolute top-18 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-600/90 to-emerald-600/90 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-cyan-400/40 animate-in fade-in"
                >
                  <Layers className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>Dual Cam: Front + Back ({dualLayout === 'pip' ? 'PiP Inset' : 'Split View'})</span>
                </div>
              )}

              {/* Peer Streaming Dual Camera Banner */}
              {activeCall.peerIsDualCamera && (
                <div
                  id="peer-dual-camera-badge"
                  className="absolute top-26 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-700/80 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-cyan-400/40 animate-in fade-in"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
                  <span>{peerUser.name} is streaming Dual Camera (Front + Back)</span>
                </div>
              )}

              {/* Local Screen Sharing Notification Banner */}
              {isScreenSharing && (
                <div
                  id="local-screenshare-badge"
                  className="absolute top-18 right-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-blue-300 text-xs font-medium shadow-xl border border-blue-500/40"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>You are sharing your screen</span>
                  <button
                    onClick={toggleScreenShare}
                    className="ml-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded-full transition-colors font-semibold cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Remote Video / Screen Stream */}
              <video
                id="remote-video-feed"
                ref={setRemoteVideoElement}
                autoPlay
                playsInline
                style={{
                  transform: `rotate(${((peerCameraRotation || 0) + manualRemoteRotation) % 360}deg)`,
                  transition: 'transform 0.3s ease',
                }}
                className={`w-full h-full object-contain bg-black ${
                  (isPeerVideoEnabled || activeCall.isPeerScreenSharing) && isConnected
                    ? 'block'
                    : 'hidden'
                }`}
              />

              {/* Fallback screen if remote video is off or connecting */}
              {(!((isPeerVideoEnabled || activeCall.isPeerScreenSharing) && isConnected)) && (
                <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
                  <div className="relative">
                    {isConnected ? (
                      <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 shadow-2xl">
                        {peerUser.profileImage ? (
                          <img
                            src={peerUser.profileImage}
                            alt={peerUser.name}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${getAvatarColor(
                              peerUser.name
                            )}`}
                          >
                            {getInitials(peerUser.name)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center border-2 border-emerald-500/40 shadow-2xl animate-pulse">
                          {peerUser.profileImage ? (
                            <img
                              src={peerUser.profileImage}
                              alt={peerUser.name}
                              className="w-24 h-24 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${getAvatarColor(
                                peerUser.name
                              )}`}
                            >
                              {getInitials(peerUser.name)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{peerUser.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {isConnected
                        ? activeCall.isPeerScreenSharing
                          ? 'Displaying screen broadcast...'
                          : 'Camera is currently turned off'
                        : status === 'calling'
                        ? 'Ringing...'
                        : 'Connecting video...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Local Video Stream (PiP Inset) with Rotate & Switch Camera Controls */}
              <div
                id="local-video-pip"
                className="group absolute bottom-24 right-4 sm:right-6 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 z-30 transition-all duration-200 hover:border-emerald-500/60"
              >
                {(isVideoEnabled || isScreenSharing) && localStream ? (
                  <video
                    ref={setLocalVideoElement}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: isScreenSharing
                        ? 'none'
                        : `rotate(${cameraRotation}deg) ${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'}`,
                      transition: 'transform 0.3s ease',
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                    <VideoOff className="w-5 h-5" />
                  </div>
                )}

                {/* PiP Overlay Quick Action Controls */}
                {isVideoEnabled && !isScreenSharing && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    {/* Dual Camera Mode Quick Toggle */}
                    <button
                      id="pip-dual-cam-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDualCamera();
                      }}
                      className={`p-1 rounded-md backdrop-blur-sm transition-transform active:scale-90 ${
                        isDualCamera ? 'bg-cyan-600 text-white ring-1 ring-cyan-300' : 'bg-black/60 hover:bg-black/90 text-slate-200'
                      }`}
                      title={isDualCamera ? 'Disable Dual Camera' : 'Activate Dual Camera (Front + Back)'}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Layout Swap if Dual Camera is Active */}
                    {isDualCamera && (
                      <>
                        <button
                          id="pip-dual-layout-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDualLayout();
                          }}
                          className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white backdrop-blur-sm transition-transform active:scale-90"
                          title={`Switch to ${dualLayout === 'pip' ? 'Split' : 'PiP'} Layout`}
                        >
                          <Columns className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id="pip-dual-swap-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwapDualCameras();
                          }}
                          className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white backdrop-blur-sm transition-transform active:scale-90"
                          title="Swap Front and Back Camera roles"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Rotate Camera Quick Button on PiP */}
                    <button
                      id="pip-rotate-camera-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateCamera();
                      }}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white backdrop-blur-sm transition-transform active:scale-90"
                      title={`Rotate Camera (${cameraRotation}°)`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Switch Camera (Front / Back) Quick Button on PiP */}
                    {!isDualCamera && (
                      <button
                        id="pip-switch-camera-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchCamera();
                        }}
                        className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-slate-200 hover:text-white backdrop-blur-sm transition-transform active:scale-90"
                        title={cameraFacing === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Toggle Mirror on PiP */}
                    <button
                      id="pip-toggle-mirror-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMirror();
                        showToast(!isMirrored ? 'Mirror enabled' : 'Mirror disabled');
                      }}
                      className={`p-1 rounded-md backdrop-blur-sm transition-colors ${
                        isMirrored ? 'bg-emerald-600/80 text-white' : 'bg-black/60 hover:bg-black/90 text-slate-200'
                      }`}
                      title={isMirrored ? 'Disable video mirror' : 'Enable video mirror'}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* PiP Bottom Label & Status Badges */}
                <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between text-[10px] font-medium pointer-events-none">
                  <span className="bg-black/75 px-1.5 py-0.5 rounded text-white flex items-center gap-1 shadow">
                    {isScreenSharing ? (
                      <>
                        <MonitorUp className="w-3 h-3 text-blue-400" />
                        <span>Screen</span>
                      </>
                    ) : isDualCamera ? (
                      <span className="text-cyan-300 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" />
                        Dual: {dualLayout.toUpperCase()} ({dualMainFacing === 'user' ? 'Front' : 'Back'})
                        {isMuted && ' • Muted'}
                      </span>
                    ) : (
                      <span>
                        {cameraFacing === 'user' ? 'Front' : 'Back'}
                        {cameraRotation > 0 && ` • ${cameraRotation}°`}
                        {isMuted && ' • Muted'}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Voice Call Centerpiece */
            <div className="flex flex-col items-center justify-center gap-6 text-center p-6 select-none">
              <div className="relative">
                {isConnected && (
                  <>
                    <div className="absolute -inset-4 rounded-full bg-emerald-500/15 animate-ping duration-1000 pointer-events-none" />
                    <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse duration-700 pointer-events-none" />
                  </>
                )}
                {peerUser.profileImage ? (
                  <img
                    src={peerUser.profileImage}
                    alt={peerUser.name}
                    className="relative w-36 h-36 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
                  />
                ) : (
                  <div
                    className={`relative w-36 h-36 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-slate-800 shadow-2xl ${getAvatarColor(
                      peerUser.name
                    )}`}
                  >
                    {getInitials(peerUser.name)}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-2xl font-bold text-white mb-1.5">{peerUser.name}</h4>
                <p className="text-sm text-slate-400">
                  {isConnected
                    ? `Voice Call • ${formatDuration(callDuration)}`
                    : status === 'calling'
                    ? 'Calling...'
                    : 'Connecting...'}
                </p>
              </div>

              {/* Sound waves visual indicator */}
              {isConnected && (
                <div className="flex items-center gap-1.5 h-6">
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-3" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-5" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.9s_ease-in-out_infinite] h-6" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.7s_ease-in-out_infinite] h-4" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center">
          <div className="flex items-center gap-2 sm:gap-3.5 bg-slate-900/90 backdrop-blur-md px-4 sm:px-5 py-3 rounded-full border border-slate-800 shadow-2xl">
            {/* Microphone Mute / Unmute */}
            <button
              id="call-toggle-mic-btn"
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Camera Toggle */}
            <button
              id="call-toggle-video-btn"
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all cursor-pointer ${
                !isVideoEnabled
                  ? 'bg-rose-600/30 text-rose-400 hover:bg-rose-600/40'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
            >
              {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </button>

            {/* Camera Switch (Back & Front) Button */}
            {(isVideoCall || isVideoEnabled) && !isScreenSharing && (
              <button
                id="call-switch-camera-btn"
                onClick={handleSwitchCamera}
                className={`p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-95 relative ${
                  cameraFacing === 'environment'
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/40 ring-2 ring-cyan-400'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
                title={cameraFacing === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
                aria-label="Switch between Front and Back Camera"
              >
                <SwitchCamera className="w-5 h-5 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full bg-slate-950 border border-slate-700 text-cyan-300">
                  {cameraFacing === 'user' ? 'Front' : 'Back'}
                </span>
              </button>
            )}

            {/* Dual Camera (Front + Back Together) Toggle Button */}
            {(isVideoCall || isVideoEnabled) && !isScreenSharing && (
              <button
                id="call-dual-camera-btn"
                onClick={handleToggleDualCamera}
                className={`p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-95 relative ${
                  isDualCamera
                    ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-cyan-500/40 ring-2 ring-cyan-400'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
                title={
                  isDualCamera
                    ? 'Dual Camera Active: Streaming both front and back cameras. Click to switch to single camera.'
                    : 'Activate Dual Camera (Use both front and back cameras simultaneously in video call)'
                }
                aria-label="Toggle Dual Camera"
                aria-pressed={isDualCamera}
              >
                <Layers className="w-5 h-5 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-950 border border-slate-700 text-cyan-300">
                  {isDualCamera ? 'Dual ON' : 'Dual'}
                </span>
              </button>
            )}

            {/* Dual Camera Layout Toggle (PiP vs Split) */}
            {isDualCamera && (isVideoCall || isVideoEnabled) && !isScreenSharing && (
              <button
                id="call-dual-layout-btn"
                onClick={handleToggleDualLayout}
                className="p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-95 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-cyan-500/40 relative"
                title={`Dual Layout: Currently ${dualLayout === 'pip' ? 'Picture-in-Picture' : 'Split-Screen'}. Click to switch.`}
                aria-label="Toggle Dual Camera Layout"
              >
                <Columns className="w-5 h-5 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full bg-slate-950 border border-slate-700 text-emerald-300 font-mono">
                  {dualLayout === 'pip' ? 'PiP' : 'Split'}
                </span>
              </button>
            )}

            {/* Swap Front / Back Position in Dual Camera */}
            {isDualCamera && (isVideoCall || isVideoEnabled) && !isScreenSharing && (
              <button
                id="call-dual-swap-btn"
                onClick={handleSwapDualCameras}
                className="p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-95 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60 relative"
                title={`Swap Cameras (Current Main: ${dualMainFacing === 'user' ? 'Front' : 'Back'})`}
                aria-label="Swap Front and Back Cameras"
              >
                <ArrowLeftRight className="w-5 h-5 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full bg-slate-950 border border-slate-700 text-cyan-300">
                  {dualMainFacing === 'user' ? 'F⇄B' : 'B⇄F'}
                </span>
              </button>
            )}

            {/* Camera Rotate (90° Increments) Button */}
            {(isVideoCall || isVideoEnabled) && !isScreenSharing && (
              <button
                id="call-rotate-camera-btn"
                onClick={handleRotateCamera}
                className="p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md active:scale-95 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60 relative"
                title={`Rotate Camera 90° (Currently: ${cameraRotation}°)`}
                aria-label="Rotate Camera 90 degrees"
              >
                <RotateCw
                  className="w-5 h-5 transition-transform duration-300"
                  style={{ transform: `rotate(${cameraRotation}deg)` }}
                />
                <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full bg-slate-950 border border-slate-700 text-emerald-300 font-mono">
                  {cameraRotation}°
                </span>
              </button>
            )}

            {/* Screen Share Button */}
            <button
              id="call-toggle-screenshare-btn"
              onClick={toggleScreenShare}
              className={`p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-95 ${
                isScreenSharing
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/40 ring-2 ring-blue-400 animate-pulse'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              aria-pressed={isScreenSharing}
            >
              <MonitorUp className={`w-5 h-5 transition-transform duration-200 ${isScreenSharing ? 'scale-110' : ''}`} />
            </button>

            {/* End Call Button */}
            <button
              id="call-hangup-btn"
              onClick={endCall}
              className="px-4 sm:px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 font-medium transition-transform transform active:scale-95 shadow-lg shadow-rose-600/30 cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
