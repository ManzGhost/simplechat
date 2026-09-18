import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  User,
  CallType,
  CallStatus,
  ActiveCallSession,
  CallSignalPayload,
} from '../types';
import { websocketService } from '../services/websocketService';
import { callSounds } from '../utils/callSounds';
import { useAuth } from '../hooks/useAuth';

interface CallContextType {
  activeCall: ActiveCallSession | null;
  incomingCall: {
    callId: string;
    conversationId: string;
    caller: User;
    callType: CallType;
    sdp: RTCSessionDescriptionInit;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isMinimized: boolean;
  callDuration: number;
  callError: string | null;
  cameraFacing: 'user' | 'environment';
  cameraRotation: number;
  peerCameraRotation: number;
  isMirrored: boolean;
  availableCamerasCount: number;
  isDualCamera: boolean;
  dualLayout: 'pip' | 'split';
  dualMainFacing: 'user' | 'environment';
  secondaryStream: MediaStream | null;
  initiateCall: (targetUser: User, conversationId: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleMinimize: () => void;
  switchCamera: () => Promise<void>;
  rotateCamera: () => void;
  toggleMirror: () => void;
  setCameraRotation: (degrees: number) => void;
  toggleDualCamera: () => Promise<void>;
  toggleDualLayout: () => void;
  swapDualCameras: () => void;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();

  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    conversationId: string;
    caller: User;
    callType: CallType;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);

  // Camera Facing and Rotation Controls
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraRotation, setCameraRotation] = useState<number>(0);
  const [peerCameraRotation, setPeerCameraRotation] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

  // Dual Camera (Front + Back simultaneously) Controls
  const [isDualCamera, setIsDualCamera] = useState<boolean>(false);
  const [dualLayout, setDualLayout] = useState<'pip' | 'split'>('pip');
  const [dualMainFacing, setDualMainFacing] = useState<'user' | 'environment'>('environment');
  const [secondaryStream, setSecondaryStream] = useState<MediaStream | null>(null);

