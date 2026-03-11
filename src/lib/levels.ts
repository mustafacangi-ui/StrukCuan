// Level thresholds: Level 1→0, 2→5, 3→15, 4→30, 5→60 receipts
export const LEVEL_THRESHOLDS = [0, 5, 15, 30, 60] as const;

export function getLevel(totalReceipts: number): number {
  if (totalReceipts >= 60) return 5;
  if (totalReceipts >= 30) return 4;
  if (totalReceipts >= 15) return 3;
  if (totalReceipts >= 5) return 2;
  return 1;
}

export function getLevelProgress(totalReceipts: number): {
  current: number;
  next: number;
  progress: number;
  receiptsToNext: number;
} {
  const level = getLevel(totalReceipts);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = level >= 5 ? 60 : LEVEL_THRESHOLDS[level];
  const progressInLevel = totalReceipts - currentThreshold;
  const receiptsNeededForNext = nextThreshold - currentThreshold;
  const progress = level >= 5 ? 100 : (progressInLevel / receiptsNeededForNext) * 100;
  return {
    current: level,
    next: level >= 5 ? level : level + 1,
    progress: Math.min(100, progress),
    receiptsToNext: level >= 5 ? 0 : nextThreshold - totalReceipts,
  };
}
