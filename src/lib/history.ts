// Recent checks live in the visitor's own browser: free, private, and no account needed.
// Every access is wrapped because storage can be blocked or full.
export type HistoryItem = { q: string; label: string; share: string; ts: number };

const KEY = 'verify-news-history-v1';
const MAX = 8;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((i) => i && typeof i.q === 'string' && typeof i.share === 'string' && typeof i.label === 'string')
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveToHistory(item: HistoryItem) {
  try {
    const next = [item, ...loadHistory().filter((i) => i.q !== item.q)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: history is a convenience, so ignore.
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
