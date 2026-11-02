import test from 'node:test';
import assert from 'node:assert/strict';
import {eventDate, filterPRs, summarize, byRepo, monthlyEvents, contributionDays, isValidSnapshot} from '../dashboard/model.mjs';
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
