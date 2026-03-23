/**
 * Get next Sunday 21:00 Jakarta (WIB). Jakarta = UTC+7, so 21:00 WIB = 14:00 UTC.
 * Draw window: Sunday 14:00–17:00 UTC (21:00–00:00 WIB).
 * During the window the countdown is zero → Lucky Shake unlocks.
 * After 17:00 UTC Sunday, countdown resets to next Sunday.
 */
export function getNextDrawTime(): Date {
  const now = new Date();
  const day = now.getUTCDay();   // 0 = Sunday
  const hour = now.getUTCHours();

  let daysToAdd = (7 - day) % 7;

  // On Sunday: only jump to next week AFTER the 3-hour draw window (≥17:00 UTC)
  // Between 14:00–16:59 UTC the target date stays in the past → diff ≤ 0 → zeros → shake unlocked
  if (daysToAdd === 0 && hour >= 17) {
    daysToAdd = 7;
  }

  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + daysToAdd);
  next.setUTCHours(14, 0, 0, 0);
  return next;
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

const DEFAULT_COUNTDOWN: CountdownParts = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export function getCountdownParts(): CountdownParts {
  try {
    const diff = getNextDrawTime().getTime() - Date.now();
    if (diff <= 0) return DEFAULT_COUNTDOWN;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  } catch {
    return DEFAULT_COUNTDOWN;
  }
}

export function pad(count: number): string {
  return String(count).padStart(2, "0");
}
