import React from 'react';
import { ArrowRight, BookOpen, Star, Swords, Scroll } from 'lucide-react';
import { formatLocalDateKey } from '../../lib/dateUtils';

interface ParchmentQuestsBoardProps {
  lessonDone: boolean;
  missionDone: boolean;
  dailyXp: number;
  lastDailyKey: string;
  onStartLesson: () => void;
  onStartMission: () => void;
  onViewAll?: () => void;
}

export const ParchmentQuestsBoard: React.FC<ParchmentQuestsBoardProps> = ({
  lessonDone,
  missionDone,
  dailyXp,
  lastDailyKey,
  onStartLesson,
  onStartMission,
  onViewAll,
}) => {
  const todayKey = formatLocalDateKey();
  const earnedTodayXp = lastDailyKey === todayKey ? Math.max(0, dailyXp) : 0;
  const clampedXp = Math.min(50, earnedTodayXp);
  const xpPct = Math.round((clampedXp / 50) * 100);

  const quests = [
    {
      id: 'q-lesson',
      title: 'Complete 1 Java Lesson',
      current: lessonDone ? 1 : 0,
      target: 1,
      completed: lessonDone,
      icon: <BookOpen className="w-4 h-4 text-cyan-300" />,
      onAction: onStartLesson,
    },
    {
      id: 'q-mission',
      title: 'Finish 1 Coding Mission',
      current: missionDone ? 1 : 0,
      target: 1,
      completed: missionDone,
      icon: <Swords className="w-4 h-4 text-amber-300" />,
      onAction: onStartMission,
    },
    {
      id: 'q-xp',
      title: 'Earn 50 XP',
      current: clampedXp,
      target: 50,
      completed: earnedTodayXp >= 50,
      hasBar: true,
      progressPct: xpPct,
      icon: <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />,
      onAction: onStartLesson,
    },
  ];

  return (
    <section
      aria-label="Today's Quests Board"
      className="relative rounded-2xl overflow-hidden shadow-2xl border border-indigo-500/30 bg-gradient-to-b from-[#131A3A] via-[#0E142F] to-[#0A0E23]"
    >
      {/* Subtle runic background sheen */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.15),transparent_60%)] pointer-events-none" />

      {/* Carved stone & timber header (Synced with game palette, NO reddish/yellow clash) */}
      <div className="relative px-4 py-3 flex items-center justify-between border-b border-indigo-500/20 bg-[#172044]/75 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          {/* Enchanted Ancient Scroll Badge (matching reference image) */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Scroll className="w-4 h-4 text-amber-300" />
          </div>
          <h2 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
            Today&apos;s Quests
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll || onStartLesson}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer group"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Quest items list in cosmic twilight slate rows */}
      <div className="relative p-3 sm:p-3.5 space-y-2.5">
        {quests.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#182142]/85 hover:bg-[#1E2954]/90 text-white shadow-md border border-indigo-400/20 transition-all duration-150"
          >
            {/* Left: Quest Icon + Title + Progress */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[#0F1633] border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
                {q.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-100 truncate">{q.title}</div>
                {q.hasBar && (
                  <div className="w-full h-1.5 bg-[#090D22] rounded-full overflow-hidden mt-1.5 border border-indigo-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                      style={{ width: `${q.progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Count metric */}
            <div className="font-mono text-xs font-bold text-cyan-200 shrink-0 tabular-nums px-1.5 py-0.5 rounded bg-[#0D142E]/70 border border-indigo-500/20">
              {q.current} / {q.target}
            </div>

            {/* Right: Purple Action Button with right arrow */}
            <button
              type="button"
              onClick={q.onAction}
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-105 cursor-pointer shadow-md ${
                q.completed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7E22CE] text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]'
              }`}
              title={q.completed ? 'Completed' : 'Go to quest'}
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
