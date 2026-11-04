// Pure selectors for real GitHub data; shared by the UI and dependency-free tests.
export const STATES = ['open', 'merged', 'closed'];

// A small, explicit presentation taxonomy for browsing projects, not a measure
// of the contributor's skills or an inference about every PR in a repository.
const REPOSITORY_TOPICS = Object.freeze({
  'bytedance/deer-flow': 'agent',
  'qwenlm/qwen-code': 'agent',
  'anomalyco/opencode': 'agent',
  'opensandbox-group/opensandbox': 'agent',
  'akitaonrails/ai-memory': 'agent',
  'nevamind-ai/memu': 'agent',
  'plastic-labs/honcho': 'agent',
  'gepa-ai/gepa': 'agent',
  'google-research/rrsi': 'agent',
  'google-research/harness2': 'agent',
  'earendil-works/pi': 'agent',
  'voltagent/voltagent': 'agent',
  'exa-labs/exa-py': 'agent',
  'tavily-ai/tavily-python': 'agent',
  'xerj-org/xerj': 'mcp',
  'modelcontextprotocol/servers': 'mcp',
  'modelcontextprotocol/python-sdk': 'mcp',
  'modelcontextprotocol/typescript-sdk': 'mcp',
  'assistant-ui/assistant-ui': 'fullstack',
  'tambo-ai/tambo': 'fullstack',
  'ag-ui-protocol/ag-ui': 'fullstack',
  'copilotkit/copilotkit': 'fullstack',
});

export function repositoryTopic(repo) {
  return REPOSITORY_TOPICS[String(repo || '').toLowerCase()] || 'other';
}

export function eventDate(pr) {
  if (pr.state === 'merged') return pr.mergedAt || pr.closedAt || pr.createdAt;
  return pr.state === 'closed' ? (pr.closedAt || pr.createdAt) : pr.createdAt;
}

export function filterPRs(prs, {
  state = 'all', repo = 'all', window = 'all', now = Date.now(),
  topic = 'all', query = '', day = '', month = '',
} = {}) {
  const cutoff = window === '90' ? now - 90 * 86400000 : window === '365' ? now - 365 * 86400000 : -Infinity;
  const search = String(query || '').trim().toLowerCase();
  return prs.filter(p => {
    const timestamp = Date.parse(eventDate(p));
    // Calendar selections use the same current-state event as the timeline,
    // normalized to UTC rather than the visitor's local timezone.
    const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
    const searchable = `${p.repo || ''} ${p.title || ''} ${p.number == null ? '' : `#${p.number}`}`.toLowerCase();
    return (state === 'all' || p.state === state)
      && (repo === 'all' || p.repo === repo)
      && (topic === 'all' || repositoryTopic(p.repo) === topic)
      && (!search || searchable.includes(search))
      && (!day || date === day)
      && (!month || date.slice(0, 7) === month)
      && (timestamp || 0) >= cutoff;
  });
}

export function sortPRs(prs, mode = 'recent') {
  const byTime = (a, b) => {
    const left = Date.parse(eventDate(a));
    const right = Date.parse(eventDate(b));
    // Missing timestamps remain last in either direction.
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
    if (!Number.isFinite(right)) return -1;
    return mode === 'oldest' ? left - right : right - left;
  };
  return [...prs].sort((a, b) => mode === 'repo'
    ? a.repo.toLowerCase().localeCompare(b.repo.toLowerCase()) || byTime(a, b)
    : byTime(a, b));
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
