import React, { useState, useRef } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Send,
  Check,
  Palette,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Smile,
  X,
  RefreshCw,
  Camera,
  FolderOpen,
} from 'lucide-react';
import { StickerItem, saveCustomSticker } from '../data/stickers';
import { StickerView } from './StickerView';

interface StickerMakerProps {
  onSaveAndSend: (sticker: StickerItem) => void;
  onSaveOnly: (sticker: StickerItem) => void;
  onCancel: () => void;
  initialImageUrl?: string;
}

interface ColorTheme {
  id: string;
  name: string;
  color: string;
  accentColor: string;
}

const COLOR_THEMES: ColorTheme[] = [
  { id: 'emerald', name: 'Emerald', color: '#059669', accentColor: '#d1fae5' },
  { id: 'violet', name: 'Violet', color: '#7c3aed', accentColor: '#ede9fe' },
  { id: 'sunset', name: 'Sunset', color: '#ea580c', accentColor: '#ffedd5' },
  { id: 'rose', name: 'Rose', color: '#e11d48', accentColor: '#ffe4e6' },
  { id: 'sky', name: 'Sky Blue', color: '#0284c7', accentColor: '#e0f2fe' },
  { id: 'amber', name: 'Amber', color: '#d97706', accentColor: '#fef3c7' },
  { id: 'pink', name: 'Neon Pink', color: '#db2777', accentColor: '#fce7f3' },
  { id: 'indigo', name: 'Midnight', color: '#4338ca', accentColor: '#e0e7ff' },
];

const PRESET_EMOJIS = [
  '🚀', '🔥', '😎', '💖', '🐶', '🐱', '🐼', '🦊',
  '🦄', '🌟', '🍕', '🎉', '💯', '👑', '🌈', '⚡',
  '🤩', '🦾', '🥳', '🍩', '🎯', '✨', '👋', '🏆'
];

const SAMPLE_IMAGES = [
  {
    name: 'Kitten',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80',
    title: 'Cute Kitten',
    badge: 'MEOW!',
  },
  {
    name: 'Puppy',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&auto=format&fit=crop&q=80',
    title: 'Happy Doggo',
    badge: 'GOOD BOY',
  },
  {
    name: 'Party',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&auto=format&fit=crop&q=80',
    title: 'Celebration',
    badge: 'CELEBRATE',
  },
  {
    name: 'Coffee',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80',
    title: 'Morning Brew',
    badge: 'NEED COFFEE',
  },
];

const PRESET_PHRASES = [
  "LET'S GO!",
  'AWESOME!',
  'SUPER COOL',
  'OMG YES!',
  'LOVE IT',
  'GOOD VIBES',
  'CHILL OUT',
  'CONGRATS!',
];

