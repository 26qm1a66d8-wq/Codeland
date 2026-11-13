export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayLocalKey(baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
  return formatLocalDateKey(d);
}

export function getIsoWeekKey(date: Date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function parseLocalDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function diffCalendarDays(earlierKey: string, laterKey: string): number {
  const a = parseLocalDateKey(earlierKey);
  const b = parseLocalDateKey(laterKey);
  if (!a || !b) return 999;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Returns the accurate streak to display right now without modifying stored state simply by visiting.
 * If lastActivityDate is neither today nor yesterday, the active streak has lapsed to 0.
 */
export function computeEffectiveStreak(storedStreak: number, lastActivityDate: string, now: Date = new Date()): number {
  if (!lastActivityDate || storedStreak <= 0) return 0;
  const today = formatLocalDateKey(now);
  if (lastActivityDate === today) return storedStreak;
  const yesterday = getYesterdayLocalKey(now);
  if (lastActivityDate === yesterday) return storedStreak;
  return 0;
}

/**
 * Computes updated streak state when a qualifying learning activity is completed today.
 * Never increments more than once per local calendar day.
 */
export function computeStreakAfterQualifyingActivity(
  storedStreak: number,
  longestStreak: number,
  lastActivityDate: string,
  activityDates: string[],
  now: Date = new Date()
): {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  activityDates: string[];
  incrementedToday: boolean;
} {
  const today = formatLocalDateKey(now);
  const yesterday = getYesterdayLocalKey(now);

  const nextDates = activityDates.includes(today)
    ? activityDates.slice(-89)
    : [...activityDates.slice(-88), today];

  if (lastActivityDate === today) {
    return {
      currentStreak: Math.max(1, storedStreak),
      longestStreak: Math.max(longestStreak, storedStreak, 1),
      lastActivityDate: today,
      activityDates: nextDates,
      incrementedToday: false,
    };
  }

  const nextCurrent = lastActivityDate === yesterday ? Math.max(1, storedStreak) + 1 : 1;
  const nextLongest = Math.max(longestStreak, nextCurrent);

  return {
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastActivityDate: today,
    activityDates: nextDates,
    incrementedToday: true,
  };
}

export function getLastNDaysCalendar(
  daysCount: number,
  activityDates: string[],
  now: Date = new Date()
): { dateKey: string; dayLabel: string; shortDate: string; active: boolean; isToday: boolean }[] {
  const activeSet = new Set(activityDates);
  const todayKey = formatLocalDateKey(now);
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = formatLocalDateKey(d);
    result.push({
      dateKey: key,
      dayLabel: weekdayNames[d.getDay()],
      shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      active: activeSet.has(key),
      isToday: key === todayKey,
    });
  }
  return result;
}

export function computePlayerLevelFromXp(xp: number): {
  level: number;
  rankTitle: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const thresholds = [
    { level: 1, xp: 0, title: 'Novice Explorer' },
    { level: 2, xp: 120, title: 'Syntax Scout' },
    { level: 3, xp: 280, title: 'Forest Pathfinder' },
    { level: 4, xp: 500, title: 'Variable Ranger' },
    { level: 5, xp: 800, title: 'Crystal Keeper' },
    { level: 6, xp: 1200, title: 'Logic Knight' },
    { level: 7, xp: 1700, title: 'Royal Strategist' },
    { level: 8, xp: 2300, title: 'Loop Engineer' },
    { level: 9, xp: 3000, title: 'Mountain Automator' },
    { level: 10, xp: 3800, title: 'Method Architect' },
    { level: 11, xp: 4700, title: 'Metro Commander' },
    { level: 12, xp: 5700, title: 'Object Guardian' },
    { level: 13, xp: 6800, title: 'Citadel Scholar' },
    { level: 14, xp: 8000, title: 'Core Restorer' },
    { level: 15, xp: 9500, title: 'CODELAND Java Champion' },
  ];

  let current = thresholds[0];
  let next = thresholds[1];

  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i].xp) {
      current = thresholds[i];
      next = thresholds[i + 1] ?? {
        level: thresholds[i].level + Math.floor((xp - thresholds[i].xp) / 1000) + 1,
        xp: thresholds[i].xp + (Math.floor((xp - thresholds[i].xp) / 1000) + 1) * 1000,
        title: 'CODELAND Grand Legend',
      };
    }
  }

  const span = Math.max(1, next.xp - current.xp);
  const intoLevel = Math.max(0, xp - current.xp);
  const progressPercent = Math.min(100, Math.round((intoLevel / span) * 100));

  return {
    level: current.level,
    rankTitle: current.title,
    currentLevelXp: intoLevel,
    nextLevelXp: span,
    progressPercent,
  };
}

export function getEncouragingStreakMessage(streakDays: number): {
  headline: string;
  encouragement: string;
} {
  if (streakDays <= 0) {
    return {
      headline: 'Ignite Day 1 Today!',
      encouragement:
        'Every Java master started with Day 1. Complete a quick lesson or practice puzzle today to light your streak flame!',
    };
  }
  if (streakDays === 1) {
    return {
      headline: 'Day 1 Spark Lit!',
      encouragement:
        'Great start! Log in again tomorrow to turn today’s spark into a consecutive daily coding habit.',
    };
  }
  if (streakDays === 2) {
    return {
      headline: '2 Days in a Row!',
      encouragement:
        'You are building momentum—show up tomorrow to unlock your 3-Day Starter Badge (+30 XP)!',
    };
  }
  if (streakDays < 7) {
    return {
      headline: `${streakDays}-Day Momentum Strong!`,
      encouragement: `Awesome consistency! Just ${
        7 - streakDays
      } more consecutive day${7 - streakDays === 1 ? '' : 's'} to earn the Seven-Day Scholar badge.`,
    };
  }
  if (streakDays < 14) {
    return {
      headline: `${streakDays} Consecutive Days!`,
      encouragement:
        'A full week+ of Java practice! Your brain is wiring real programming muscle memory—keep the flame alive.',
    };
  }
  if (streakDays < 30) {
    return {
      headline: `${streakDays}-Day Coding Discipline!`,
      encouragement:
        'Unstoppable dedication! Daily repetition is the secret superpower of great software engineers.',
    };
  }
  return {
    headline: `${streakDays}-Day CODELAND Legend!`,
    encouragement:
      'Extraordinary habit mastery! Your daily Java streak inspires explorers across every voxel world.',
  };
}

export function getNextStreakMilestone(streakDays: number): {
  targetDays: number;
  progressPercent: number;
  daysRemaining: number;
} {
  const milestones = [3, 7, 14, 30, 60, 100];
  const next = milestones.find((m) => streakDays < m) ?? Math.ceil((streakDays + 1) / 50) * 50;
  const pct = Math.min(100, Math.round((Math.max(0, streakDays) / next) * 100));
  return {
    targetDays: next,
    progressPercent: pct,
    daysRemaining: Math.max(0, next - streakDays),
  };
}

