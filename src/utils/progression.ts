import { RankTitle, StudyParticipant } from '../types/studyble';

export const POINTS_PER_LEVEL = 10;
export const PRIVATE_HELP_REWARD_POINTS = 3;
export const QNA_VERIFIED_ANSWER_POINTS = 1;
export const PRIVATE_CHAT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const DAILY_VERIFIED_LIMIT_LOW_LEVEL = 2;
export const DAILY_LIMIT_MIN_LEVEL = 1;
export const DAILY_LIMIT_MAX_LEVEL = 10;

export type VerificationOutcomeReason =
  | 'ok'
  | 'cooldown'
  | 'daily_limit'
  | 'already_verified';

export interface VerificationResult {
  awarded: boolean;
  reason: VerificationOutcomeReason;
  remainingMs: number;
  todayCount: number;
}

export function getLocalDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSubjectToDailyVerifiedCap(level: number): boolean {
  return level >= DAILY_LIMIT_MIN_LEVEL && level <= DAILY_LIMIT_MAX_LEVEL;
}

export function getTodayVerifiedCount(
  dailyVerifiedDate: string,
  dailyVerifiedCount: number,
  now: Date = new Date()
): number {
  if (dailyVerifiedDate !== getLocalDateKey(now)) {
    return 0;
  }
  return Number.isFinite(dailyVerifiedCount)
    ? Math.max(0, Math.floor(dailyVerifiedCount))
    : 0;
}

export interface ProgressionInfo {
  level: number;
  rankTitle: RankTitle;
  pointsInCurrentLevel: number;
  pointsToNextLevel: number;
  progressPercent: number;
  nextRankHint: string;
}

/**
 * Level formula:
 * - Every 10 points = +1 Level (0-9 pts -> Lv 0, 10-19 pts -> Lv 1, etc.)
 * - 0-9 pts: Pelajar
 * - 10-100 pts (up to 109 pts): Helper
 * - 110+ pts: Pro Helper
 */
export function getProgressionInfo(rawPoints: number): ProgressionInfo {
  const points = Math.max(0, Math.floor(rawPoints));
  const level = Math.floor(points / POINTS_PER_LEVEL);
  const pointsInCurrentLevel = points % POINTS_PER_LEVEL;
  const pointsToNextLevel = POINTS_PER_LEVEL - pointsInCurrentLevel;
  const progressPercent = (pointsInCurrentLevel / POINTS_PER_LEVEL) * 100;

  let rankTitle: RankTitle = 'Pelajar';
  let nextRankHint = `${Math.max(0, 10 - points)} pts to reach Helper`;

  if (points >= 110) {
    rankTitle = 'Pro Helper';
    nextRankHint = 'Highest peer rank unlocked';
  } else if (points >= 10) {
    rankTitle = 'Helper';
    nextRankHint = `${Math.max(0, 110 - points)} pts to reach Pro Helper`;
  }

  return {
    level,
    rankTitle,
    pointsInCurrentLevel,
    pointsToNextLevel,
    progressPercent,
    nextRankHint,
  };
}

export function getPeerCooldownRemainingMs(
  cooldowns: Record<string, number>,
  peerId: string,
  now: number = Date.now()
): number {
  const lastRewardAt = cooldowns[peerId];
  if (typeof lastRewardAt !== 'number' || !Number.isFinite(lastRewardAt)) {
    return 0;
  }
  const elapsed = now - lastRewardAt;
  return Math.max(0, PRIVATE_CHAT_COOLDOWN_MS - elapsed);
}

export function formatCooldownRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'Available now';
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export function sortParticipantsByWeeklyContribution(
  participants: StudyParticipant[]
): StudyParticipant[] {
  return [...participants].sort((a, b) => {
    if (b.weeklyHelpfulCount !== a.weeklyHelpfulCount) {
      return b.weeklyHelpfulCount - a.weeklyHelpfulCount;
    }
    return b.level - a.level;
  });
}
