/**
 * Utility functions for sanitizing and formatting user names & initials cleanly.
 */

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deduplicates repeated full names (e.g. "Merzak SaiMerzak Sai" or "Merzak Sai Merzak Sai" -> "Merzak Sai")
 */
export function formatCleanName(name) {
  if (!name) return '—';
  let str = String(name).trim();

  // 1. Check for repeated candidate phrase (e.g. "Merzak SaiMerzak Sai", "Merzak Sai Merzak Sai")
  const len = str.length;
  for (let i = Math.floor(len / 2); i >= 2; i--) {
    const candidate = str.substring(0, i).trim();
    if (candidate.length < 2) continue;
    try {
      const regex = new RegExp(`^(${escapeRegExp(candidate)}\\s*)+$`, 'i');
      if (regex.test(str)) {
        return candidate;
      }
    } catch (e) {
      // fallback if regex fails
    }
  }

  // 2. Check for repeated word tokens (e.g. "Merzak Sai Merzak Sai")
  const words = str.split(/\s+/);
  if (words.length >= 2) {
    const half = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half, half * 2).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      return firstHalf;
    }
  }

  return str;
}

/**
 * Returns crisp 1 or 2 letter initials for avatar circles (e.g. "Merzak Sai" -> "MS", "Salem" -> "SA")
 */
export function getInitials(name) {
  const clean = formatCleanName(name);
  if (!clean || clean === '—') return '?';
  const parts = clean.trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstInitial = parts[0][0] || '';
    const lastInitial = parts[parts.length - 1][0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  }
  return clean.substring(0, Math.min(2, clean.length)).toUpperCase();
}
