// Pure selectors for real GitHub data; shared by the UI and dependency-free tests.
export const STATES = ['open', 'merged', 'closed'];

export function eventDate(pr) {
  if (pr.state === 'merged') return pr.mergedAt || pr.closedAt || pr.createdAt;
  return pr.state === 'closed' ? (pr.closedAt || pr.createdAt) : pr.createdAt;
}

export function filterPRs(prs, {state = 'all', repo = 'all', window = 'all', now = Date.now()} = {}) {
  const cutoff = window === '90' ? now - 90 * 86400000 : window === '365' ? now - 365 * 86400000 : -Infinity;
  return prs.filter(p => (state === 'all' || p.state === state)
    && (repo === 'all' || p.repo === repo)
    && (Date.parse(eventDate(p)) || 0) >= cutoff);
}

export function summarize(prs) {
  return {all: prs.length, ...Object.fromEntries(STATES.map(s => [s, prs.filter(p => p.state === s).length]))};
}

export function byRepo(prs) {
  const grouped = new Map();
  for (const p of prs) {
    const r = grouped.get(p.repo) || {name: p.repo, all: 0, open: 0, merged: 0, closed: 0};
    r[p.state]++; r.all++;
    grouped.set(p.repo, r);
  }
  return [...grouped.values()].sort((a, b) => b.all - a.all || a.name.localeCompare(b.name));
}

export function monthlyEvents(prs, months = 8, now = new Date()) {
  const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const ticks = Array.from({length: months}, (_, i) => {
    const d = new Date(Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - months + i + 1, 1));
    return {month: d.toISOString().slice(0, 7), open: 0, merged: 0, closed: 0};
  });
  const indexed = new Map(ticks.map(t => [t.month, t]));
  for (const p of prs) {
    const m = (eventDate(p) || '').slice(0, 7);
    if (indexed.has(m)) indexed.get(m)[p.state]++;
  }
  return ticks;
}

export function contributionDays(calendar, length = 365) {
  return [...calendar].sort((a, b) => a.date.localeCompare(b.date)).slice(-length);
}

export function isValidSnapshot(s) {
  return s && s.schemaVersion === 1 && s.user === 'Jun516'
    && Array.isArray(s.prs) && Array.isArray(s.calendar) && Array.isArray(s.repos)
    && s.prs.every(p => STATES.includes(p.state) && p.url?.startsWith('https://github.com/')
      && typeof p.repo === 'string' && typeof p.title === 'string');
}
