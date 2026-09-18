import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordedVoiceResult {
  audioDataUrl: string;
  duration: number; // in seconds
  waveform: number[];
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Audio Context for real-time waveform visualization
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordedAmplitudesRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    recordedAmplitudesRef.current = [];
    setLiveWaveform([0.2, 0.3, 0.4, 0.2]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Select supported audio mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      // Audio analysis for real-time visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          let lastSampleTime = 0;
          const updateWaveform = (time: number) => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Compute average amplitude
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalized = Math.min(1, Math.max(0.15, Number((average / 128).toFixed(2))));

            // Sample every 120ms
            if (time - lastSampleTime > 120) {
              lastSampleTime = time;
              recordedAmplitudesRef.current.push(normalized);
              setLiveWaveform((prev) => {
                const next = [...prev, normalized];
                return next.slice(-24); // Keep last 24 bars visible in real-time
              });
            }

            animFrameRef.current = requestAnimationFrame(updateWaveform);
          };

          animFrameRef.current = requestAnimationFrame(updateWaveform);
        }
      } catch (audioErr) {
        console.warn('[VoiceRecorder] AudioContext visualization notice:', audioErr);
      }

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(150); // Slice chunks every 150ms
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 500);
    } catch (err: any) {
      console.error('[VoiceRecorder] Failed to start recording', err);
      let msg = 'Could not access microphone.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Microphone permission was denied. Please allow microphone access.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No microphone device found on your system.';
      }
      setRecordingError(msg);
      setIsRecording(false);
    }
  }, []);

  const stopAndGetResult = useCallback(async (): Promise<RecordedVoiceResult | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    const recorder = mediaRecorderRef.current;
    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

    // Clear live tracking
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });

        // Stop all media tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Compress recorded amplitudes into 28 representative waveform bars
        const rawAmplitudes = recordedAmplitudesRef.current;
        const targetBars = 28;
        const finalWaveform: number[] = [];

        if (rawAmplitudes.length > 0) {
          const step = rawAmplitudes.length / targetBars;
          for (let i = 0; i < targetBars; i++) {
            const index = Math.min(rawAmplitudes.length - 1, Math.floor(i * step));
            finalWaveform.push(rawAmplitudes[index] || 0.25);
          }
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64DataUrl = reader.result as string;
          setIsRecording(false);
          setRecordingDuration(0);
          setLiveWaveform([]);
          resolve({
            audioDataUrl: base64DataUrl,
            duration: finalDuration,
            waveform: finalWaveform.length > 0 ? finalWaveform : [],
          });
        };

        reader.onerror = () => {
          setIsRecording(false);
          setRecordingDuration(0);
          resolve(null);
        };

        reader.readAsDataURL(audioBlob);
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (e) {
        console.warn('[VoiceRecorder] Stop call notice:', e);
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setLiveWaveform([]);
    audioChunksRef.current = [];
    recordedAmplitudesRef.current = [];
  }, []);

  return {
    isRecording,
    recordingDuration,
    liveWaveform,
    recordingError,
    startRecording,
    stopAndGetResult,
    cancelRecording,
    clearError: () => setRecordingError(null),
  };
}
