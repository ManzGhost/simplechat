import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { formatAudioDuration, VoiceMessageData } from '../utils/voiceUtils';

interface VoiceMessagePlayerProps {
  voiceData: VoiceMessageData;
  isSender: boolean;
  messageId: string;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  voiceData,
  isSender,
  messageId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceData.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  const waveform = voiceData.waveform || [];

  // Initialize or update audio element
  useEffect(() => {
    const audio = new Audio(voiceData.audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.max(1, Math.round(audio.duration)));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: any) => {
      console.warn('[VoicePlayer] Audio playback error', e);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [voiceData.audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('[VoicePlayer] Could not play audio:', err);
        setIsPlaying(false);
      });
    }
  }, [isPlaying, playbackRate]);

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const container = waveformContainerRef.current;
    const audio = audioRef.current;
    if (!container || !audio || duration <= 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const seekTime = ratio * duration;

    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;

  return (
    <div
      id={`voice-player-${messageId}`}
      className="flex items-center gap-2.5 sm:gap-3 py-1 min-w-[210px] sm:min-w-[240px] max-w-full select-none"
    >
      {/* Play/Pause Button */}
      <button
        id={`voice-play-toggle-${messageId}`}
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
          isSender
            ? 'bg-white text-emerald-700 hover:bg-neutral-100 dark:bg-white dark:text-emerald-700'
            : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber Section */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div
          ref={waveformContainerRef}
          onClick={handleSeek}
          className="h-7 flex items-center gap-[2.5px] sm:gap-[3px] cursor-pointer py-1 group/wave"
          title="Click to seek"
        >
          {waveform.map((val, idx) => {
            const barProgress = waveform.length > 1 ? idx / (waveform.length - 1) : 0;
            const isPlayed = barProgress <= progressRatio;
            const barHeight = Math.max(4, Math.round(val * 24));

            return (
              <div
                key={idx}
                style={{ height: `${barHeight}px` }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isSender
                    ? isPlayed
                      ? 'bg-white shadow-2xs scale-y-105'
                      : 'bg-white/40 hover:bg-white/60'
                    : isPlayed
                    ? 'bg-emerald-600 dark:bg-emerald-400 scale-y-105'
                    : 'bg-neutral-300 dark:bg-slate-600 night:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>

        {/* Time and Speed Indicator */}
        <div className="flex items-center justify-between text-[11px] leading-none font-mono">
          <span
            className={
              isSender
                ? 'text-white/90'
                : 'text-neutral-500 dark:text-slate-400 night:text-neutral-400'
            }
          >
            {formatAudioDuration(displayTime)}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-sans font-semibold transition-colors cursor-pointer ${
                isSender
                  ? 'bg-black/20 hover:bg-black/30 text-white'
                  : 'bg-neutral-200 dark:bg-slate-700 night:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-200 night:text-neutral-200'
              }`}
              title="Click to change playback speed"
            >
              {playbackRate}x
            </button>
            <Mic className={`w-3 h-3 ${isSender ? 'text-white/60' : 'text-neutral-400'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
