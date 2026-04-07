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

/**
 * Get next midnight in Jakarta time (Asia/Jakarta, UTC+7).
 * Lucky Shake resets once per calendar day at 00:00 Jakarta time.
 * Countdown always targets next Jakarta midnight.
 */
export function getNextJakartaMidnight(): Date {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get Jakarta components reliably
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0");
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  
  // Next midnight in Jakarta: (Jakarta Date + 1) at 00:00:00 Jakarta.
  // Since Jakarta is UTC+7, 00:00:00 Jakarta = 17:00:00 UTC of PREVIOUS DAY.
  // Calculation: Start with next day (Year, Month, Day + 1) in UTC and subtract 7 hours.
  const nextDayStartUtc = Date.UTC(year, month - 1, day + 1);
  const nextResetUtc = new Date(nextDayStartUtc - (7 * 60 * 60 * 1000));
  
  // Console logs as requested
  const jakartaNowString = formatter.format(now);
  const nextResetJakartaString = formatter.format(nextResetUtc);
  const remainingMs = nextResetUtc.getTime() - now.getTime();
  
  console.log('[LuckyShake/Time] Jakarta Diagnostic:', {
    currentJakartaTime: jakartaNowString,
    nextResetJakartaMidnight: nextResetJakartaString,
    remainingMs: remainingMs,
    remainingHours: (remainingMs / 3600000).toFixed(2)
  });

  return nextResetUtc;
}

export function getDailyShakeCountdownParts(): CountdownParts {
  try {
    const now = Date.now();
    const target = getNextJakartaMidnight().getTime();
    let diff = target - now;

    // Ensure max remaining time is never greater than 24 hours
    if (diff > 86400000) {
      console.warn('[LuckyShake/Time] Clamping countdown to 24h limit', { diff });
      diff = 86400000;
    }

    if (diff <= 0) return DEFAULT_COUNTDOWN;
    
    return {
      days: 0, // Requirement: Never show more than 00 days
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  } catch (err) {
    console.error("[LuckyShake/Time] Error calculating countdown:", err);
    return DEFAULT_COUNTDOWN;
  }
}

