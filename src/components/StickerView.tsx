import React from 'react';
import { StickerItem } from '../data/stickers';

interface StickerViewProps {
  sticker: StickerItem;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StickerView: React.FC<StickerViewProps> = ({
  sticker,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20 text-3xl',
    md: 'w-32 h-32 text-5xl',
    lg: 'w-40 h-40 text-6xl',
  };

  const badgeSizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1',
  };

  return (
    <div
      id={`sticker-view-${sticker.id}`}
      className={`relative inline-flex flex-col items-center justify-center select-none group transition-transform active:scale-95 ${className}`}
    >
      {/* Outer sticker card container with glossy sticker edge */}
      <div
        style={{
          background: `radial-gradient(circle at 30% 30%, ${sticker.accentColor}, #ffffff)`,
          borderColor: sticker.color,
        }}
        className={`${sizeClasses[size]} rounded-3xl p-3 flex flex-col items-center justify-between border-2 shadow-sm dark:shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg`}
      >
        {/* Subtle decorative glow ring */}
        <div
          className="absolute -inset-0.5 rounded-3xl opacity-20 blur-xs transition group-hover:opacity-40"
          style={{ backgroundColor: sticker.color }}
        />

        {/* Central Expressive Artwork: Image or Emoji */}
        <div className="flex-1 w-full h-full flex items-center justify-center p-1 overflow-hidden">
          {sticker.imageUrl ? (
            <img
              src={sticker.imageUrl}
              alt={sticker.title || 'Custom Sticker'}
              className="max-w-full max-h-full object-contain rounded-xl drop-shadow-sm select-none pointer-events-none transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
              {sticker.emoji || '✨'}
            </span>
          )}
        </div>

        {/* Glossy Title Banner Pill */}
        <div
          style={{
            backgroundColor: sticker.color,
          }}
          className={`${badgeSizeClasses[size]} font-black text-white rounded-full tracking-wider uppercase shadow-xs whitespace-nowrap z-10`}
        >
          {sticker.badgeText}
        </div>
      </div>

      {sticker.subtext && size !== 'sm' && (
        <span className="text-[10px] text-neutral-500 dark:text-slate-400 night:text-neutral-400 mt-1 font-medium tracking-tight">
          {sticker.subtext}
        </span>
      )}
    </div>
  );
};
