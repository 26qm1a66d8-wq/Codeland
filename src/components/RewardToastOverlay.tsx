import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const RewardToastOverlay: React.FC = () => {
  const { notifications, dismissNotification } = usePlayer();

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-[#F5C451]/45 bg-[#173B2B] text-stone-100 shadow-xl"
        >
          <div className="p-2 rounded-lg bg-[#2F7D46]/40 text-[#F5C451] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm font-bold text-white leading-snug">{notif.title}</div>
            <p className="text-xs text-emerald-100/85 leading-relaxed">{notif.subtitle}</p>
            {(notif.xpDelta || notif.coinsDelta) && (
              <div className="text-xs font-mono tabular-nums text-[#F5C451] pt-0.5">
                {notif.xpDelta ? `+${notif.xpDelta} XP` : ''}
                {notif.xpDelta && notif.coinsDelta ? ' · ' : ''}
                {notif.coinsDelta ? `+${notif.coinsDelta} Coins` : ''}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissNotification(notif.id)}
            className="p-1 text-emerald-200/70 hover:text-white cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
