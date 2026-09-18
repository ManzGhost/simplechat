import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div id="loading-spinner-container" className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 id="loading-spinner-icon" className={`animate-spin text-emerald-600 ${sizeMap[size]}`} />
      {label && <p id="loading-spinner-label" className="text-xs text-neutral-500 font-medium">{label}</p>}
    </div>
  );
};
