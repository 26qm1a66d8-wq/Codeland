import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Code2, ScrollText, Star, Swords } from 'lucide-react';
import { formatLocalDateKey } from '../../lib/dateUtils';

interface DailyQuestsBoardProps {
  lessonDone: boolean;
  missionDone: boolean;
  exercisesCount: number;
  dailyXp: number;
  lastDailyKey: string;
  onStartLesson: () => void;
  onStartMission: () => void;
  onOpenPractice: () => void;
  onOpenAcademy: () => void;
}

interface QuestRowSpec {
  id: string;
  title: string;
  current: number;
  target: number;
  rewardLabel: string;
  completed: boolean;
  icon: React.ReactNode;
  onAction: () => void;
}

export const DailyQuestsBoard: React.FC<DailyQuestsBoardProps> = ({
  lessonDone,
  missionDone,
  exercisesCount,
  dailyXp,
  lastDailyKey,
  onStartLesson,
  onStartMission,
  onOpenPractice,
  onOpenAcademy,
}) => {
  const todayKey = formatLocalDateKey();
  const earnedTodayXp = lastDailyKey === todayKey ? Math.max(0, dailyXp) : 0;
  const clampedEx = Math.min(3, Math.max(0, exercisesCount));
  const clampedXp = Math.min(50, earnedTodayXp);

  const quests: QuestRowSpec[] = [
    {
      id: 'quest-lesson',
      title: 'Complete 1 Java Lesson',
      current: lessonDone ? 1 : 0,
      target: 1,
      rewardLabel: '+25 XP',
      completed: lessonDone,
      icon: <BookOpen className="w-4 h-4 text-sky-300" />,
      onAction: onStartLesson,
    },
    {
      id: 'quest-mission',
      title: 'Finish 1 Adventure Mission',
      current: missionDone ? 1 : 0,
      target: 1,
      rewardLabel: '+25 XP',
      completed: missionDone,
      icon: <Swords className="w-4 h-4 text-amber-300" />,
      onAction: onStartMission,
    },
    {
      id: 'quest-practice',
      title: 'Complete 3 Practice Exercises',
      current: clampedEx,
      target: 3,
      rewardLabel: '+25 XP',
      completed: clampedEx >= 3,
      icon: <Code2 className="w-4 h-4 text-cyan-300" />,
      onAction: onOpenPractice,
    },
    {
      id: 'quest-xp50',
      title: 'Earn 50 XP Today',
      current: clampedXp,
      target: 50,
      rewardLabel: 'Goal Milestone',
      completed: earnedTodayXp >= 50,
      icon: <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />,
      onAction: onStartLesson,
    },
  ];

  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <section
      aria-label="Today's Java Quests"
      className="rounded-2xl overflow-hidden border border-amber-500/40 bg-[#1B1633] shadow-lg"
    >
      {/* Fantasy Timber & Brass Quest Board Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#5C3419] via-[#713F12] to-[#5C3419] border-b border-amber-400/35 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#3E2210] border border-amber-400/45 flex items-center justify-center shrink-0">
            <ScrollText className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] leading-tight truncate">
              Today&apos;s Quests
            </h2>
            <p className="text-[11px] font-mono tabular-nums text-amber-200/85">
              {completedCount} / {quests.length} Completed
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAcademy}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FDE68A] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quest Rows */}
      <div className="p-3 space-y-2">
        {quests.map((quest) => {
          const pct = Math.min(100, Math.round((quest.current / quest.target) * 100));
          return (
            <button
              key={quest.id}
              type="button"
              onClick={quest.onAction}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                quest.completed
                  ? 'bg-[#102A29] border-emerald-400/40 hover:border-emerald-300/70'
                  : 'bg-[#131B3E] border-indigo-400/20 hover:border-violet-400/55 hover:bg-[#192350]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-[#0B1026] border border-indigo-400/25 flex items-center justify-center shrink-0">
                  {quest.icon}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#F8FAFC] truncate">
                      {quest.title}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-amber-300 shrink-0">
                      {quest.rewardLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[#090D20] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          quest.completed
                            ? 'bg-gradient-to-r from-[#10B981] to-[#34D399]'
                            : 'bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-300 shrink-0">
                      {quest.current} / {quest.target}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                  quest.completed
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-[#6D28D9] text-white'
                }`}
              >
                {quest.completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
