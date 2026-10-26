import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { render } from './render-activity.mjs';

const base = { username: 'gabrielklengues', updatedAt: '2026-10-26T12:00:00Z', publicPullRequests: 0, publicMergedPullRequests: 0, publicRepositories: 2, contributions: 0, anonymousPrivateContributions: 0, period: { from: '2025-10-26T12:00:00Z', to: '2026-10-26T12:00:00Z' }, weeks: [] };
const day = (count, contributionLevel = 'NONE') => ({ date: '2026-10-26', weekday: 1, contributionCount: count, contributionLevel });

test('calendário vazio não inventa dias ou contribuições', () => {
  for (const compact of [false, true]) {
    const svg = render(base, { compact });
    assert.match(svg, /Nenhuma contribuição neste período/);
    assert.doesNotMatch(svg, /data-date=/);
    assert.match(svg, /0 contribuições nos últimos 12 meses/);
  }
});
test('um dia sem contribuições permanece plano e preserva a data', () => {
  const svg = render({ ...base, weeks: [{ contributionDays: [day(0)] }] });
  assert.equal((svg.match(/<polygon/g) || []).length, 1);
  assert.match(svg, /2026-10-26: 0 contribuições/);
  assert.match(svg, /data-count="0"/);
});
test('valores altos permanecem reais e a geometria é finita', () => {
  for (const compact of [false, true]) {
    const svg = render({ ...base, contributions: 1000000, weeks: [{ contributionDays: [day(1000000, 'FOURTH_QUARTILE')] }] }, { compact });
    assert.equal((svg.match(/<polygon/g) || []).length, 3);
    assert.match(svg, /1\.000\.000/);
    assert.match(svg, /2026-10-26: 1000000 contribuições/);
    assert.doesNotMatch(svg, /NaN|Infinity/);
  }
});
test('contagens inconsistentes e calendário inválido falham antes de salvar', () => {
  assert.throws(() => render({ ...base, publicPullRequests: null }));
  assert.throws(() => render({ ...base, publicMergedPullRequests: 1 }));
  assert.throws(() => render({ ...base, weeks: [{ contributionDays: [day(-1)] }] }));
  assert.throws(() => render({ ...base, weeks: [{ contributionDays: [{ ...day(0), weekday: 9 }] }] }));
});
test('snapshot real preserva todos os dias nas duas versões', async () => {
  const saved = JSON.parse(await readFile(new URL('../data/activity.json', import.meta.url), 'utf8'));
  const count = saved.weeks.reduce((total, week) => total + week.contributionDays.length, 0);
  for (const compact of [false, true]) assert.equal((render(saved, { compact }).match(/data-date=/g) || []).length, count);
});
test('tecnologias aparecem uma vez em stack e não aparecem em whoami', async () => {
  const names = ['Angular', 'React', 'Vue', 'C#', 'TypeScript', 'Node.js', 'PostgreSQL', 'MySQL', 'SQL Server', 'Redis', 'AWS'];
  for (const suffix of ['', '-mobile']) {
    const stack = await readFile(new URL(`../assets/stack${suffix}.svg`, import.meta.url), 'utf8');
    const labels = [...stack.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(match => match[1]);
    const profile = await readFile(new URL(`../assets/whoami${suffix}.svg`, import.meta.url), 'utf8');
    for (const name of names) {
      assert.equal(labels.filter(label => label === name).length, 1, name);
      assert.ok(!profile.includes(name), `whoami contém ${name}`);
    }
  }
});
