import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const number = value => new Intl.NumberFormat('pt-BR').format(value);

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
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
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
    github('graphql', { query, variables: { login: username } })
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

export function render(metrics) {
  for (const key of ['publicPullRequests', 'publicMergedPullRequests', 'publicRepositories', 'contributions']) {
    if (!Number.isSafeInteger(metrics[key]) || metrics[key] < 0) throw new Error(`Métrica inválida: ${key}`);
  }
  if (metrics.publicMergedPullRequests > metrics.publicPullRequests) throw new Error('PRs incorporados excedem total de PRs.');
  if (!Array.isArray(metrics.weeks) || metrics.weeks.length > 54) throw new Error('Calendário inválido.');
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(metrics.updatedAt));
  const palette = { NONE: '#17252c', FIRST_QUARTILE: '#164b43', SECOND_QUARTILE: '#238a68', THIRD_QUARTILE: '#58c88c', FOURTH_QUARTILE: '#b0ef9f' };
  const cards = [
    ['PULL REQUESTS', metrics.publicPullRequests, 'públicos · total', '#91dbff'],
    ['PRS INCORPORADOS', metrics.publicMergedPullRequests, 'públicos · total', '#c1adff'],
    ['CONTRIBUIÇÕES', metrics.contributions, 'últimos 12 meses', '#b0ef9f'],
    ['REPOSITÓRIOS', metrics.publicRepositories, 'públicos · total', '#f4cd8a']
  ].map(([label, value, note, color], i) => {
    const x = 30 + i * 238;
    return `<g transform="translate(${x},76)"><rect width="226" height="132" rx="3" fill="#101b23" stroke="#263844"/><rect x="15" y="18" width="5" height="5" fill="${color}"/><text x="30" y="25" fill="#9eafbc" font-size="12">${label}</text><text x="16" y="80" fill="${color}" font-size="39" font-weight="700">${number(value)}</text><text x="16" y="109" fill="#a5b5c1" font-size="12">${note}</text></g>`;
  }).join('');
  const tiles = metrics.weeks.flatMap((week, x) => week.contributionDays.map(day => {
    if (!(day.contributionLevel in palette) || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) throw new Error('Dia inválido no calendário.');
    return `<rect x="${38 + x * 17.5}" y="${267 + day.weekday * 17}" width="13" height="13" fill="${palette[day.contributionLevel]}"><title>${escape(day.date)}: ${day.contributionCount} contribuições</title></rect>`;
  })).join('');
  const range = `${metrics.period.from.slice(0, 10)} a ${metrics.period.to.slice(0, 10)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 442" role="img" aria-labelledby="title description">
<title id="title">Atividade no GitHub de ${escape(metrics.username)}</title>
<desc id="description">${metrics.publicPullRequests} PRs públicos, ${metrics.publicMergedPullRequests} incorporados, ${metrics.contributions} contribuições nos últimos 12 meses e ${metrics.publicRepositories} repositórios públicos. Atualizado em ${date}. Período ${range}.</desc>
<rect x="1" y="1" width="998" height="440" rx="5" fill="#0b131b" stroke="#283c48"/>
<g font-family="Consolas, 'Liberation Mono', monospace"><text x="30" y="38" fill="#b0ef9f" font-size="14">&gt; git activity --summary</text><text x="970" y="38" text-anchor="end" fill="#9eafbc" font-size="11">ATUALIZADO ${date}</text>${cards}
<text x="38" y="244" fill="#d4e1e9" font-size="12">CADA PIXEL, UM DIA.</text><text x="963" y="244" text-anchor="end" fill="#9eafbc" font-size="11">${range}</text>${tiles}
<text x="38" y="411" fill="#9eafbc" font-size="11">Calendário disponível no perfil · contagens privadas apenas se públicas e anônimas</text></g></svg>\n`;
}

async function main() {
  const fixture = process.argv.indexOf('--from-json');
  const metrics = fixture >= 0
    ? JSON.parse(await readFile(resolve(process.argv[fixture + 1]), 'utf8'))
    : await collect(process.env.PROFILE_USERNAME || 'gabrielklengues');
  // Validate and render completely before overwriting the last successful snapshot.
  const svg = render(metrics);
  await mkdir(resolve(root, 'assets'), { recursive: true });
  await mkdir(resolve(root, 'data'), { recursive: true });
  await writeFile(resolve(root, 'assets/activity.svg'), svg);
  await writeFile(resolve(root, 'data/activity.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(`Painel atualizado para ${metrics.username}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
