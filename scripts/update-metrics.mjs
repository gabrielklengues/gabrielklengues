import { render } from './render-activity.mjs';
export { render };
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function github(path, body) {
  const response = await fetch(`https://api.github.com/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'gabrielklengues-profile',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`GitHub ${path.split('?')[0]}: HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
  if (result.incomplete_results) throw new Error('Busca incompleta. Preservando o último painel válido.');
  return result;
}

export async function collect(username) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error('Usuário inválido.');
  if (!process.env.GH_TOKEN) throw new Error('Defina GH_TOKEN ou execute o workflow do repositório.');
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const query = `query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        startedAt endedAt restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date weekday contributionCount contributionLevel } }
        }
      }
    }
  }`;
  // Public visibility is explicit: no names or details from private projects are exported.
  const [profile, prs, merged, graph] = await Promise.all([
    github(`users/${username}`),
    github(`search/issues?q=${encodeURIComponent(`author:${username} is:pr is:public`)}&per_page=1`),
    github(`search/issues?q=${encodeURIComponent(`author:${username} is:pr is:merged is:public`)}&per_page=1`),
    github('graphql', { query, variables: { login: username, from: start.toISOString(), to: end.toISOString() } })
  ]);
  const collection = graph.data?.user?.contributionsCollection;
  if (!collection) throw new Error('Calendário não retornado pelo GitHub.');
  return {
    username,
    updatedAt: new Date().toISOString(),
    publicPullRequests: prs.total_count,
    publicMergedPullRequests: merged.total_count,
    publicRepositories: profile.public_repos,
    contributions: collection.contributionCalendar.totalContributions,
    anonymousPrivateContributions: collection.restrictedContributionsCount,
    period: { from: collection.startedAt, to: collection.endedAt },
    weeks: collection.contributionCalendar.weeks
  };
}

async function main() {
  const fixture = process.argv.indexOf('--from-json');
  const metrics = fixture >= 0
    ? JSON.parse(await readFile(resolve(process.argv[fixture + 1]), 'utf8'))
    : await collect(process.env.PROFILE_USERNAME || 'gabrielklengues');
  // Validate and render completely before overwriting the last successful snapshot.
  const svg = render(metrics);
  const mobileSvg = render(metrics, { compact: true });
  await mkdir(resolve(root, 'assets'), { recursive: true });
  await mkdir(resolve(root, 'data'), { recursive: true });
  await writeFile(resolve(root, 'assets/activity-isometric.svg'), svg);
  await writeFile(resolve(root, 'assets/activity-isometric-mobile.svg'), mobileSvg);
  await writeFile(resolve(root, 'data/activity.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(`Painel atualizado para ${metrics.username}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