export const StickerMaker: React.FC<StickerMakerProps> = ({
  onSaveAndSend,
  onSaveOnly,
  onCancel,
  initialImageUrl,
}) => {
  const [artMode, setArtMode] = useState<'image' | 'emoji'>('image');
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [urlInput, setUrlInput] = useState('');
  const [emoji, setEmoji] = useState('🚀');
  const [badgeText, setBadgeText] = useState('AWESOME!');
  const [title, setTitle] = useState('My Sticker');
  const [subtext, setSubtext] = useState('Custom made');
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress image file to max 256x256 WebP/PNG for lightweight storage and instant transit
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }
    setImageError(null);
    setIsProcessingImage(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 256;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            setImageUrl(dataUrl);
          } else {
            setImageUrl(e.target?.result as string);
          }
          setArtMode('image');
          if (!title || title === 'My Sticker') {
            const fileName = file.name.replace(/\.[^/.]+$/, '').slice(0, 16);
            setTitle(fileName);
          }
        } catch {
          setImageUrl(e.target?.result as string);
          setArtMode('image');
        } finally {
          setIsProcessingImage(false);
        }
      };
      img.onerror = () => {
        setImageError('Could not load image');
        setIsProcessingImage(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setImageError('Failed to read image file');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setImageError(null);
    setImageUrl(trimmed);
    setArtMode('image');
  };

  // Construct draft sticker item for live preview
  const draftSticker: StickerItem = {
    id: `custom_${Date.now()}`,
    packId: 'custom',
    title: title.trim() || 'Custom Sticker',
    badgeText: (badgeText.trim() || 'COOL').toUpperCase(),
    color: selectedTheme.color,
    accentColor: selectedTheme.accentColor,
    emoji: artMode === 'emoji' ? (emoji.trim() || '✨') : (!imageUrl ? '🖼️' : undefined),
    imageUrl: artMode === 'image' && imageUrl ? imageUrl : undefined,
    subtext: subtext.trim() || undefined,
  };

  const handleSaveAndSend = () => {
    saveCustomSticker(draftSticker);
    onSaveAndSend(draftSticker);
  };

  const handleSaveOnly = () => {
    saveCustomSticker(draftSticker);
    onSaveOnly(draftSticker);
  };

  return (
    <div id="sticker-maker-container" className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 night:bg-neutral-900 overflow-y-auto">
      {/* Hidden File Input for Browser / Local File Picker */}
      <input
        ref={fileInputRef}
        id="sticker-maker-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-100 dark:border-slate-800 night:border-neutral-800 shrink-0 bg-neutral-50/70 dark:bg-slate-800/50">
        <button
          id="sticker-maker-back-btn"
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <span>Create Custom Sticker</span>
        </div>

        <div className="w-12" aria-hidden="true" />
      </div>

      <div className="p-3.5 space-y-4">
        {/* Interactive Live Sticker Preview Card with Upload Action */}
        <div
          id="sticker-preview-card"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          className={`relative flex flex-col items-center justify-center py-4 px-4 rounded-2xl border-2 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md scale-[1.01]'
              : 'border-neutral-200/80 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Live Sticker Preview</span>
            </span>

            <span className="text-[10px] text-neutral-400 dark:text-slate-500">
              Click preview or button to upload image
            </span>
          </div>

          {/* Clickable sticker container that triggers image file upload */}
          <button
            id="sticker-preview-interactive-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-3xl"
            title="Click to choose image from browser or file"
          >
            <StickerView sticker={draftSticker} size="md" />
          </button>

          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-2">
            {draftSticker.title}
          </span>

          {/* Direct prominent image upload and management buttons */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              id="sticker-preview-upload-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-2xs transition-all cursor-pointer"
              title="Upload image from device or browser"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{imageUrl ? 'Change Image' : 'Upload Image'}</span>
            </button>

            {imageUrl && (
              <button
                id="sticker-preview-remove-image-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageUrl('');
                  setUrlInput('');
                  setArtMode('emoji');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
                title="Remove uploaded image"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <span className="text-[10px] text-neutral-500 dark:text-slate-400 mt-1">
            {isDragOver ? 'Drop image here to load' : 'Drag & drop image, paste (Ctrl+V), or click to upload'}
          </span>

          {isProcessingImage && (
            <p className="text-[11px] text-emerald-600 font-semibold animate-pulse mt-1">
              Processing image...
            </p>
          )}
        </div>

        {/* Art Mode Selector: Image / Photo vs Emoji */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-slate-300">
            Sticker Artwork Type
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-slate-800 night:bg-neutral-800 rounded-xl">
            <button
              id="sticker-artmode-image"
              type="button"
              onClick={() => setArtMode('image')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                artMode === 'image'
                  ? 'bg-white dark:bg-slate-700 night:bg-black text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image / File Upload</span>
            </button>

            <button
              id="sticker-artmode-emoji"
              type="button"
              onClick={() => setArtMode('emoji')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                artMode === 'emoji'
                  ? 'bg-white dark:bg-slate-700 night:bg-black text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>Emoji / Icon</span>
            </button>
          </div>
        </div>

        {/* Image Upload & Source Controls */}
        {artMode === 'image' ? (
          <div className="space-y-3">
            {/* Direct File Upload Area */}
            {imageUrl ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-black shrink-0 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Sticker Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">
                      Image loaded successfully
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Scaled & optimized for sticker card
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id="sticker-change-image-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                    title="Change image file"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                  <button
                    id="sticker-remove-image-btn"
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setUrlInput('');
                    }}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                id="sticker-file-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center group ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                    : 'border-neutral-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-neutral-800 dark:text-slate-100">
                  Upload image from browser or file
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
                  Click to browse files or drag and drop here
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-neutral-700 dark:text-slate-200 shadow-2xs">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose from device</span>
                </div>
              </div>
            )}

            {imageError && (
              <p className="text-[11px] text-rose-500 font-medium">{imageError}</p>
            )}

            {/* Web Image URL Option */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-slate-400">
                Or enter image URL from web:
              </span>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    id="sticker-image-url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                    placeholder="https://example.com/image.png"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  id="sticker-apply-url-btn"
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Load
                </button>
              </div>
            </div>

            {/* Quick Sample Photos */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
                Or pick a sample photo:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {SAMPLE_IMAGES.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setImageUrl(sample.url);
                      setTitle(sample.title);
                      setBadgeText(sample.badge);
                    }}
                    className={`flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                      imageUrl === sample.url
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 bg-neutral-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-9 h-9 rounded-lg object-cover mb-1 shadow-2xs"
                    />
                    <span className="text-[10px] font-medium text-neutral-600 dark:text-slate-400 truncate w-full text-center">
                      {sample.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Emoji Mode */
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-slate-300 flex items-center justify-between">
              <span>Sticker Emoji / Icon</span>
              <span className="text-[11px] text-neutral-400 font-normal">Pick or type any emoji</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-neutral-200 dark:border-slate-700">
                {emoji || '✨'}
              </div>
              <input
                id="sticker-maker-emoji-input"
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                placeholder="e.g. 🔥"
                className="flex-1 px-3 py-2 text-xs bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick preset emojis */}
            <div className="grid grid-cols-8 gap-1 pt-1">
              {PRESET_EMOJIS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setEmoji(preset)}
                  className={`w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-neutral-200 dark:hover:bg-slate-700 transition-all cursor-pointer ${
                    emoji === preset ? 'bg-emerald-100 dark:bg-emerald-950/70 scale-110' : ''
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Badge Text Banner */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-slate-300 flex items-center justify-between">
            <span>Badge Text / Catchphrase</span>
            <span className="text-[10px] text-neutral-400 font-normal">{badgeText.length}/16</span>
          </label>
          <input
            id="sticker-maker-badge-input"
            type="text"
            maxLength={16}
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="e.g. AWESOME!"
            className="w-full px-3 py-2 text-xs uppercase font-bold tracking-wide bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none"
          />

          {/* Suggestion pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 pb-0.5">
            {PRESET_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setBadgeText(phrase)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  badgeText.toUpperCase() === phrase
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700'
                }`}
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sticker Color Theme</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_THEMES.map((theme) => {
              const isSelected = selectedTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/30'
                      : 'border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="text-[11px] font-medium truncate text-neutral-700 dark:text-slate-300">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title / Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-slate-300">
            Sticker Name (optional)
          </label>
          <input
            id="sticker-maker-title-input"
            type="text"
            maxLength={25}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cutie Cat"
            className="w-full px-3 py-2 text-xs bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 pb-1 space-y-2">
          <button
            id="sticker-maker-send-btn"
            type="button"
            onClick={handleSaveAndSend}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Save & Send in Chat</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="sticker-maker-save-btn"
              type="button"
              onClick={handleSaveOnly}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to My Pack</span>
            </button>

            <button
              id="sticker-maker-cancel-btn"
              type="button"
              onClick={onCancel}
              className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-400 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
