/**
 * Format a timestamp as relative time: "Just now", "5 min ago", "2h ago", etc.
 * Returns empty string if no valid timestamp.
 */
export function formatRelativeTime(createdAt: string | undefined | null): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/** Returns true if deal is older than 24 hours (for fade/priority) */
export function isOlderThan24h(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false;
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return now.getTime() - date.getTime() > 24 * 60 * 60 * 1000;
}
