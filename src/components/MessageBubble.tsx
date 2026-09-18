import React, { useState } from 'react';
import { Check, CheckCheck, Phone, PhoneOff, Video, Reply, Copy, Camera, FileText } from 'lucide-react';
import { Message } from '../types';
import { formatMessageTime } from '../utils/dateUtils';
import { parseSticker, getStickerById } from '../data/stickers';
import { parseVoiceMessage, isVoiceMessage, formatAudioDuration } from '../utils/voiceUtils';
import { StickerView } from './StickerView';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSender,
  onReply,
  onScrollToMessage,
  isHighlighted = false,
}) => {
  const [copied, setCopied] = useState(false);
  const timeStr = formatMessageTime(message.timestamp);

  const voiceData =
    message.messageType === 'VOICE' || isVoiceMessage(message.content)
      ? parseVoiceMessage(message.content)
      : null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voiceData) {
      navigator.clipboard?.writeText(`[Voice Message ${formatAudioDuration(voiceData.duration)}]`);
    } else {
      navigator.clipboard?.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Check if message is a call record
  if (message.messageType === 'CALL_RECORD' || message.content.startsWith('📞') || message.content.startsWith('📹')) {
    const isVideo = message.content.includes('Video');
    const isMissed = message.content.toLowerCase().includes('missed') || message.content.toLowerCase().includes('declined');

    return (
      <div
        id={`message-call-record-${message.id}`}
        className="flex w-full justify-center my-2.5 px-4"
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium border shadow-2xs backdrop-blur-xs transition-colors ${
            isMissed
              ? 'bg-rose-50 dark:bg-rose-950/40 night:bg-rose-950/40 text-rose-700 dark:text-rose-300 night:text-rose-300 border-rose-200 dark:border-rose-900/60 night:border-rose-900/60'
              : 'bg-neutral-100 dark:bg-slate-800/80 night:bg-neutral-900/80 text-neutral-700 dark:text-slate-300 night:text-neutral-300 border-neutral-200 dark:border-slate-700 night:border-neutral-800'
          }`}
        >
          <div
            className={`p-1 rounded-full ${
              isMissed
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isVideo ? (
              <Video className="w-3.5 h-3.5" />
            ) : isMissed ? (
              <PhoneOff className="w-3.5 h-3.5" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="font-medium">{message.content.replace(/^[📞📹]\s*/, '')}</span>
          <span className="text-[10px] opacity-60 ml-1">• {timeStr}</span>
        </div>
      </div>
    );
  }

  // Check if message is a sticker
  const sticker =
    parseSticker(message.content) ||
    (message.messageType === 'STICKER' ? getStickerById(message.content) : null);

  // Check if text is only 1-3 emojis for large emoji display
  const isOnlyEmojis = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const emojiRegex =
      /^(?:(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\u200d|\ufe0f|\u20e3)\s*){1,3}$/u;
    return emojiRegex.test(trimmed);
  };

  const hasOnlyEmojis = !sticker && isOnlyEmojis(message.content);

  // Status icon logic:
  // ✓ Sent (delivered: false, seen: false)
  // ✓✓ Delivered (delivered: true, seen: false)
  // ✓✓ Seen (seen: true)
  const renderStatus = () => {
    if (!isSender) return null;

    if (message.seen) {
      return (
        <span title="Seen" className="inline-flex items-center text-emerald-600">
          <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      );
    }

    if (message.delivered) {
      return (
        <span title="Delivered" className="inline-flex items-center text-neutral-400">
          <CheckCheck className="w-3.5 h-3.5" />
        </span>
      );
    }

    return (
      <span title="Sent" className="inline-flex items-center text-neutral-400">
        <Check className="w-3.5 h-3.5" />
      </span>
    );
  };

  // Sticker Message Display
  if (sticker) {
    return (
      <div
        id={`message-bubble-row-${message.id}`}
        className={`group flex w-full ${isSender ? 'justify-end' : 'justify-start'} my-2 px-1 rounded-2xl transition-all duration-300 ${
          isHighlighted ? 'bg-emerald-500/15 ring-2 ring-emerald-500/50 p-1.5' : ''
        }`}
      >
        <div
          id={`message-sticker-bubble-${message.id}`}
          className={`flex flex-col relative ${isSender ? 'items-end' : 'items-start'}`}
        >
          {/* Quoted message if this sticker was a reply */}
          {message.replyTo && (
            <div
              id={`quoted-reply-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onScrollToMessage?.(message.replyTo!.id);
              }}
              className="cursor-pointer mb-1 px-3 py-1.5 rounded-xl text-xs max-w-xs bg-neutral-200/70 dark:bg-slate-800/70 border-l-[3.5px] border-emerald-500 transition-colors shadow-2xs hover:bg-neutral-300/80"
              title="Click to view quoted message"
            >
              <div className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Reply className="w-3 h-3 rotate-180" />
                <span>{message.replyTo.senderName}</span>
              </div>
              <p className="line-clamp-1 text-[11px] text-neutral-700 dark:text-slate-300 truncate">
                {message.replyTo.content.startsWith('sticker:') ? '🎨 Sticker' : message.replyTo.content}
              </p>
            </div>
          )}

          <div className="relative group/sticker">
            <div className="p-1 rounded-3xl bg-neutral-50/50 dark:bg-slate-800/40 night:bg-neutral-900/40 border border-neutral-200/50 dark:border-slate-800/60 night:border-neutral-800/60 shadow-xs">
              <StickerView sticker={sticker} size="md" />
            </div>

            {/* Quick action button for reply */}
            <button
              id={`reply-btn-${message.id}`}
              type="button"
              onClick={() => onReply?.(message)}
              title="Reply to this sticker"
              className={`absolute top-2 opacity-0 group-hover/sticker:opacity-100 transition-opacity p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer ${
                isSender ? '-left-8' : '-right-8'
              }`}
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className={`flex items-center gap-1 mt-1 px-1.5 text-[10px] select-none ${
              isSender ? 'text-neutral-500 dark:text-slate-400' : 'text-neutral-400 dark:text-slate-500'
            }`}
          >
            <span>{timeStr}</span>
            {renderStatus()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-bubble-row-${message.id}`}
      className={`group flex items-center w-full ${isSender ? 'justify-end' : 'justify-start'} my-1 px-1 rounded-2xl transition-all duration-300 ${
        isHighlighted ? 'bg-emerald-500/15 ring-2 ring-emerald-500/50 p-1' : ''
      }`}
    >
      {/* For incoming messages: action buttons appear on the right */}
      {!isSender && (
        <div className="order-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1.5 shrink-0">
          <button
            id={`reply-btn-${message.id}`}
            type="button"
            onClick={() => onReply?.(message)}
            title="Reply to message"
            className="p-1.5 rounded-full text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            id={`copy-btn-${message.id}`}
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy message text'}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Message Bubble */}
      <div
        id={`message-bubble-${message.id}`}
        onDoubleClick={() => onReply?.(message)}
        className={`relative max-w-[82%] sm:max-w-[70%] md:max-w-[60%] px-3.5 py-2 rounded-2xl shadow-2xs text-sm break-words transition-all ${
          isSender
            ? 'order-2 bg-emerald-600 dark:bg-emerald-600 night:bg-emerald-600 text-white rounded-br-xs'
            : 'order-1 bg-white dark:bg-slate-800 night:bg-neutral-900 text-neutral-800 dark:text-slate-100 night:text-neutral-100 border border-neutral-200/80 dark:border-slate-700/80 night:border-neutral-800 rounded-bl-xs'
        }`}
      >
        {/* Quoted/Tagged Reply Box or Attached Status Box */}
        {message.replyTo && (
          message.replyTo.isStatusReply ? (
            <div
              id={`status-reply-${message.id}`}
              className={`mb-2 p-2 rounded-xl text-xs select-none border-l-[3.5px] transition-all shadow-2xs ${
                isSender
                  ? 'bg-black/25 text-white/95 border-emerald-300'
                  : 'bg-neutral-100 dark:bg-slate-700/70 night:bg-neutral-800/80 text-neutral-800 dark:text-slate-100 night:text-neutral-100 border-emerald-500 dark:border-emerald-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
                {message.replyTo.statusType === 'IMAGE' ? (
                  <Camera className="w-3.5 h-3.5 shrink-0 opacity-80" />
                ) : (
                  <FileText className="w-3.5 h-3.5 shrink-0 opacity-80" />
                )}
                <span className={isSender ? 'text-emerald-200 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                  {message.replyTo.senderName}
                </span>
                <span className="text-[10px] opacity-75 font-normal ml-auto">Status</span>
              </div>

              <div className="flex items-center gap-2">
                {message.replyTo.statusThumbnail ? (
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/20 bg-black/30">
                    <img
                      src={message.replyTo.statusThumbnail}
                      alt="Status preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : message.replyTo.statusBackgroundColor ? (
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[10px] text-white font-bold p-1 shadow-2xs text-center line-clamp-2"
                    style={{ background: message.replyTo.statusBackgroundColor }}
                  >
                    📝
                  </div>
                ) : null}

                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 text-[11px] opacity-95 leading-relaxed">
                    {message.replyTo.content}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              id={`quoted-reply-${message.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onScrollToMessage?.(message.replyTo!.id);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onScrollToMessage?.(message.replyTo!.id);
                }
              }}
              className={`cursor-pointer mb-1.5 p-2 rounded-xl text-xs transition-all select-none group/quote ${
                isSender
                  ? 'bg-black/20 hover:bg-black/30 text-white/95 border-l-[3.5px] border-emerald-300'
                  : 'bg-neutral-100 dark:bg-slate-700/70 night:bg-neutral-800/80 hover:bg-neutral-200/80 dark:hover:bg-slate-700 night:hover:bg-neutral-800 text-neutral-700 dark:text-slate-200 night:text-neutral-200 border-l-[3.5px] border-emerald-600 dark:border-emerald-400'
              }`}
              title="Click to jump to quoted message"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] mb-0.5">
                <Reply className="w-3 h-3 rotate-180 shrink-0 opacity-80" />
                <span className={isSender ? 'text-emerald-200 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                  {message.replyTo.senderName}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] opacity-90 italic">
                {message.replyTo.content.startsWith('sticker:')
                  ? '🎨 Sticker'
                  : isVoiceMessage(message.replyTo.content, message.replyTo.messageType)
                  ? '🎙️ Voice message'
                  : message.replyTo.content}
              </p>
            </div>
          )
        )}

        {voiceData ? (
          <VoiceMessagePlayer
            voiceData={voiceData}
            isSender={isSender}
            messageId={message.id}
          />
        ) : (
          <p
            className={`whitespace-pre-wrap leading-relaxed select-text ${
              hasOnlyEmojis ? 'text-3xl sm:text-4xl py-1' : ''
            }`}
          >
            {message.content}
          </p>
        )}

        <div
          className={`flex items-center justify-end gap-1.5 mt-1 select-none text-[10px] ${
            isSender ? 'text-emerald-100/90' : 'text-neutral-400 dark:text-slate-400 night:text-neutral-400'
          }`}
        >
          <span>{timeStr}</span>
          {renderStatus()}
        </div>
      </div>

      {/* For outgoing messages: action buttons appear on the left */}
      {isSender && (
        <div className="order-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-1.5 shrink-0">
          <button
            id={`copy-btn-${message.id}`}
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy message text'}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            id={`reply-btn-${message.id}`}
            type="button"
            onClick={() => onReply?.(message)}
            title="Reply to message"
            className="p-1.5 rounded-full text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
