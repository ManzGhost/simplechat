import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div id="not-found-page" className="min-h-screen bg-neutral-50 dark:bg-slate-950 night:bg-black text-neutral-900 dark:text-slate-100 night:text-white flex flex-col items-center justify-center p-4 text-center transition-colors">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 night:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-neutral-900 dark:text-white night:text-white mb-2">404</h1>
      <h2 className="text-lg font-semibold text-neutral-800 dark:text-slate-200 night:text-neutral-200 mb-1">Page Not Found</h2>
      <p className="text-xs text-neutral-500 dark:text-slate-400 night:text-neutral-400 max-w-xs mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Chats</span>
      </Link>
    </div>
  );
};
