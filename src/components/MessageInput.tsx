import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Reply, X, Mic, Trash2, AlertCircle } from 'lucide-react';
import { Message, MessageType } from '../types';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { StickerItem, encodeSticker } from '../data/stickers';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { encodeVoiceMessage, formatAudioDuration } from '../utils/voiceUtils';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: MessageType) => Promise<void>;
  onSendSticker?: (sticker: StickerItem) => Promise<void>;
  isSending: boolean;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  replyTargetName?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendSticker,
  isSending,
  disabled = false,
  replyingTo,
  onCancelReply,
  replyTargetName,
}) => {
  const [content, setContent] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerInitialTab, setPickerInitialTab] = useState<'emoji' | 'sticker'>('emoji');
  const [pickerMakingSticker, setPickerMakingSticker] = useState(false);
  const [pickerImageUrl, setPickerImageUrl] = useState<string | undefined>(undefined);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const {
    isRecording,
    recordingDuration,
    liveWaveform,
    recordingError,
    startRecording,
    stopAndGetResult,
    cancelRecording,
    clearError,
  } = useVoiceRecorder();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = content.trim().length > 0;
  const canSend = hasText && !disabled && !isSending && !isRecording;

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;

    const textToSend = content.trim();
    setContent('');
    setIsPickerOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(textToSend, 'TEXT');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleStartRecording = async () => {
    if (disabled || isSending || isProcessingVoice) return;
    setIsPickerOpen(false);
    await startRecording();
  };

  const handleStopAndSendVoice = async () => {
    if (isProcessingVoice) return;
    setIsProcessingVoice(true);
    try {
      const result = await stopAndGetResult();
      if (result && result.audioDataUrl) {
        const encodedVoice = encodeVoiceMessage(
          result.audioDataUrl,
          result.duration,
          result.waveform
        );
        await onSendMessage(encodedVoice, 'VOICE');
      }
    } catch (err) {
      console.error('Failed to send voice recording', err);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      e.preventDefault();
      onCancelReply();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto grow height up to max 120px
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const openStickerMakerWithImage = (imageDataUrl: string) => {
    setPickerImageUrl(imageDataUrl);
    setPickerInitialTab('sticker');
    setPickerMakingSticker(true);
    setIsPickerOpen(true);
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        openStickerMakerWithImage(result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
              openStickerMakerWithImage(result);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setContent((prev) => prev + emoji);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    setContent(newContent);

    // Keep cursor right after newly inserted emoji
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }, 0);
  };

  const handleSelectSticker = async (sticker: StickerItem) => {
    setIsPickerOpen(false);
    try {
      if (onSendSticker) {
        await onSendSticker(sticker);
      } else {
        await onSendMessage(encodeSticker(sticker.id, sticker), 'STICKER');
      }
    } catch (err) {
      console.error('Failed to send sticker', err);
    }
  };

  useEffect(() => {
    if (!isRecording) {
      textareaRef.current?.focus();
    }
  }, [disabled, isRecording]);

  return (
    <div id="message-input-container" className="relative flex flex-col bg-white dark:bg-slate-900 night:bg-black border-t border-neutral-200 dark:border-slate-800 night:border-neutral-800 shrink-0 transition-colors">
      {/* Reply Preview Bar */}
      {replyingTo && (
        <div
          id="reply-preview-banner"
          className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-slate-800/80 night:bg-neutral-900 border-b border-neutral-200/80 dark:border-slate-700/80 night:border-neutral-800 text-xs transition-all"
        >
          <div className="flex items-center gap-2.5 overflow-hidden pl-2 border-l-[3.5px] border-emerald-500 min-w-0">
            <Reply className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-[11px] truncate">
                Replying to {replyTargetName || 'Message'}
              </span>
              <span className="truncate text-neutral-600 dark:text-slate-300 night:text-neutral-300 text-[11px]">
                {replyingTo.content.startsWith('sticker:')
                  ? '🎨 Sticker'
                  : replyingTo.content.startsWith('{"type":"voice"') || replyingTo.content.startsWith('data:audio/')
                  ? '🎙️ Voice message'
                  : replyingTo.content}
              </span>
            </div>
          </div>
          <button
            id="cancel-reply-btn"
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-neutral-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-2"
            title="Cancel reply (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Error Alert */}
      {recordingError && (
        <div
          id="voice-recording-error-banner"
          className="px-3.5 py-2 mx-3 mt-2 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{recordingError}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form
        id="message-input-form"
        onSubmit={handleSend}
        className="relative p-3 flex items-end gap-2"
      >
        {/* Hidden file input for uploading images directly from browser/files */}
        <input
          ref={fileInputRef}
          id="chat-image-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileSelected}
        />

        {isRecording ? (
          /* Active Voice Recording Bar */
          <div
            id="voice-recording-active-bar"
            className="flex-1 min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-1.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl animate-in fade-in duration-200 shadow-2xs"
          >
            {/* Left: Pulsing Red Indicator & Live Timer */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatAudioDuration(recordingDuration)}
              </span>
            </div>

            {/* Center: Live Waveform Visualizer */}
            <div className="flex-1 flex items-center justify-center gap-[3px] h-7 overflow-hidden px-2">
              {liveWaveform.length > 0 ? (
                liveWaveform.map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(4, Math.round(val * 24))}px` }}
                    className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full transition-all duration-75 shrink-0"
                  />
                ))
              ) : (
                <span className="text-xs text-rose-500/80 dark:text-rose-400/80 italic font-medium">
                  Recording audio...
                </span>
              )}
            </div>

            {/* Discard Recording Button */}
            <button
              id="discard-voice-recording-btn"
              type="button"
              onClick={handleCancelRecording}
              aria-label="Discard voice recording"
              className="p-2 rounded-xl text-neutral-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
              title="Cancel and discard recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Standard Message Text Area with Quick Tools */
          <div className="flex-1 relative">
            <div className="absolute left-2.5 bottom-2 flex items-center gap-0.5 z-10">
              <button
                id="emoji-picker-toggle-btn"
                type="button"
                onClick={() => {
                  setPickerInitialTab('emoji');
                  setPickerMakingSticker(false);
                  setPickerImageUrl(undefined);
                  setIsPickerOpen((prev) => !prev);
                }}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isPickerOpen && pickerInitialTab === 'emoji' && !pickerMakingSticker
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60'
                    : 'text-neutral-400 hover:text-neutral-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800'
                }`}
                title="Add emoji or sticker"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                id="chat-image-upload-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full transition-colors text-neutral-400 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800 cursor-pointer"
                title="Upload image from browser or file"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              id="message-text-input"
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a message... (Enter to send)"
              disabled={disabled}
              rows={1}
              aria-label="Message text"
              className="w-full resize-none min-h-[44px] max-h-32 pl-[82px] pr-4 py-2.5 text-sm sm:text-base leading-relaxed bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white dark:bg-slate-800 dark:hover:bg-slate-800/90 dark:focus:bg-slate-800 night:bg-neutral-900 night:hover:bg-neutral-900/90 night:focus:bg-neutral-900 text-neutral-900 dark:text-slate-100 night:text-white border border-neutral-200 hover:border-neutral-300 dark:border-slate-700 dark:hover:border-slate-600 night:border-neutral-800 rounded-2xl placeholder:text-neutral-400 dark:placeholder:text-slate-500 night:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all"
            />
          </div>
        )}

        {/* Action Button: Send Voice if recording, Send Text if typed, or Record Mic button */}
        {isRecording ? (
          <button
            id="send-voice-recording-btn"
            type="button"
            onClick={handleStopAndSendVoice}
            disabled={isProcessingVoice}
            aria-label="Send voice recording"
            className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-95 shadow-sm cursor-pointer transition-all"
            title="Send voice recording"
          >
            {isProcessingVoice ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : hasText ? (
          <button
            id="send-message-btn"
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 active:scale-95 shadow-sm cursor-pointer transition-all"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5 transition-transform" />
          </button>
        ) : (
          <button
            id="start-voice-recording-btn"
            type="button"
            onClick={handleStartRecording}
            disabled={disabled || isSending}
            aria-label="Record voice message"
            className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center bg-neutral-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 night:bg-neutral-900 text-neutral-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-all cursor-pointer shadow-2xs active:scale-95 border border-neutral-200/60 dark:border-slate-700/60"
            title="Record voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {/* Emoji & Sticker Picker Popover */}
        <EmojiStickerPicker
          isOpen={isPickerOpen}
          onClose={() => {
            setIsPickerOpen(false);
            setPickerMakingSticker(false);
            setPickerImageUrl(undefined);
          }}
          onSelectEmoji={handleSelectEmoji}
          onSelectSticker={handleSelectSticker}
          initialTab={pickerInitialTab}
          initialMakingSticker={pickerMakingSticker}
          initialImageUrl={pickerImageUrl}
        />
      </form>
    </div>
  );
};

