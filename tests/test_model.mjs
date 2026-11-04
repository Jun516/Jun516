import test from 'node:test';
import assert from 'node:assert/strict';
import {eventDate, filterPRs, sortPRs, repositoryTopic, summarize, byRepo, monthlyEvents, contributionDays, isValidSnapshot} from '../dashboard/model.mjs';
const prs = [
 {state:'open',repo:'a/b',createdAt:'2026-10-31T00:00:00Z',url:'https://github.com/a/b/pull/1',title:'a'},
 {state:'merged',repo:'a/b',createdAt:'2025-01-01T00:00:00Z',mergedAt:'2026-10-30T00:00:00Z',url:'https://github.com/a/b/pull/2',title:'b'},
 {state:'closed',repo:'c/d',createdAt:'2025-01-01T00:00:00Z',closedAt:'2026-01-01T00:00:00Z',url:'https://github.com/c/d/pull/1',title:'c'}
];
test('keeps merged/unmerged distinct', () => assert.deepEqual(summarize(prs),{all:3,open:1,merged:1,closed:1}));
test('filters by event time not old original submission', () => assert.equal(filterPRs(prs,{window:'90',now:Date.parse('2026-11-02T00:00:00Z')}).length,2));
test('repo and state selectors combine', () => assert.deepEqual(filterPRs(prs,{repo:'a/b',state:'merged'}).map(x=>x.title),['b']));
test('event date for merged is merging date', () => assert.equal(eventDate(prs[1]),prs[1].mergedAt));
test('groups upstream repo correctly', () => assert.equal(byRepo(prs)[0].merged,1));
test('calendar slices chronologically', () => assert.deepEqual(contributionDays([{date:'2026-11-02',count:2},{date:'2026-11-01',count:1}],1),[{date:'2026-11-02',count:2}]));
test('monthly event bucket', () => assert.equal(monthlyEvents(prs,3,new Date('2026-11-02'))[1].merged,1));
test('validates snapshot', () => assert.ok(isValidSnapshot({schemaVersion:1,user:'Jun516',prs,repos:[],calendar:[]})));

const explorerPRs = [
  {state:'merged',repo:'bytedance/deer-flow',number:91,title:'Preserve sandbox authorization',createdAt:'2025-01-01T00:00:00Z',mergedAt:'2026-11-03T23:30:00-02:00'},
  {state:'open',repo:'bytedance/deer-flow',number:92,title:'Improve sandbox diagnostics',createdAt:'2026-11-03T23:45:00Z'},
  {state:'closed',repo:'xerj-org/xerj',number:93,title:'Reject invalid MCP input',createdAt:'2026-09-01T00:00:00Z',closedAt:'2026-11-04T00:05:00Z'},
  {state:'merged',repo:'assistant-ui/assistant-ui',number:94,title:'Keep chat actions accessible',createdAt:'2026-10-01T00:00:00Z',mergedAt:'2026-10-31T20:00:00Z'},
];

test('project categories are explicit, case-insensitive and have an other fallback', () => {
  assert.equal(repositoryTopic('QwenLM/qwen-code'), 'agent');
  assert.equal(repositoryTopic('XERJ-ORG/XERJ'), 'mcp');
  assert.equal(repositoryTopic('assistant-ui/assistant-ui'), 'fullstack');
  assert.equal(repositoryTopic('unmapped/project'), 'other');
});

test('calendar day uses UTC current-state events, not the creation day', () => {
  assert.deepEqual(filterPRs(explorerPRs,{day:'2026-11-04'}).map(p=>p.number),[91,93]);
  assert.deepEqual(filterPRs(explorerPRs,{day:'2026-11-03'}).map(p=>p.number),[92]);
  assert.equal(filterPRs(explorerPRs,{day:'2025-01-01'}).length,0);
});

test('month selection follows the same event dates as the timeline and day selection', () => {
  assert.deepEqual(filterPRs(explorerPRs,{month:'2026-10'}).map(p=>p.number),[94]);
  assert.deepEqual(filterPRs(explorerPRs,{month:'2026-11',day:'2026-11-04'}).map(p=>p.number),[91,93]);
  assert.equal(filterPRs(explorerPRs,{month:'2026-10',day:'2026-11-04'}).length,0);
});

test('search finds title, repository and PR number without case or surrounding-space sensitivity', () => {
  assert.deepEqual(filterPRs(explorerPRs,{query:'  AUTHORIZATION  '}).map(p=>p.number),[91]);
  assert.deepEqual(filterPRs(explorerPRs,{query:'XERJ-ORG/XERJ'}).map(p=>p.number),[93]);
  assert.deepEqual(filterPRs(explorerPRs,{query:'#94'}).map(p=>p.number),[94]);
  assert.equal(filterPRs(explorerPRs,{query:'no such contribution'}).length,0);
});

test('topic, search, date, repository, state and rolling-window filters combine', () => {
  const filters={topic:'agent',query:'sandbox',month:'2026-11',day:'2026-11-04',repo:'bytedance/deer-flow',state:'merged',window:'90',now:Date.parse('2026-11-04T12:00:00Z')};
  assert.deepEqual(filterPRs(explorerPRs,filters).map(p=>p.number),[91]);
  assert.equal(filterPRs(explorerPRs,{...filters,topic:'mcp'}).length,0);
  assert.deepEqual(filterPRs(explorerPRs,{topic:'fullstack'}).map(p=>p.number),[94]);
});

test('sorting uses current-state event time in both directions and can group repositories', () => {
  assert.deepEqual(sortPRs(explorerPRs).map(p=>p.number),[91,93,92,94]);
  assert.deepEqual(sortPRs(explorerPRs,'oldest').map(p=>p.number),[94,92,93,91]);
  assert.deepEqual(sortPRs(explorerPRs,'repo').map(p=>p.number),[94,91,92,93]);
});

test('selectors return new arrays without mutating records or source order', () => {
  const source=Object.freeze(explorerPRs.map(p=>Object.freeze({...p})));
  assert.notEqual(sortPRs(source),source);
  assert.notEqual(filterPRs(source),source);
  assert.deepEqual(source.map(p=>p.number),[91,92,93,94]);
  assert.equal(sortPRs(source)[0],source[0]);
});

test('missing timestamps cannot match a date and sort after known events in either direction', () => {
  const missing={state:'open',repo:'unknown/repo',title:'No date',number:95};
  const source=[missing,explorerPRs[0]];
  assert.equal(filterPRs(source,{day:'2026-11-04'}).length,1);
  assert.equal(sortPRs(source).at(-1),missing);
  assert.equal(sortPRs(source,'oldest').at(-1),missing);
});
