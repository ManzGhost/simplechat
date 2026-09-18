import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Smile, Sparkles, Plus, Trash2 } from 'lucide-react';
import {
  EMOJI_LIST,
  EMOJI_CATEGORIES,
  POPULAR_EMOJIS,
  EmojiItem,
} from '../data/emojis';
import {
  STICKER_PACKS,
  StickerItem,
  StickerPack,
  getCustomStickers,
  deleteCustomSticker,
  fetchCustomStickersFromDb,
} from '../data/stickers';
import { StickerView } from './StickerView';
import { StickerMaker } from './StickerMaker';

interface EmojiStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: StickerItem) => void;
  initialTab?: 'emoji' | 'sticker';
  initialMakingSticker?: boolean;
  initialImageUrl?: string;
}

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectSticker,
  initialTab = 'emoji',
  initialMakingSticker = false,
  initialImageUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStickerPackId, setSelectedStickerPackId] = useState('custom');
  const [customStickers, setCustomStickers] = useState<StickerItem[]>(() => getCustomStickers());
  const [isMakingSticker, setIsMakingSticker] = useState(initialMakingSticker);
  const [makerImageUrl, setMakerImageUrl] = useState<string | undefined>(initialImageUrl);

  // Sync custom stickers from MongoDB Atlas when picker opens or props change
  useEffect(() => {
    if (isOpen) {
      setCustomStickers(getCustomStickers());
      fetchCustomStickersFromDb().then((fresh) => {
        setCustomStickers([...fresh]);
      });
      if (initialTab) setActiveTab(initialTab);
      if (initialMakingSticker !== undefined) setIsMakingSticker(initialMakingSticker);
      if (initialImageUrl) setMakerImageUrl(initialImageUrl);
    }
  }, [isOpen, initialTab, initialMakingSticker, initialImageUrl]);

  const allPacks = useMemo<StickerPack[]>(() => {
    const myPack: StickerPack = {
      id: 'custom',
      name: 'My Stickers',
      icon: '⭐',
      stickers: customStickers,
    };
    return [myPack, ...STICKER_PACKS];
  }, [customStickers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Only close if target isn't the trigger button
        const trigger = document.getElementById('emoji-picker-toggle-btn');
        if (trigger && trigger.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter emojis based on category and search query
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EMOJI_LIST.filter((item: EmojiItem) => {
      const matchCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const activeStickerPack = useMemo(() => {
    return (
      allPacks.find((p) => p.id === selectedStickerPackId) ||
      allPacks[0]
    );
  }, [allPacks, selectedStickerPackId]);

  const handleDeleteCustomSticker = (id: string) => {
    deleteCustomSticker(id);
    setCustomStickers(getCustomStickers());
  };

  const handleCreatedSticker = (newSticker: StickerItem, sendImmediately: boolean) => {
    setCustomStickers(getCustomStickers());
    setIsMakingSticker(false);
    setSelectedStickerPackId('custom');
    if (sendImmediately) {
      onSelectSticker(newSticker);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="emoji-sticker-picker-popover"
      className="absolute bottom-full mb-2 left-2 right-2 sm:left-4 sm:right-auto sm:w-96 max-h-[460px] bg-white dark:bg-slate-900 night:bg-neutral-900 border border-neutral-200 dark:border-slate-800 night:border-neutral-800 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
    >
      {/* Header with Tabs & Close button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-100 dark:border-slate-800 night:border-neutral-800 shrink-0 bg-neutral-50/70 dark:bg-slate-800/40 night:bg-neutral-900/50">
        <div className="flex items-center gap-1.5 p-0.5 bg-neutral-200/60 dark:bg-slate-800 night:bg-neutral-800 rounded-xl">
          <button
            id="picker-tab-emoji"
            type="button"
            onClick={() => {
              setActiveTab('emoji');
              setIsMakingSticker(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'emoji'
                ? 'bg-white dark:bg-slate-700 night:bg-black text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-600 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            id="picker-tab-sticker"
            type="button"
            role="tab"
            aria-selected={activeTab === 'sticker'}
            onClick={() => {
              setActiveTab('sticker');
              setIsMakingSticker(false);
            }}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'sticker'
                ? 'bg-white dark:bg-slate-700 night:bg-black text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20 ring-1 ring-emerald-500/10'
                : 'text-neutral-600 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Browse stickers & create custom ones from images or emojis"
          >
            <Sparkles className={`w-3.5 h-3.5 transition-transform duration-200 ${activeTab === 'sticker' ? 'text-emerald-500 scale-110' : 'group-hover:scale-110'}`} />
            <span>Stickers</span>
            {customStickers.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                  activeTab === 'sticker'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-neutral-200/80 text-neutral-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {customStickers.length}
              </span>
            )}
          </button>
        </div>

        <button
          id="picker-close-btn"
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800 transition-colors"
          title="Close picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'emoji' ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Emoji Search Box */}
          <div className="p-2.5 pb-2 shrink-0 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-800">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400 dark:text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                ref={searchInputRef}
                id="emoji-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emojis..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-100/80 dark:bg-slate-800 night:bg-black text-neutral-900 dark:text-white night:text-white rounded-lg border border-transparent focus:border-emerald-500/40 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar pb-0.5">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  id={`emoji-category-${cat.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Popular Row (shown when no search) */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className="px-3 pt-2 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-slate-500 night:text-neutral-500">
                Popular
              </span>
              <div className="flex items-center gap-1 mt-1 overflow-x-auto no-scrollbar pb-1">
                {POPULAR_EMOJIS.map((emoji, idx) => (
                  <button
                    key={`popular-${idx}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="w-7 h-7 flex items-center justify-center text-base hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800 rounded-lg hover:scale-120 transition-all shrink-0"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[200px] max-h-[250px]">
            {filteredEmojis.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 dark:text-slate-500">
                <Smile className="w-8 h-8 stroke-[1.5] mb-1.5 opacity-50" />
                <p className="text-xs">No emojis found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {filteredEmojis.map((item, index) => (
                  <button
                    key={`${item.emoji}-${index}`}
                    id={`emoji-btn-${index}`}
                    type="button"
                    onClick={() => onSelectEmoji(item.emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-neutral-100 dark:hover:bg-slate-800 night:hover:bg-neutral-800 rounded-lg hover:scale-125 transition-transform active:scale-95"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : isMakingSticker ? (
        /* Sticker Maker View */
        <StickerMaker
          initialImageUrl={makerImageUrl}
          onSaveAndSend={(sticker) => handleCreatedSticker(sticker, true)}
          onSaveOnly={(sticker) => handleCreatedSticker(sticker, false)}
          onCancel={() => setIsMakingSticker(false)}
        />
      ) : (
        /* Sticker Tab */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sticker Pack Tabs & "Make Sticker" action */}
          <div className="flex items-center justify-between gap-1.5 p-2 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
              {allPacks.map((pack) => (
                <button
                  key={pack.id}
                  id={`sticker-pack-btn-${pack.id}`}
                  type="button"
                  onClick={() => setSelectedStickerPackId(pack.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    selectedStickerPackId === pack.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-slate-800 night:bg-neutral-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200/70 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{pack.icon}</span>
                  <span>{pack.name}</span>
                  {pack.id === 'custom' && customStickers.length > 0 && (
                    <span className="text-[10px] bg-white/20 dark:bg-white/20 px-1.5 py-0.2 rounded-full">
                      {customStickers.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Make Own Sticker Button */}
            <button
              id="make-own-sticker-btn"
              type="button"
              onClick={() => setIsMakingSticker(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-300/80 dark:border-emerald-800/80 transition-all shrink-0 shadow-xs active:scale-95 cursor-pointer"
              title="Create custom sticker from image upload or emoji"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Sticker</span>
            </button>
          </div>

          {/* Sticker Grid */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[220px] max-h-[290px]">
            <p className="text-[11px] text-neutral-400 dark:text-slate-500 night:text-neutral-500 mb-2.5 font-medium flex items-center justify-between">
              <span>{selectedStickerPackId === 'custom' ? 'Your custom stickers:' : 'Click a sticker to send directly:'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                {activeStickerPack.stickers.length} Stickers
              </span>
            </p>

            {selectedStickerPackId === 'custom' && activeStickerPack.stickers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  No Custom Stickers Yet
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5 mb-3 max-w-[220px]">
                  Upload an image from your browser/files or pick an emoji to create your first sticker!
                </p>
                <button
                  id="empty-make-sticker-btn"
                  type="button"
                  onClick={() => setIsMakingSticker(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Upload Image & Create</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {/* When in My Stickers, first tile is "+ Make New" */}
                {selectedStickerPackId === 'custom' && (
                  <button
                    id="create-new-sticker-tile"
                    type="button"
                    onClick={() => setIsMakingSticker(true)}
                    className="flex flex-col items-center justify-center p-3 rounded-3xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-all hover:scale-105 active:scale-95 group min-h-[96px]"
                    title="Make a new custom sticker"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Create</span>
                  </button>
                )}

                {activeStickerPack.stickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="relative group flex flex-col items-center justify-center"
                  >
                    <button
                      id={`sticker-item-${sticker.id}`}
                      type="button"
                      onClick={() => onSelectSticker(sticker)}
                      className="w-full flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-neutral-100/80 dark:hover:bg-slate-800/80 night:hover:bg-neutral-800/80 border border-transparent hover:border-neutral-200 dark:hover:border-slate-700 transition-all hover:scale-105 active:scale-95"
                      title={`Send "${sticker.title}" sticker`}
                    >
                      <StickerView sticker={sticker} size="sm" />
                    </button>

                    {selectedStickerPackId === 'custom' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomSticker(sticker.id);
                        }}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xs transition-opacity z-20"
                        title="Delete this custom sticker"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

