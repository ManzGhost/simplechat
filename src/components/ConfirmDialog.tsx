import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div
        id="confirm-dialog-card"
        className="bg-white dark:bg-slate-900 night:bg-black rounded-xl shadow-xl border border-neutral-200 dark:border-slate-800 night:border-neutral-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-slate-800/80 night:border-neutral-900">
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 night:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : null}
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-neutral-900 dark:text-white night:text-white">
              {title}
            </h3>
          </div>
          <button
            id="confirm-dialog-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            className="text-neutral-400 dark:text-slate-500 night:text-neutral-500 hover:text-neutral-600 dark:hover:text-slate-300 night:hover:text-neutral-300 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p id="confirm-dialog-message" className="text-sm text-neutral-600 dark:text-slate-300 night:text-neutral-300 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-neutral-50 dark:bg-slate-900/60 night:bg-neutral-950/80 border-t border-neutral-100 dark:border-slate-800/80 night:border-neutral-900">
          <button
            id="confirm-dialog-cancel-btn"
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-slate-200 night:text-neutral-200 bg-white dark:bg-slate-800 night:bg-neutral-900 border border-neutral-300 dark:border-slate-700 night:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700/60 night:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-dialog-action-btn"
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200 dark:focus:ring-rose-900'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200 dark:focus:ring-emerald-900'
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