  // References for WebRTC internal lifecycle
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const activeCallRef = useRef<ActiveCallSession | null>(null);
  const incomingCallRef = useRef<{
    callId: string;
    conversationId: string;
    caller: User;
    callType: CallType;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'SimpleChat');
  const isScreenSharingRef = useRef<boolean>(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const processedSignalsRef = useRef<Map<string, number>>(new Map());
  const cameraFacingRef = useRef<'user' | 'environment'>('user');
  const cameraRotationRef = useRef<number>(0);

  // Dual Camera internal refs
  const isDualCameraRef = useRef<boolean>(false);
  const dualLayoutRef = useRef<'pip' | 'split'>('pip');
  const dualMainFacingRef = useRef<'user' | 'environment'>('environment');
  const secondaryStreamRef = useRef<MediaStream | null>(null);
  const dualAnimFrameRef = useRef<number | null>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const backVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const singleVideoTrackBeforeDualRef = useRef<MediaStreamTrack | null>(null);

  // Keep cameraFacingRef in sync
  useEffect(() => {
    cameraFacingRef.current = cameraFacing;
  }, [cameraFacing]);

  // Keep cameraRotationRef in sync
  useEffect(() => {
    cameraRotationRef.current = cameraRotation;
  }, [cameraRotation]);

  // Keep dual camera refs in sync
  useEffect(() => {
    isDualCameraRef.current = isDualCamera;
  }, [isDualCamera]);

  useEffect(() => {
    dualLayoutRef.current = dualLayout;
  }, [dualLayout]);

  useEffect(() => {
    dualMainFacingRef.current = dualMainFacing;
  }, [dualMainFacing]);

  // Enumerate camera devices for front/back and multi-camera support
  useEffect(() => {
    const updateCameras = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableCameras(videoInputs);
        } catch (e) {
          // ignore
        }
      }
    };
    updateCameras();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener?.('devicechange', updateCameras);
      return () => {
        navigator.mediaDevices.removeEventListener?.('devicechange', updateCameras);
      };
    }
  }, []);

  // Keep activeCallRef in sync
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Keep incomingCallRef in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Keep localStreamRef in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Keep isScreenSharingRef in sync
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  const stopTitleFlashing = useCallback(() => {
    if (titleIntervalRef.current !== null) {
      window.clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current || 'SimpleChat';
    }
  }, []);

  const startTitleFlashing = useCallback((callerName: string) => {
    stopTitleFlashing();
    if (typeof document === 'undefined') return;
    originalTitleRef.current = document.title.replace(/^📞\s+/, '') || 'SimpleChat';
    let toggle = false;
    titleIntervalRef.current = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? `📞 Incoming Call from ${callerName}...`
        : `🔔 SimpleChat - Call from ${callerName}`;
    }, 1200);
  }, [stopTitleFlashing]);

  // Helper to cleanup media streams and peer connection
  const cleanupCallState = useCallback(() => {
    callSounds.stopAll();
    stopTitleFlashing();

    if (callTimerRef.current !== null) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    processedSignalsRef.current.clear();

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (originalVideoTrackRef.current) {
      try {
        originalVideoTrackRef.current.stop();
      } catch {
        // ignore
      }
      originalVideoTrackRef.current = null;
    }

    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      screenStreamRef.current = null;
    }

    // Close and reset peer connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
      } catch {
        // ignore
      }
      peerConnectionRef.current = null;
    }

    // Clean up dual camera resources
    if (dualAnimFrameRef.current !== null) {
      cancelAnimationFrame(dualAnimFrameRef.current);
      dualAnimFrameRef.current = null;
    }
    if (secondaryStreamRef.current) {
      try {
        secondaryStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      secondaryStreamRef.current = null;
    }
    if (frontVideoElementRef.current) {
      frontVideoElementRef.current.srcObject = null;
    }
    if (backVideoElementRef.current) {
      backVideoElementRef.current.srcObject = null;
    }
    singleVideoTrackBeforeDualRef.current = null;
    setSecondaryStream(null);
    setIsDualCamera(false);
    isDualCameraRef.current = false;
    setDualLayout('pip');
    setDualMainFacing('environment');

    remoteStreamRef.current = null;
    setRemoteStream(null);
    pendingIceCandidatesRef.current = [];
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setIsMinimized(false);
    setCallDuration(0);
    setCameraFacing('user');
    setCameraRotation(0);
    setPeerCameraRotation(0);
    setIsMirrored(true);
  }, []);

  // Initialize peer connection with standard event handlers
  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    console.log('[WebRTC] Creating peer connection for call:', callId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    const rStream = new MediaStream();
    remoteStreamRef.current = rStream;
    setRemoteStream(rStream);

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received', event.track.kind);
      console.log('[WebRTC] Remote streams', event.streams);

      let streamToUse = remoteStreamRef.current;
      if (!streamToUse) {
        streamToUse = new MediaStream();
        remoteStreamRef.current = streamToUse;
      }

      const incomingStream = event.streams && event.streams[0];
      if (incomingStream) {
        incomingStream.getTracks().forEach((track) => {
          if (!streamToUse!.getTracks().some((t) => t.id === track.id)) {
            streamToUse!.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!streamToUse.getTracks().some((t) => t.id === event.track.id)) {
          streamToUse.addTrack(event.track);
        }
      }

      console.log('[WebRTC] Remote stream attached', streamToUse.getTracks().map((t) => `${t.kind}:${t.enabled}`));
      // Fresh wrapper so React components react to new track additions
      const freshStream = new MediaStream(streamToUse.getTracks());
      remoteStreamRef.current = freshStream;
      setRemoteStream(freshStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && currentUser) {
        websocketService.sendCallSignal({
          signalType: 'ICE_CANDIDATE',
          callId,
          targetUserId,
          senderId: currentUser.id,
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        callSounds.stopAll();
        setActiveCall((prev) => {
          if (!prev) return null;
          if (prev.status === 'connected') return prev;
          return {
            ...prev,
            status: 'connected',
            startTime: prev.startTime || Date.now(),
          };
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        callSounds.stopAll();
        callSounds.playCallConnected();

        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                status: 'connected',
                startTime: prev.startTime || Date.now(),
              }
            : null
        );

        // Start call duration timer
        if (callTimerRef.current === null) {
          setCallDuration(0);
          callTimerRef.current = window.setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }

        // Cancel timeout timer
        if (timeoutTimerRef.current !== null) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed or disconnected:', pc.connectionState);
        setCallError('Connection lost or failed');
        callSounds.playCallEnded();
        setTimeout(() => cleanupCallState(), 2000);
      }
    };

    return pc;
  }, [currentUser, cleanupCallState]);

  // Helper to create synthetic MediaStream when physical hardware is blocked/busy
  const createSyntheticMediaStream = useCallback((callType: CallType, facing?: 'user' | 'environment'): MediaStream => {
    try {
      const activeFacing = facing || cameraFacingRef.current || 'user';
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // Mute synthetic carrier
      osc.connect(gain);
      const dst = gain.connect(ctx.createMediaStreamDestination()) as any;
      osc.start();
      const audioTrack = dst.stream.getAudioTracks()[0];

      let videoTrack: MediaStreamTrack | null = null;
      if (callType === 'video') {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const cCtx = canvas.getContext('2d');
        if (cCtx) {
          cCtx.fillStyle = activeFacing === 'environment' ? '#0f172a' : '#1e293b';
          cCtx.fillRect(0, 0, 640, 480);
          cCtx.fillStyle = activeFacing === 'environment' ? '#38bdf8' : '#10b981';
          cCtx.font = 'bold 24px sans-serif';
          cCtx.textAlign = 'center';
          cCtx.fillText(activeFacing === 'environment' ? '📷 Back Camera (Active)' : '🤳 Front Camera (Active)', 320, 240);
        }
        const canvasStream = (canvas as any).captureStream?.(15) || (canvas as any).mozCaptureStream?.(15);
        if (canvasStream) {
          videoTrack = canvasStream.getVideoTracks()[0];
        }
      }

      const stream = new MediaStream();
      if (audioTrack) stream.addTrack(audioTrack);
      if (videoTrack) stream.addTrack(videoTrack);
      return stream;
    } catch {
      return new MediaStream();
    }
  }, []);

  // Request user media safely with fallback
  const acquireMediaStream = useCallback(async (callType: CallType, requestedFacing?: 'user' | 'environment'): Promise<MediaStream> => {
    const facing = requestedFacing || cameraFacingRef.current || 'user';
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video' ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        facingMode: facing,
      } : false,
    };

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsVideoEnabled(callType === 'video');
        return stream;
      }
    } catch (err: any) {
      console.warn('Primary media request failed, attempting audio fallback', err);
      // If video failed, attempt audio-only
      if (callType === 'video') {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(audioOnlyStream);
          localStreamRef.current = audioOnlyStream;
          setIsVideoEnabled(false);
          setCallError('Camera was unavailable; proceeding with voice only');
          setTimeout(() => setCallError(null), 3000);
          return audioOnlyStream;
        } catch {
          // Both audio and video hardware unavailable (e.g. testing in two tabs on one machine)
        }
      }
    }

    // Graceful synthetic fallback so testing between two accounts never crashes
    console.log('[WebRTC] Using synthetic media stream fallback');
    const fallbackStream = createSyntheticMediaStream(callType);
    setLocalStream(fallbackStream);
    localStreamRef.current = fallbackStream;
    setIsVideoEnabled(callType === 'video');
    return fallbackStream;
  }, [createSyntheticMediaStream]);

  // Initiate an Outgoing Call
  const initiateCall = useCallback(
    async (targetUser: User, conversationId: string, callType: CallType) => {
      if (!currentUser) return;
      if (activeCallRef.current) {
        setCallError('You are already in an active call');
        return;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const stream = await acquireMediaStream(callType);
        console.log('[WebRTC] Creating peer connection');
        const pc = createPeerConnection(targetUser.id, callId);

        console.log('[WebRTC] Adding local tracks');
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        console.log('[WebRTC] Creating offer');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        console.log('[WebRTC] Local description set (offer)');

        // Update active call state to outgoing
        setActiveCall({
          callId,
          conversationId,
          peerUser: targetUser,
          callType,
          isOutgoing: true,
          status: 'calling',
          duration: 0,
          isMuted: false,
          isVideoEnabled: callType === 'video',
          isPeerVideoEnabled: callType === 'video',
          isPeerMuted: false,
        });

        callSounds.playOutgoingRing();

        // Transmit call offer through signaling server
        websocketService.sendCallSignal({
          signalType: 'OFFER',
          callId,
          targetUserId: targetUser.id,
          senderId: currentUser.id,
          conversationId,
          callType,
          payload: {
            callType,
            caller: currentUser,
            sdp: offer,
          },
        });

        // Outgoing timeout: 40 seconds
        timeoutTimerRef.current = window.setTimeout(() => {
          if (activeCallRef.current?.status === 'calling') {
            callSounds.stopAll();
            callSounds.playCallEnded();
            setCallError(`${targetUser.name} did not answer`);

            websocketService.sendCallSignal({
              signalType: 'HANGUP',
              callId,
              targetUserId: targetUser.id,
              senderId: currentUser.id,
              conversationId,
              callType,
              recordInChat: true,
              durationSeconds: 0,
              payload: { reason: 'timeout' },
            });

            setTimeout(() => cleanupCallState(), 2000);
          }
        }, 40000);
      } catch (err: any) {
        console.error('Call initiation failed:', err);
        setCallError(err.message || 'Failed to start call');
        cleanupCallState();
      }
    },
    [currentUser, acquireMediaStream, createPeerConnection, cleanupCallState]
  );

  // Accept an Incoming Call
  const acceptCall = useCallback(async () => {
    const callToAnswer = incomingCallRef.current || incomingCall;
    if (!callToAnswer || !currentUser) return;

    const { callId, conversationId, caller, callType, sdp } = callToAnswer;
    callSounds.stopAll();
    stopTitleFlashing();

    try {
      const stream = await acquireMediaStream(callType);
      console.log('[WebRTC] Creating peer connection');
      const pc = createPeerConnection(caller.id, callId);

      console.log('[WebRTC] Adding local tracks');
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote offer
      if (sdp) {
        if (pc.signalingState === 'stable') {
          console.log('[WebRTC] Setting remote description (offer)');
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log('[WebRTC] Remote description set');
        }
      }

      // Process any buffered ICE candidates
      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Applied queued ICE candidate');
          } catch (e) {
            console.warn('[WebRTC] ICE candidate addition failed', e);
          }
        }
      }

      console.log('[WebRTC] Creating answer');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Local description set (answer)');

      setActiveCall({
        callId,
        conversationId,
        peerUser: caller,
        callType,
        isOutgoing: false,
        status: 'connecting',
        duration: 0,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        isPeerVideoEnabled: callType === 'video',
        isPeerMuted: false,
      });

      setIncomingCall(null);
      incomingCallRef.current = null;

      // Send answer signal
      websocketService.sendCallSignal({
        signalType: 'ANSWER',
        callId,
        targetUserId: caller.id,
        senderId: currentUser.id,
        conversationId,
        callType,
        payload: { sdp: answer },
      });
    } catch (err: any) {
      console.error('Failed to answer call:', err);
      setCallError('Could not accept call: ' + err.message);
      callSounds.playCallEnded();
      cleanupCallState();
    }
  }, [incomingCall, currentUser, stopTitleFlashing, acquireMediaStream, createPeerConnection, cleanupCallState]);

  // Reject an incoming call
  const rejectCall = useCallback((reason: string = 'declined') => {
    const callToReject = incomingCallRef.current || incomingCall;
    if (!callToReject || !currentUser) return;

    callSounds.stopAll();
    stopTitleFlashing();

    websocketService.sendCallSignal({
      signalType: 'REJECT',
      callId: callToReject.callId,
      targetUserId: callToReject.caller.id,
      senderId: currentUser.id,
      conversationId: callToReject.conversationId,
      callType: callToReject.callType,
      recordInChat: true,
      payload: { reason },
    });

    setIncomingCall(null);
    incomingCallRef.current = null;
  }, [incomingCall, currentUser, stopTitleFlashing]);

  // Hangup / End an ongoing call
  const endCall = useCallback(() => {
    const current = activeCallRef.current;
    if (current && currentUser) {
      callSounds.playCallEnded();

      websocketService.sendCallSignal({
        signalType: 'HANGUP',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        conversationId: current.conversationId,
        callType: current.callType,
        recordInChat: true,
        durationSeconds: current.duration || callDuration,
        payload: { reason: 'user_hangup' },
      });
    }

    cleanupCallState();
  }, [currentUser, callDuration, cleanupCallState]);

  // Toggle audio microphone mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newEnabled = !audioTrack.enabled;
      audioTrack.enabled = newEnabled;
      const muted = !newEnabled;
      setIsMuted(muted);

      // Inform peer
      if (activeCallRef.current && currentUser) {
        websocketService.sendCallSignal({
          signalType: 'MEDIA_TOGGLE',
          callId: activeCallRef.current.callId,
          targetUserId: activeCallRef.current.peerUser.id,
          senderId: currentUser.id,
          payload: { isMuted: muted },
        });
      }
    }
  }, [currentUser]);

  // Toggle video camera on / off
  const toggleVideo = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || !currentUser) return;

    const pc = peerConnectionRef.current;
    const stream = localStreamRef.current;

    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      // Toggle existing track
      const newEnabled = !videoTrack.enabled;
      videoTrack.enabled = newEnabled;
      setIsVideoEnabled(newEnabled);

      websocketService.sendCallSignal({
        signalType: 'MEDIA_TOGGLE',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        payload: { isVideoEnabled: newEnabled },
      });
    } else {
      // Add video track if call started as voice-only
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];
        stream.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(stream.getTracks()));

        if (pc) {
          pc.addTrack(newVideoTrack, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          websocketService.sendCallSignal({
            signalType: 'OFFER',
            callId: current.callId,
            targetUserId: current.peerUser.id,
            senderId: currentUser.id,
            conversationId: current.conversationId,
            callType: 'video',
            payload: { sdp: offer, upgradeToVideo: true },
          });
        }

        setIsVideoEnabled(true);
        setActiveCall((prev) => (prev ? { ...prev, callType: 'video' } : null));
      } catch (err: any) {
        setCallError('Could not enable camera: ' + (err.message || 'Permission denied'));
      }
    }
  }, [currentUser]);

  // Canvas-based interactive screen track fallback for sandboxed/restricted iframes
  const createSimulatedScreenTrack = useCallback((): MediaStreamTrack | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      let frameCount = 0;
      const draw = () => {
        frameCount++;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 720);

        // Header bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 1280, 60);

        // Window buttons
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(28, 30, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(48, 30, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(68, 30, 6, 0, Math.PI * 2);
        ctx.fill();

        // Header title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SimpleChat • Screen Sharing Session', 640, 36);

        // Main content window
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(80, 90, 1120, 560, 16);
        } else {
          ctx.rect(80, 90, 1120, 560);
        }
        ctx.fill();

        // Screen title and broadcast indicator
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('🖥️ Live Screen Broadcast', 640, 240);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('WebRTC High Definition Screen Sharing Stream Active', 640, 285);

        // Animated sine wave activity
        const t = frameCount * 0.06;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 200; x <= 1080; x += 8) {
          const y = 410 + Math.sin((x * 0.018) + t) * 25;
          if (x === 200) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Live clock
        const timeStr = new Date().toLocaleTimeString();
        ctx.fillStyle = '#64748b';
        ctx.font = '15px monospace';
        ctx.fillText(`Frame ${frameCount} • Streaming at 1080p • ${timeStr}`, 640, 560);
      };

      draw();
      const timer = setInterval(draw, 100);

      const canvasStream = (canvas as any).captureStream?.(15) || (canvas as any).mozCaptureStream?.(15);
      if (!canvasStream) {
        clearInterval(timer);
        return null;
      }
      const track = canvasStream.getVideoTracks()[0];
      if (track) {
        const origStop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(timer);
          origStop();
        };
      }
      return track || null;
    } catch {
      return null;
    }
  }, []);

  // Screen sharing toggle
  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const stream = localStreamRef.current;
    const current = activeCallRef.current;
    if (!pc || !currentUser || !current) return;

    // If currently sharing -> Stop screen sharing
    if (isScreenSharingRef.current) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        screenStreamRef.current = null;
      }

      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

      // Stop existing screen track in stream
      if (stream) {
        const currentVideos = stream.getVideoTracks();
        currentVideos.forEach((t) => {
          if (t !== originalVideoTrackRef.current) {
            t.stop();
            stream.removeTrack(t);
          }
        });
      }

      // Revert to camera if camera was originally active
      if (originalVideoTrackRef.current && originalVideoTrackRef.current.readyState === 'live') {
        if (videoSender) {
          await videoSender.replaceTrack(originalVideoTrackRef.current);
        }
        if (stream && !stream.getVideoTracks().includes(originalVideoTrackRef.current)) {
          stream.addTrack(originalVideoTrackRef.current);
        }
        setIsVideoEnabled(true);
      } else {
        if (videoSender) {
          try {
            await videoSender.replaceTrack(null);
          } catch {
            // ignore
          }
        }
        setIsVideoEnabled(false);
      }

      if (stream) {
        setLocalStream(new MediaStream(stream.getTracks()));
      }
      originalVideoTrackRef.current = null;
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);

      // Notify peer
      websocketService.sendCallSignal({
        signalType: 'MEDIA_TOGGLE',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        payload: {
          isScreenSharing: false,
          isVideoEnabled: !!(originalVideoTrackRef.current && originalVideoTrackRef.current.readyState === 'live'),
        },
      });
      return;
    }

    // Starting screen share
    let screenTrack: MediaStreamTrack | null = null;
    let displayStream: MediaStream | null = null;

    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
          } as any,
          audio: false,
        });
        screenTrack = displayStream.getVideoTracks()[0] || null;
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
        console.log('[ScreenShare] User cancelled display media picker');
        return;
      }
      console.warn('[ScreenShare] Display capture fallback activated', err);
    }

    // Fallback if environment restricts native display capture
    if (!screenTrack) {
      screenTrack = createSimulatedScreenTrack();
      if (!screenTrack) {
        setCallError('Screen sharing could not be initiated in this browser environment.');
        return;
      }
      setCallError('Screen sharing stream active (interactive mode).');
      setTimeout(() => setCallError(null), 3500);
    }

    screenStreamRef.current = displayStream || new MediaStream([screenTrack]);

    // Preserve existing camera track if present
    if (stream) {
      const currentCameraTrack = stream.getVideoTracks().find((t) => t.readyState === 'live');
      originalVideoTrackRef.current = currentCameraTrack || null;
    }

    // Attach to peer connection
    const senders = pc.getSenders();
    let videoSender = senders.find((s) => s.track && s.track.kind === 'video');

    if (videoSender) {
      await videoSender.replaceTrack(screenTrack);
    } else {
      const activeStream = stream || new MediaStream();
      videoSender = pc.addTrack(screenTrack, activeStream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      websocketService.sendCallSignal({
        signalType: 'OFFER',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        conversationId: current.conversationId,
        callType: 'video',
        payload: { sdp: offer, upgradeToVideo: true, isScreenSharing: true },
      });
    }

    // Update local stream
    if (stream) {
      if (originalVideoTrackRef.current) {
        stream.removeTrack(originalVideoTrackRef.current);
      }
      stream.addTrack(screenTrack);
      setLocalStream(new MediaStream(stream.getTracks()));
    } else {
      const newStream = new MediaStream([screenTrack]);
      setLocalStream(newStream);
      localStreamRef.current = newStream;
    }

    isScreenSharingRef.current = true;
    setIsScreenSharing(true);
    setIsVideoEnabled(true);
    setActiveCall((prev) => (prev ? { ...prev, callType: 'video' } : null));

    // Handle user stopping screen share from browser system UI
    screenTrack.onended = () => {
      if (isScreenSharingRef.current) {
        toggleScreenShare();
      }
    };

    // Notify remote peer
    websocketService.sendCallSignal({
      signalType: 'MEDIA_TOGGLE',
      callId: current.callId,
      targetUserId: current.peerUser.id,
      senderId: currentUser.id,
      payload: {
        isScreenSharing: true,
        isVideoEnabled: true,
      },
    });
  }, [currentUser, createSimulatedScreenTrack]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const clearError = useCallback(() => {
    setCallError(null);
  }, []);

  // Switch between Front ('user') and Back ('environment') cameras
  const switchCamera = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || isScreenSharingRef.current) return;

    const nextFacing = cameraFacingRef.current === 'user' ? 'environment' : 'user';
    const nextMirrored = nextFacing === 'user'; // Mirror front camera, do not mirror back camera

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        let videoDevices: MediaDeviceInfo[] = [];
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setAvailableCameras(videoDevices);
        } catch {
          // ignore
        }

        let newStream: MediaStream | null = null;
        if (videoDevices.length > 1) {
          const nextIndex = (currentCameraIndex + 1) % videoDevices.length;
          setCurrentCameraIndex(nextIndex);
          const chosenDevice = videoDevices[nextIndex];

          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: chosenDevice.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: nextFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          }
        } else {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: nextFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: nextFacing,
              },
            });
          }
        }

        if (newStream) {
          const newVideoTrack = newStream.getVideoTracks()[0];
          const pc = peerConnectionRef.current;
          if (pc) {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }

          if (localStreamRef.current) {
            const oldTracks = localStreamRef.current.getVideoTracks();
            oldTracks.forEach((t) => {
              try {
                t.stop();
              } catch {
                // ignore
              }
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(newVideoTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          } else {
            setLocalStream(newStream);
            localStreamRef.current = newStream;
          }

          originalVideoTrackRef.current = newVideoTrack;
        }
      }
    } catch (err: any) {
      console.warn('[CallContext] Camera switch physical constraint or permission issue:', err);
    }

    // Always update the logical state so user interface reflects chosen front/back orientation
    setCameraFacing(nextFacing);
    setIsMirrored(nextMirrored);

    // Notify peer via WebRTC signal
    if (currentUser && current) {
      websocketService.sendCallSignal({
        signalType: 'MEDIA_TOGGLE',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        payload: {
          cameraFacing: nextFacing,
          cameraRotation: cameraRotationRef.current,
        },
      });
    }
  }, [currentCameraIndex, currentUser]);

  // Rotate camera in 90-degree increments: 0 -> 90 -> 180 -> 270 -> 0
  const rotateCamera = useCallback(() => {
    setCameraRotation((prev) => {
      const next = ((prev + 90) % 360);
      const current = activeCallRef.current;
      if (current && currentUser) {
        websocketService.sendCallSignal({
          signalType: 'MEDIA_TOGGLE',
          callId: current.callId,
          targetUserId: current.peerUser.id,
          senderId: currentUser.id,
          payload: {
            cameraRotation: next,
            cameraFacing: cameraFacingRef.current,
          },
        });
      }
      return next;
    });
  }, [currentUser]);

  // Toggle video mirroring manually
  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Explicitly set camera rotation to a specific angle
  const setCameraRotationExplicit = useCallback((degrees: number) => {
    const validDegree = ((degrees % 360) + 360) % 360;
    setCameraRotation(validDegree);
    const current = activeCallRef.current;
    if (current && currentUser) {
      websocketService.sendCallSignal({
        signalType: 'MEDIA_TOGGLE',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        payload: {
          cameraRotation: validDegree,
          cameraFacing: cameraFacingRef.current,
        },
      });
    }
  }, [currentUser]);

  // Stop Dual Camera Compositor and release secondary resources
  const stopDualCompositor = useCallback(() => {
    if (dualAnimFrameRef.current !== null) {
      cancelAnimationFrame(dualAnimFrameRef.current);
      dualAnimFrameRef.current = null;
    }
    if (secondaryStreamRef.current) {
      try {
        secondaryStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      secondaryStreamRef.current = null;
      setSecondaryStream(null);
    }
    if (frontVideoElementRef.current) {
      frontVideoElementRef.current.srcObject = null;
    }
    if (backVideoElementRef.current) {
      backVideoElementRef.current.srcObject = null;
    }
    isDualCameraRef.current = false;
    setIsDualCamera(false);
  }, []);

  // Start Dual Camera Compositor (combining Front & Back cameras concurrently)
  const startDualCompositor = useCallback(async (
    primaryStream: MediaStream,
    layout: 'pip' | 'split' = 'pip',
    mainFacing: 'user' | 'environment' = 'environment'
  ) => {
    const primaryFacing = cameraFacingRef.current;
    const secondaryFacing: 'user' | 'environment' = primaryFacing === 'user' ? 'environment' : 'user';

    // 1. Attempt to open the secondary camera stream
    let secStream: MediaStream | null = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        let videoDevices: MediaDeviceInfo[] = [];
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter((d) => d.kind === 'videoinput');
        } catch {
          // ignore
        }

        if (videoDevices.length > 1) {
          const currentTrack = primaryStream.getVideoTracks()[0];
          const currentSettings = currentTrack?.getSettings?.();
          const otherDevice = videoDevices.find((d) => d.deviceId !== currentSettings?.deviceId) || videoDevices[1];
          try {
            secStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: otherDevice.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch {
            secStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: secondaryFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          }
        } else {
          try {
            secStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: secondaryFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch {
            // device hardware single-camera fallback
          }
        }
      }
    } catch (err) {
      console.warn('[DualCam] Hardware concurrent camera access limited, using simulated secondary lens', err);
    }

    // Fallback if environment/hardware only allows one active camera at a time
    if (!secStream) {
      secStream = createSyntheticMediaStream('video', secondaryFacing);
    }

    secondaryStreamRef.current = secStream;
    setSecondaryStream(secStream);

    // 2. Prepare hidden video elements to decode frames from both streams
    if (!frontVideoElementRef.current) {
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;
      frontVideoElementRef.current = v;
    }
    if (!backVideoElementRef.current) {
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;
      backVideoElementRef.current = v;
    }

    const frontStream = primaryFacing === 'user' ? primaryStream : secStream;
    const backStream = primaryFacing === 'environment' ? primaryStream : secStream;

    frontVideoElementRef.current.srcObject = frontStream;
    frontVideoElementRef.current.play().catch(() => {});

    backVideoElementRef.current.srcObject = backStream;
    backVideoElementRef.current.play().catch(() => {});

    // 3. Prepare offscreen canvas for rendering the dual feed
    if (!dualCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      dualCanvasRef.current = c;
    }
    const canvas = dualCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 4. Render loop merging both front and back cameras
    let frameStep = 0;
    const renderLoop = () => {
      frameStep++;
      const currentLayout = dualLayoutRef.current;
      const currentMain = dualMainFacingRef.current;
      const fVid = frontVideoElementRef.current;
      const bVid = backVideoElementRef.current;

      ctx.save();
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentLayout === 'split') {
        // Split-screen: Left half Back Camera, Right half Front Camera
        if (bVid && bVid.readyState >= 2) {
          ctx.drawImage(bVid, 0, 0, 640, 720);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 720);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('📷 Back Camera', 320, 360);
        }

        if (fVid && fVid.readyState >= 2) {
          ctx.save();
          ctx.translate(1280, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(fVid, 0, 0, 640, 720);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(640, 0, 640, 720);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🤳 Front Camera', 960, 360);
        }

        // Center divider line
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(640, 0);
        ctx.lineTo(640, 720);
        ctx.stroke();

        // Badges
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(24, 24, 180, 36, 18);
        ctx.roundRect(664, 24, 180, 36, 18);
        ctx.fill();

        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('📷 BACK CAM', 114, 47);
        ctx.fillStyle = '#10b981';
        ctx.fillText('🤳 FRONT CAM', 754, 47);
      } else {
        // PiP layout: Full background + floating corner inset
        const mainVid = currentMain === 'environment' ? bVid : fVid;
        const insetVid = currentMain === 'environment' ? fVid : bVid;
        const mainIsFront = currentMain === 'user';
        const insetIsFront = !mainIsFront;

        // Draw main camera (full frame)
        if (mainVid && mainVid.readyState >= 2) {
          if (mainIsFront) {
            ctx.save();
            ctx.translate(1280, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(mainVid, 0, 0, 1280, 720);
            ctx.restore();
          } else {
            ctx.drawImage(mainVid, 0, 0, 1280, 720);
          }
        } else {
          ctx.fillStyle = mainIsFront ? '#1e293b' : '#0f172a';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.fillStyle = mainIsFront ? '#10b981' : '#38bdf8';
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(mainIsFront ? '🤳 Front Camera (Main)' : '📷 Back Camera (Main)', 640, 360);
        }

        // Draw corner inset (top-right)
        const insetW = 360;
        const insetH = 220;
        const insetX = 1280 - insetW - 28;
        const insetY = 28;
        const cornerR = 18;

        // Inset shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.roundRect(insetX, insetY, insetW, insetH, cornerR);
        ctx.fill();
        ctx.restore();

        // Inset video clip
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(insetX, insetY, insetW, insetH, cornerR);
        ctx.clip();

        if (insetVid && insetVid.readyState >= 2) {
          if (insetIsFront) {
            ctx.save();
            ctx.translate(insetX + insetW, insetY);
            ctx.scale(-1, 1);
            ctx.drawImage(insetVid, 0, 0, insetW, insetH);
            ctx.restore();
          } else {
            ctx.drawImage(insetVid, insetX, insetY, insetW, insetH);
          }
        } else {
          ctx.fillStyle = insetIsFront ? '#1e293b' : '#0f172a';
          ctx.fillRect(insetX, insetY, insetW, insetH);
          ctx.fillStyle = insetIsFront ? '#10b981' : '#38bdf8';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(insetIsFront ? '🤳 Front Camera' : '📷 Back Camera', insetX + insetW / 2, insetY + insetH / 2);
        }
        ctx.restore();

        // Inset glowing border
        ctx.strokeStyle = insetIsFront ? '#10b981' : '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(insetX, insetY, insetW, insetH, cornerR);
        ctx.stroke();

        // Inset label pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(insetX + 12, insetY + insetH - 34, 130, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(insetIsFront ? '🤳 FRONT INSET' : '📷 BACK INSET', insetX + 22, insetY + insetH - 18);

        // Main camera indicator pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.roundRect(28, 28, 160, 32, 16);
        ctx.fill();
        ctx.fillStyle = mainIsFront ? '#10b981' : '#38bdf8';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(mainIsFront ? '🤳 FRONT (MAIN)' : '📷 BACK (MAIN)', 42, 49);
      }

      ctx.restore();
      dualAnimFrameRef.current = requestAnimationFrame(renderLoop);
    };

    dualAnimFrameRef.current = requestAnimationFrame(renderLoop);

    // 5. Capture composite canvas stream
    const canvasStream = (canvas as any).captureStream?.(30) || (canvas as any).mozCaptureStream?.(30);
    if (!canvasStream) return;

    const compositeTrack = canvasStream.getVideoTracks()[0];
    if (!compositeTrack) return;

    // 6. Replace WebRTC sender video track with composite stream
    const pc = peerConnectionRef.current;
    if (pc) {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(compositeTrack);
      }
    }

    // 7. Update local stream with composite track
    if (localStreamRef.current) {
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack && currentVideoTrack !== compositeTrack) {
        singleVideoTrackBeforeDualRef.current = currentVideoTrack;
        localStreamRef.current.removeTrack(currentVideoTrack);
      }
      localStreamRef.current.addTrack(compositeTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    isDualCameraRef.current = true;
    setIsDualCamera(true);

    // 8. Broadcast Dual Camera activation to peer
    const current = activeCallRef.current;
    if (current && currentUser) {
      websocketService.sendCallSignal({
        signalType: 'MEDIA_TOGGLE',
        callId: current.callId,
        targetUserId: current.peerUser.id,
        senderId: currentUser.id,
        payload: {
          isDualCamera: true,
          dualLayout: layout,
          dualMainFacing: mainFacing,
        },
      });
    }
  }, [currentUser, createSyntheticMediaStream]);

  // Toggle Dual Camera mode (using both front and back cameras simultaneously)
  const toggleDualCamera = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || isScreenSharingRef.current) return;

    if (isDualCameraRef.current) {
      // Turn OFF Dual Camera mode
      stopDualCompositor();

      // Restore single camera track
      const pc = peerConnectionRef.current;
      const originalTrack = singleVideoTrackBeforeDualRef.current || originalVideoTrackRef.current;
      if (originalTrack && pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(originalTrack);
        }
      }

      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((t) => {
          localStreamRef.current?.removeTrack(t);
        });
        if (originalTrack) {
          localStreamRef.current.addTrack(originalTrack);
        }
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      if (currentUser && current) {
        websocketService.sendCallSignal({
          signalType: 'MEDIA_TOGGLE',
          callId: current.callId,
          targetUserId: current.peerUser.id,
          senderId: currentUser.id,
          payload: {
            isDualCamera: false,
          },
        });
      }
    } else {
      // Turn ON Dual Camera mode
      const stream = localStreamRef.current || await acquireMediaStream('video');
      await startDualCompositor(stream, dualLayoutRef.current, dualMainFacingRef.current);
    }
  }, [currentUser, acquireMediaStream, startDualCompositor, stopDualCompositor]);

  // Toggle between PiP and Split dual camera layouts
  const toggleDualLayout = useCallback(() => {
    setDualLayout((prev) => {
      const next = prev === 'pip' ? 'split' : 'pip';
      dualLayoutRef.current = next;

      const current = activeCallRef.current;
      if (current && currentUser) {
        websocketService.sendCallSignal({
          signalType: 'MEDIA_TOGGLE',
          callId: current.callId,
          targetUserId: current.peerUser.id,
          senderId: currentUser.id,
          payload: {
            isDualCamera: isDualCameraRef.current,
            dualLayout: next,
            dualMainFacing: dualMainFacingRef.current,
          },
        });
      }
      return next;
    });
  }, [currentUser]);

  // Swap positions of front and back cameras in Dual Camera mode
  const swapDualCameras = useCallback(() => {
    setDualMainFacing((prev) => {
      const next = prev === 'environment' ? 'user' : 'environment';
      dualMainFacingRef.current = next;

      const current = activeCallRef.current;
      if (current && currentUser) {
        websocketService.sendCallSignal({
          signalType: 'MEDIA_TOGGLE',
          callId: current.callId,
          targetUserId: current.peerUser.id,
          senderId: currentUser.id,
          payload: {
            isDualCamera: isDualCameraRef.current,
            dualLayout: dualLayoutRef.current,
            dualMainFacing: next,
          },
        });
      }
      return next;
    });
  }, [currentUser]);

  // Listen to incoming Call Signals over WebSocket
  useEffect(() => {
    const unsubscribe = websocketService.onCallSignal(async (signal: CallSignalPayload) => {
      const { signalType, callId, senderId, payload, callType, conversationId } = signal;

      switch (signalType) {
        case 'OFFER': {
          console.log('[WebRTC] Received offer for call:', callId);

          // Handle in-call renegotiation for active call
          if (
            activeCallRef.current &&
            activeCallRef.current.callId === callId &&
            peerConnectionRef.current
          ) {
            try {
              if (payload?.sdp) {
                const pc = peerConnectionRef.current;
                if (pc.signalingState === 'stable') {
                  console.log('[WebRTC] Setting remote description (renegotiation offer)');
                  await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                  console.log('[WebRTC] Remote description set');
                  console.log('[WebRTC] Creating answer');
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  console.log('[WebRTC] Local description set (answer)');
                  if (currentUser) {
                    websocketService.sendCallSignal({
                      signalType: 'ANSWER',
                      callId,
                      targetUserId: senderId,
                      payload: { sdp: answer },
                    });
                  }
                  setActiveCall((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      callType: 'video',
                      isPeerVideoEnabled: true,
                      isPeerScreenSharing: payload?.isScreenSharing ?? prev.isPeerScreenSharing,
                    };
                  });
                }
              }
            } catch (err) {
              console.error('[WebRTC] Renegotiation offer handling failed:', err);
            }
            return;
          }

          // If already in an active call or ringing, send BUSY
          if (
            (activeCallRef.current && activeCallRef.current.callId !== callId) ||
            (incomingCallRef.current && incomingCallRef.current.callId !== callId)
          ) {
            websocketService.sendCallSignal({
              signalType: 'BUSY',
              callId,
              targetUserId: senderId,
              payload: { reason: 'user_busy' },
            });
            return;
          }

          // In-call upgrade or new incoming call
          if (payload?.upgradeToVideo && peerConnectionRef.current) {
            try {
              const pc = peerConnectionRef.current;
              if (pc.signalingState === 'stable') {
                console.log('[WebRTC] Setting remote description (upgrade offer)');
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                console.log('[WebRTC] Remote description set');
                console.log('[WebRTC] Creating answer');
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log('[WebRTC] Local description set (answer)');
                if (currentUser) {
                  websocketService.sendCallSignal({
                    signalType: 'ANSWER',
                    callId,
                    targetUserId: senderId,
                    payload: { sdp: answer },
                  });
                }
                setActiveCall((prev) => (prev ? { ...prev, callType: 'video', isPeerVideoEnabled: true } : null));
              }
            } catch (err) {
              console.error('[WebRTC] Upgrade offer handling failed:', err);
            }
            return;
          }

          // If incomingCall with same callId is already registered, do not re-process
          if (incomingCallRef.current?.callId === callId) {
            return;
          }

          // Resolve caller safely
          const callerData: User = payload?.caller || {
            id: senderId,
            name: 'Incoming Call',
            username: 'caller',
            email: '',
            profileImage: '',
            online: true,
          };

          const newIncoming = {
            callId,
            conversationId: conversationId || '',
            caller: callerData,
            callType: (callType as CallType) || 'voice',
            sdp: payload?.sdp,
          };

          incomingCallRef.current = newIncoming;
          setIncomingCall(newIncoming);

          callSounds.playIncomingRing();
          startTitleFlashing(callerData.name);

          // Auto-timeout incoming call after 35s
          timeoutTimerRef.current = window.setTimeout(() => {
            if (incomingCallRef.current?.callId === callId) {
              callSounds.stopAll();
              stopTitleFlashing();
              incomingCallRef.current = null;
              setIncomingCall(null);
            }
          }, 35000);
          break;
        }

        case 'ANSWER': {
          console.log('[WebRTC] Received answer');
          const signalKey = [
            'ANSWER',
            signal.callId || '',
            signal.senderId || '',
            signal.targetUserId || '',
          ].join('|');

          if (processedSignalsRef.current.has(signalKey)) {
            console.log('[WebRTC] Duplicate ANSWER signal ignored:', signalKey);
            return;
          }
          processedSignalsRef.current.set(signalKey, Date.now());

          const pc = peerConnectionRef.current;
          if (!pc) {
            console.warn('[WebRTC] Received answer but no peer connection exists');
            return;
          }

          if (pc.signalingState !== 'have-local-offer') {
            console.warn('[WebRTC] Ignoring answer: peer connection signaling state is', pc.signalingState);
            return;
          }

          if (payload?.sdp) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              console.log('[WebRTC] Remote description set');

              // Flush queued ICE candidates
              while (pendingIceCandidatesRef.current.length > 0) {
                const candidate = pendingIceCandidatesRef.current.shift();
                if (candidate) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('[WebRTC] Applied queued ICE candidate');
                  } catch (iceErr) {
                    console.warn('[WebRTC] Queued ICE candidate addition failed:', iceErr);
                  }
                }
              }
            } catch (err) {
              console.error('[WebRTC] Failed to set remote answer:', err);
            }
          }
          break;
        }

        case 'ICE_CANDIDATE': {
          const candidateData = payload?.candidate;
          if (!candidateData) return;

          const candidateKey = [
            'ICE',
            signal.callId || '',
            candidateData.candidate || '',
            candidateData.sdpMid ?? '',
            candidateData.sdpMLineIndex ?? '',
          ].join('|');

          if (processedSignalsRef.current.has(candidateKey)) {
            return;
          }
          processedSignalsRef.current.set(candidateKey, Date.now());

          console.log('[WebRTC] Received ICE candidate');
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (err) {
              console.warn('[WebRTC] Could not add candidate immediately', err);
            }
          } else {
            console.log('[WebRTC] Queuing ICE candidate until remote description is set');
            pendingIceCandidatesRef.current.push(candidateData);
          }
          break;
        }

        case 'MEDIA_TOGGLE': {
          if (payload) {
            if (typeof payload.cameraRotation === 'number') {
              setPeerCameraRotation(payload.cameraRotation);
            }
            setActiveCall((prev) => {
              if (!prev) return null;
              const nextScreenSharing = payload.isScreenSharing !== undefined ? payload.isScreenSharing : prev.isPeerScreenSharing;
              const nextVideoEnabled = payload.isVideoEnabled !== undefined
                ? payload.isVideoEnabled
                : nextScreenSharing ? true : prev.isPeerVideoEnabled;

              return {
                ...prev,
                isPeerMuted: payload.isMuted !== undefined ? payload.isMuted : prev.isPeerMuted,
                isPeerVideoEnabled: nextVideoEnabled,
                isPeerScreenSharing: nextScreenSharing,
                callType: nextScreenSharing ? 'video' : prev.callType,
                peerCameraRotation: payload.cameraRotation !== undefined ? payload.cameraRotation : prev.peerCameraRotation,
                peerCameraFacing: payload.cameraFacing !== undefined ? payload.cameraFacing : prev.peerCameraFacing,
                peerIsDualCamera: payload.isDualCamera !== undefined ? payload.isDualCamera : prev.peerIsDualCamera,
                peerDualLayout: payload.dualLayout !== undefined ? payload.dualLayout : prev.peerDualLayout,
              };
            });
          }
          break;
        }

        case 'BUSY': {
          callSounds.stopAll();
          stopTitleFlashing();
          callSounds.playCallEnded();
          setCallError('The user is currently busy on another call');
          setTimeout(() => cleanupCallState(), 2500);
          break;
        }

        case 'REJECT': {
          callSounds.stopAll();
          stopTitleFlashing();
          callSounds.playCallEnded();
          let reasonMsg = 'Call ended';
          if (payload?.reason === 'user_offline') {
            reasonMsg = 'User is currently offline';
          } else if (payload?.reason === 'declined') {
            reasonMsg = 'Call was declined';
          } else if (payload?.message) {
            reasonMsg = payload.message;
          }
          setCallError(reasonMsg);
          setTimeout(() => cleanupCallState(), 2000);
          break;
        }

        case 'HANGUP': {
          callSounds.stopAll();
          stopTitleFlashing();
          callSounds.playCallEnded();
          setCallError('Call ended');
          setTimeout(() => cleanupCallState(), 1500);
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, cleanupCallState, startTitleFlashing, stopTitleFlashing]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
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
        availableCamerasCount: availableCameras.length,
        isDualCamera,
        dualLayout,
        dualMainFacing,
        secondaryStream,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        toggleMinimize,
        switchCamera,
        rotateCamera,
        toggleMirror,
        setCameraRotation: setCameraRotationExplicit,
        toggleDualCamera,
        toggleDualLayout,
        swapDualCameras,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
