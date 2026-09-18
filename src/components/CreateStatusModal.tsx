import React, { useState } from 'react';
import {
  X,
  Type,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Send,
  Palette,
} from 'lucide-react';
import { useStatus } from '../hooks/useStatus';
import { useAuth } from '../hooks/useAuth';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'TEXT' | 'IMAGE';
}

const GRADIENTS = [
  { id: 'emerald', label: 'Emerald', value: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' },
  { id: 'blue', label: 'Ocean', value: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)' },
  { id: 'purple', label: 'Violet', value: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)' },
  { id: 'sunset', label: 'Sunset', value: 'linear-gradient(135deg, #e11d48 0%, #f97316 100%)' },
  { id: 'amber', label: 'Amber', value: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)' },
  { id: 'midnight', label: 'Midnight', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { id: 'forest', label: 'Forest', value: 'linear-gradient(135deg, #166534 0%, #15803d 100%)' },
  { id: 'coral', label: 'Coral', value: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)' },
];

const FONTS = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
];

const SAMPLE_PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
];

const QUICK_EMOJIS = ['✨', '🔥', '☕', '🚀', '🎉', '💻', '🏖️', '❤️', '🎶', '💪'];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  initialType = 'TEXT',
}) => {
  const { user } = useAuth();
  const { createStatus } = useStatus();

  const [type, setType] = useState<'TEXT' | 'IMAGE'>(initialType);
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].value);
  const [selectedFont, setSelectedFont] = useState('sans');

  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('Image size should be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (type === 'TEXT') {
      if (!textContent.trim()) {
        setError('Please enter some text for your status');
        return;
      }
    } else {
      if (!imageUrl.trim()) {
        setError('Please provide a photo or select an image');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (type === 'TEXT') {
        await createStatus({
          type: 'TEXT',
          content: textContent.trim(),
          backgroundColor: selectedGradient,
          fontStyle: selectedFont,
        });
      } else {
        await createStatus({
          type: 'IMAGE',
          content: imageUrl.trim(),
          caption: caption.trim() || undefined,
        });
      }

      // Reset and close
      setTextContent('');
      setImageUrl('');
      setCaption('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post status update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-status-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 night:bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-slate-800 night:border-neutral-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-slate-800 night:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white night:text-white">
              Add Status Update
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle Tabs */}
        <div className="flex border-b border-neutral-100 dark:border-slate-800 night:border-neutral-800 bg-neutral-50 dark:bg-slate-900/60 night:bg-neutral-950 p-1">
          <button
            type="button"
            onClick={() => setType('TEXT')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'TEXT'
                ? 'bg-white dark:bg-slate-800 night:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text Status</span>
          </button>
          <button
            type="button"
            onClick={() => setType('IMAGE')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'IMAGE'
                ? 'bg-white dark:bg-slate-800 night:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo Status</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* TEXT STATUS MODE */}
          {type === 'TEXT' ? (
            <div className="space-y-4">
              {/* Live Canvas Preview & Input */}
              <div
                className="w-full h-56 rounded-xl p-6 flex flex-col items-center justify-center relative shadow-inner text-center overflow-hidden transition-all duration-300"
                style={{ background: selectedGradient }}
              >
                <textarea
                  id="status-text-input"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  maxLength={250}
                  placeholder="What's on your mind?..."
                  rows={3}
                  className={`w-full bg-transparent text-white placeholder-white/70 text-center resize-none focus:outline-none font-semibold ${
                    textContent.length < 50
                      ? 'text-xl sm:text-2xl'
                      : 'text-base sm:text-lg'
                  } ${
                    selectedFont === 'serif'
                      ? 'font-serif'
                      : selectedFont === 'mono'
                      ? 'font-mono'
                      : 'font-sans'
                  }`}
                  autoFocus
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-white/60 font-mono">
                  {textContent.length}/250
                </span>
              </div>

              {/* Quick Emojis */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[11px] text-neutral-400 shrink-0 mr-1">Emojis:</span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setTextContent((prev) => prev + emoji)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 text-base transition-transform hover:scale-115"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Background Gradient Picker */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-300 mb-1.5">
                  Background Style
                </label>
                <div className="flex gap-2 flex-wrap">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGradient(g.value)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedGradient === g.value
                          ? 'ring-2 ring-emerald-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ background: g.value }}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>

              {/* Font Picker */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-300 mb-1.5">
                  Typography
                </label>
                <div className="flex gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFont(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedFont === f.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PHOTO STATUS MODE */
            <div className="space-y-4">
              {/* Photo Preview or Upload Prompt */}
              {imageUrl ? (
                <div className="relative w-full h-56 rounded-xl overflow-hidden bg-black flex items-center justify-center group">
                  <img
                    src={imageUrl}
                    alt="Status preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-700 dark:text-slate-200">
                      Upload a photo or enter image URL
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Supports JPG, PNG, WebP (Max 4MB)
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Or Image URL */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Sample Presets */}
              <div>
                <span className="block text-[11px] text-neutral-500 mb-1.5">Or pick a sample:</span>
                <div className="flex gap-2">
                  {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageUrl(preset)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-transform hover:scale-105 ${
                        imageUrl === preset
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-transparent'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-300 mb-1">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={100}
                  placeholder="Add a caption..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 night:border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Visible to contacts for 24 hours
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sharing...' : 'Share to Status'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
