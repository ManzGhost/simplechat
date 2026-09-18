import React from 'react';
import { User, UserStatus } from '../types';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';

interface StatusAvatarRingProps {
  user: User;
  statuses?: UserStatus[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  allViewed?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showOnlineDot?: boolean;
  className?: string;
}

export const StatusAvatarRing: React.FC<StatusAvatarRingProps> = ({
  user,
  statuses,
  size = 'md',
  allViewed = false,
  onClick,
  showOnlineDot = false,
  className = '',
}) => {
  const hasStatus = statuses && statuses.length > 0;
  const count = statuses?.length || 0;

  // Dimensions
  const dimensions = {
    sm: { avatar: 32, total: 38, stroke: 2, radius: 17 },
    md: { avatar: 42, total: 50, stroke: 2.5, radius: 22 },
    lg: { avatar: 52, total: 62, stroke: 2.5, radius: 28 },
    xl: { avatar: 64, total: 76, stroke: 3, radius: 34 },
  }[size];

  const circumference = 2 * Math.PI * dimensions.radius;
  const gap = count > 1 ? 4 : 0;
  const segmentLength = count > 0 ? (circumference - count * gap) / count : circumference;

  const ringColor = allViewed
    ? 'text-neutral-400 dark:text-slate-600 night:text-neutral-600'
    : 'text-emerald-500 dark:text-emerald-400';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{ width: dimensions.total, height: dimensions.total }}
      title={hasStatus ? `${user.name} (${count} status update${count > 1 ? 's' : ''})` : user.name}
    >
      {/* SVG Ring */}
      {hasStatus && (
        <svg
          className="absolute inset-0 -rotate-90 transform pointer-events-none"
          width={dimensions.total}
          height={dimensions.total}
          viewBox={`0 0 ${dimensions.total} ${dimensions.total}`}
        >
          {Array.from({ length: count }).map((_, idx) => {
            const isItemViewed = statuses[idx]?.hasViewed ?? allViewed;
            const itemColor = isItemViewed
              ? 'stroke-neutral-300 dark:stroke-slate-600 night:stroke-neutral-700'
              : 'stroke-emerald-500 dark:stroke-emerald-400';

            const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
            const strokeDashoffset = -idx * (segmentLength + gap);

            return (
              <circle
                key={idx}
                cx={dimensions.total / 2}
                cy={dimensions.total / 2}
                r={dimensions.radius}
                fill="none"
                className={`${itemColor} transition-all duration-300`}
                strokeWidth={dimensions.stroke}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}

      {/* Avatar Image / Initials */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center relative bg-neutral-200 dark:bg-slate-800"
        style={{ width: dimensions.avatar, height: dimensions.avatar }}
      >
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center font-bold ${
              size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
            } ${getAvatarColor(user.name)}`}
          >
            {getInitials(user.name)}
          </div>
        )}
      </div>

      {/* Online indicator if requested */}
      {showOnlineDot && (
        <span
          className={`absolute bottom-0.5 right-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 night:ring-black ${
            user.online ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-slate-600'
          }`}
          style={{ width: dimensions.avatar / 4, height: dimensions.avatar / 4 }}
        />
      )}
    </div>
  );
};
