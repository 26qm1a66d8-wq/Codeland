import React, { useState } from 'react';
import { AchievementDef } from '../types/codeland';
import { getCharacterById } from '../data/charactersAndBadges';

interface BadgeIconProps {
  kind: AchievementDef['iconKind'];
  accentHex?: string;
  size?: number;
  locked?: boolean;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  kind,
  accentHex = '#2F7D46',
  size = 36,
  locked = false,
}) => {
  const strokeColor = locked ? '#6B7C73' : accentHex;
  const fillSoft = locked ? 'rgba(107,124,115,0.14)' : `${accentHex}24`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="8"
        fill={fillSoft}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {kind === 'sprout' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 30V18" />
          <path d="M20 22C14.5 22 11 18.5 11 13C16.5 13 20 16.5 20 22Z" />
          <path d="M20 19C20 14 23.5 11 29 11C29 16.5 25.5 19 20 19Z" />
        </g>
      )}
      {kind === 'terminal' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="11" width="22" height="18" rx="3" />
          <path d="M13.5 17L17.5 20L13.5 23" />
          <path d="M20 23H25.5" />
        </g>
      )}
      {kind === 'box' && (
        <g stroke={strokeColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9L30 14.5V25.5L20 31L10 25.5V14.5L20 9Z" />
          <path d="M10 14.5L20 20L30 14.5" />
          <path d="M20 20V31" />
        </g>
      )}
      {kind === 'shield' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9L29 12.5V20C29 25.5 25 29.2 20 31.5C15 29.2 11 25.5 11 20V12.5L20 9Z" />
          <path d="M16.5 20L19 22.5L24 17.5" />
        </g>
      )}
      {kind === 'repeat' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M26 12L29.5 15.5L26 19" />
          <path d="M11.5 19V17.5C11.5 16.4 12.4 15.5 13.5 15.5H29.5" />
          <path d="M14 28L10.5 24.5L14 21" />
          <path d="M28.5 21V22.5C28.5 23.6 27.6 24.5 26.5 24.5H10.5" />
        </g>
      )}
      {kind === 'cpu' && (
        <g stroke={strokeColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="13" y="13" width="14" height="14" rx="2" />
          <rect x="17" y="17" width="6" height="6" />
          <path d="M17 9.5V13M23 9.5V13M17 27V30.5M23 27V30.5M9.5 17H13M9.5 23H13M27 17H30.5M27 23H30.5" />
        </g>
      )}
      {kind === 'cube' && (
        <g stroke={strokeColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="11" y="11" width="12" height="12" rx="1.5" />
          <rect x="17" y="17" width="12" height="12" rx="1.5" />
          <path d="M11 11L17 17M23 11L29 17M11 23L17 29" />
        </g>
      )}
      {kind === 'flame' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 9.5C21.5 14 27.5 16 27.5 22.5C27.5 27 24.2 30.5 20 30.5C15.8 30.5 12.5 27 12.5 22.2C12.5 18.8 14.5 16.2 16.5 14.5C16.3 17 17.8 18.5 19.2 18.5C18.8 15 19.2 11.8 20.5 9.5Z" />
        </g>
      )}
      {kind === 'crown' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 27.5H29.5L31 15L24.5 19.5L20 12.5L15.5 19.5L9 15L10.5 27.5Z" />
        </g>
      )}
      {kind === 'swords' && (
        <g stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 29L28 12M24 11H29V16" />
          <path d="M29 29L12 12M16 11H11V16" />
        </g>
      )}
    </svg>
  );
};

export const VoxelBrandMark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true" className="shrink-0">
    {/* Isometric Voxel Grass + Gold Core */}
    <path d="M18 3L32 10.5L18 18L4 10.5L18 3Z" fill="#3FA35B" />
    <path d="M4 10.5L18 18V33L4 25.5V10.5Z" fill="#2F7D46" />
    <path d="M32 10.5L18 18V33L32 25.5V10.5Z" fill="#173B2B" />
    <path d="M18 8L25 11.7L18 15.4L11 11.7L18 8Z" fill="#F5C451" />
  </svg>
);

interface AvatarImageProps {
  avatarId: string;
  sizeClass?: string;
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  avatarId,
  sizeClass = 'w-12 h-12',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const avatar = getCharacterById(avatarId);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-emerald-900/20 dark:border-emerald-400/20 flex items-center justify-center bg-[#1D3529] shrink-0 ${sizeClass} ${className}`}
    >
      {!imgFailed ? (
        <img
          src={avatar.previewUrl}
          alt={`${avatar.name} voxel character`}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain p-0.5 select-none"
          loading="lazy"
        />
      ) : (
        <svg viewBox="0 0 40 40" className="w-4/5 h-4/5" aria-hidden="true">
          <rect x="10" y="6" width="20" height="16" rx="2" fill={avatar.accentHex} />
          <rect x="14" y="12" width="4" height="4" fill="#173B2B" />
          <rect x="22" y="12" width="4" height="4" fill="#173B2B" />
          <rect x="12" y="23" width="16" height="13" rx="2" fill="#2F7D46" />
        </svg>
      )}
    </div>
  );
};
