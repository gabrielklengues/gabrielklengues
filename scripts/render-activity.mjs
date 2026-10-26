import { colors, escape, panel, text } from './profile-style.mjs';

const number = value => new Intl.NumberFormat('pt-BR').format(value);
const levels = { NONE: '#2b322e', FIRST_QUARTILE: '#526a43', SECOND_QUARTILE: '#77965c', THIRD_QUARTILE: '#99bc73', FOURTH_QUARTILE: '#b9d89a' };
function shade(hex, amount) {
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * amount).toString(16).padStart(2, '0')).join('');
}
export function render(metrics, { compact = false } = {}) {
  for (const key of ['publicPullRequests', 'publicMergedPullRequests', 'publicRepositories', 'contributions']) {
    if (!Number.isSafeInteger(metrics[key]) || metrics[key] < 0) throw new Error(`Métrica inválida: ${key}`);
  }
  if (metrics.publicMergedPullRequests > metrics.publicPullRequests) throw new Error('PRs incorporados excedem total de PRs.');
  if (!Array.isArray(metrics.weeks) || metrics.weeks.length > 54) throw new Error('Calendário inválido.');
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' });
  const updated = date.format(new Date(metrics.updatedAt));
  const range = [metrics.period.from, metrics.period.to].map(value => date.format(new Date(value))).join(' a ');
  const width = compact ? 720 : 1200;
  const height = compact ? 625 : 480;
  const cards = [
    ['PRs públicos', metrics.publicPullRequests], ['PRs incorporados', metrics.publicMergedPullRequests],
    ['Contribuições / 12m', metrics.contributions], ['Repos públicos', metrics.publicRepositories]
  ];
  let body = compact ? '' : text(width - 28, 36, `atualizado ${updated}`, 13, colors.muted, 'text-anchor="end"');
  cards.forEach(([label, value], i) => {
    const x = compact ? 30 + (i % 2) * 352 : 28 + i * 296;
    const y = compact ? 105 + Math.floor(i / 2) * 104 : 105;
    body += text(x, y, label, compact ? 26 : 18, colors.muted);
    body += text(x, y + 47, number(value), compact ? 40 : 32, i === 2 ? colors.green : colors.text);
    if (compact && i % 2 === 1) body += `<path d="M359 ${y - 20}V${y + 55}" stroke="${colors.border}"/>`;
    if (!compact && i > 0) body += `<path d="M${x - 18} 88V157" stroke="${colors.border}"/>`;
  });
  const days = metrics.weeks.flatMap((week, wi) => week.contributionDays.map(day => {
    if (!(day.contributionLevel in levels) || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6 || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) throw new Error('Dia inválido no calendário.');
    return { ...day, x: 70 + wi * 18.7 + day.weekday * 10.5, y: 212 + wi * 1.75 + day.weekday * 12.2 };
  })).sort((a, b) => a.y - b.y);
  let plot = days.map(day => {
    const { x, y } = day;
    const z = day.contributionCount === 0 ? 0 : 4 + Math.min(30, Math.log2(day.contributionCount + 1) * 5);
    const fill = levels[day.contributionLevel];
    const point = (dx, dy, dz = 0) => `${(x + dx).toFixed(2)},${(y + dy - dz).toFixed(2)}`;
    const top = [point(0, 0, z), point(16, 1.5, z), point(25, 11, z), point(9, 9.5, z)].join(' ');
    let sides = '';
    if (z > 0) {
      sides += `<polygon points="${[point(16, 1.5, z), point(25, 11, z), point(25, 11), point(16, 1.5)].join(' ')}" fill="${shade(fill, 0.58)}"/>`;
      sides += `<polygon points="${[point(25, 11, z), point(9, 9.5, z), point(9, 9.5), point(25, 11)].join(' ')}" fill="${shade(fill, 0.78)}"/>`;
    }
    return `<g data-date="${escape(day.date)}"><title>${escape(day.date)}: ${day.contributionCount} contribuições</title>${sides}<polygon data-count="${day.contributionCount}" points="${top}" fill="${fill}"/></g>`;
  }).join('');
  if (!days.length) plot = text(70, 300, 'Nenhuma contribuição neste período.', 24, colors.muted);
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let previousMonth;
  let previousLabelWeek = -4;
  metrics.weeks.forEach((week, wi) => {
    const first = week.contributionDays[0];
    if (!first) return;
    const month = first.date.slice(0, 7);
    if (month !== previousMonth && wi - previousLabelWeek >= 3) {
      const index = Number(first.date.slice(5, 7)) - 1;
      plot += text(145 + wi * 18.7, 322 + wi * 1.75, months[index], 14, colors.muted);
      previousMonth = month;
      previousLabelWeek = wi;
    }
  });
  body += `<g ${compact ? 'transform="translate(8 115) scale(.60 1)"' : ''}>${plot}</g>`;
  if (compact) {
    body += text(30, 565, `12 meses: ${range}`, 20, colors.muted);
    body += text(30, 600, `Atualizado em ${updated} · dados do GitHub`, 20, colors.muted);
  } else {
    body += text(28, 447, `12 meses: ${range}`, 14, colors.muted);
    body += text(1170, 447, 'dados do GitHub', 14, colors.muted, 'text-anchor="end"');
  }
  const description = `${metrics.publicPullRequests} PRs públicos, ${metrics.publicMergedPullRequests} incorporados, ${metrics.contributions} contribuições nos últimos 12 meses e ${metrics.publicRepositories} repositórios públicos. Atualizado em ${updated}. Período ${range}. Cada célula corresponde a um dia real; altura e cor representam contribuições.`;
  return panel(width, height, '$ git activity', body, description);
}
