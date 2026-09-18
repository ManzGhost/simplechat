import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, MoonStar, Check } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../types';

interface ThemeToggleProps {
  variant?: 'segmented' | 'compact' | 'menu';
  className?: string;
  id?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
  id = 'theme-toggle',
}) => {
  const { theme, setTheme, cycleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const options: { mode: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
    { mode: 'light', label: 'Light', icon: Sun, desc: 'Clean bright layout' },
    { mode: 'dark', label: 'Dark', icon: Moon, desc: 'Slate charcoal gray' },
    { mode: 'night', label: 'Night', icon: MoonStar, desc: 'True AMOLED black' },
  ];

  if (variant === 'segmented') {
    return (
      <div
        id={id}
        className={`inline-flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-slate-800/80 night:bg-neutral-900 border border-neutral-200 dark:border-slate-700/60 night:border-neutral-800 transition-colors ${className}`}
        role="group"
        aria-label="Theme mode selection"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              id={`${id}-${opt.mode}`}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 night:bg-neutral-800 text-emerald-600 dark:text-emerald-400 night:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-slate-400 night:text-neutral-400 hover:text-neutral-900 dark:hover:text-slate-200 night:hover:text-neutral-200'
              }`}
              title={`${opt.label} Mode - ${opt.desc}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-slate-200 night:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 night:bg-neutral-900 night:hover:bg-neutral-800 border border-neutral-200 dark:border-slate-700 night:border-neutral-800 rounded-lg transition-colors shadow-2xs"
          title="Change color theme"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
          {theme === 'dark' && <Moon className="w-4 h-4 text-sky-400" />}
          {theme === 'night' && <MoonStar className="w-4 h-4 text-emerald-400" />}
          <span className="capitalize">{theme}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-48 py-1 bg-white dark:bg-slate-800 night:bg-neutral-900 border border-neutral-200 dark:border-slate-700 night:border-neutral-800 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-slate-700/60 night:border-neutral-800">
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-slate-400 night:text-neutral-400 uppercase tracking-wider">
                Color Theme
              </p>
            </div>
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    setTheme(opt.mode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-slate-700/60 night:bg-neutral-800/80 text-emerald-700 dark:text-emerald-400 night:text-emerald-400 font-semibold'
                      : 'text-neutral-700 dark:text-slate-300 night:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-700/40 night:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1 rounded-md ${
                        opt.mode === 'light'
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                          : opt.mode === 'dark'
                          ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-[10px] text-neutral-400 dark:text-slate-400 night:text-neutral-400">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default compact single button: click to cycle, tooltip tells next
  const currentOpt = options.find((o) => o.mode === theme) || options[0];
  const nextOpt = options[(options.findIndex((o) => o.mode === theme) + 1) % options.length];
  const Icon = currentOpt.icon;

  return (
    <button
      id={id}
      type="button"
      onClick={cycleTheme}
      className={`p-2 text-neutral-600 dark:text-slate-300 night:text-neutral-300 hover:text-neutral-900 dark:hover:text-white night:hover:text-white bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 night:bg-neutral-900 night:hover:bg-neutral-800 border border-neutral-200 dark:border-slate-700/80 night:border-neutral-800 rounded-lg transition-colors shadow-2xs ${className}`}
      title={`Theme: ${currentOpt.label} (Click to switch to ${nextOpt.label})`}
      aria-label={`Current theme: ${currentOpt.label}. Click to switch to ${nextOpt.label}`}
    >
      <Icon
        className={`w-4 h-4 transition-transform ${
          theme === 'light'
            ? 'text-amber-500'
            : theme === 'dark'
            ? 'text-sky-400'
            : 'text-emerald-400'
        }`}
      />
    </button>
  );
};
