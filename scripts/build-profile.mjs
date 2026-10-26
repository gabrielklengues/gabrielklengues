import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { colors, escape, panel, text } from './profile-style.mjs';

const root = new URL('../', import.meta.url);
const lines = (await readFile(new URL('assets/hands.txt', root), 'utf8')).trimEnd().split('\n');
const groups = [
  { label: 'frontend', entries: [['angular', 'Angular'], ['react', 'React'], ['vuejs', 'Vue']] },
  { label: 'backend / APIs', entries: [['csharp', 'C#'], ['typescript', 'TypeScript'], ['nodejs', 'Node.js']] },
  { label: 'dados / cache', entries: [['postgresql', 'PostgreSQL'], ['mysql', 'MySQL'], ['microsoftsqlserver', 'SQL Server'], ['redis', 'Redis']] },
  { label: 'cloud', entries: [['amazonwebservices', 'AWS']] }
];
const icons = new Map();
for (const group of groups) for (const [name] of group.entries) {
  let source = await readFile(new URL(`assets/icons/${name}.svg`, root), 'utf8');
  source = source.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[^]*?-->/g, '').trim();
  // Namespace internal IDs so separately sourced icons do not share SVG definitions.
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  for (const id of ids) source = source.replaceAll(`id="${id}"`, `id="${name}-${id}"`).replaceAll(`url(#${id})`, `url(#${name}-${id})`).replaceAll(`href="#${id}"`, `href="#${name}-${id}"`);
  icons.set(name, source);
}
function icon(name, x, y, size) {
  return icons.get(name).replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(?:width|height|x|y)="[^"]*"/g, '').replace('>', ` x="${x}" y="${y}" width="${size}" height="${size}">`));
}
function hands(x, y, size, leading) {
  return `<g fill="${colors.text}" font-size="${size}" xml:space="preserve" aria-hidden="true">${lines.map((line, i) => `<text x="${x}" y="${y + i * leading}">${escape(line)}</text>`).join('')}</g>`;
}
function whoami(compact) {
  const width = compact ? 720 : 1200;
  let body = hands(compact ? 28 : 26, compact ? 105 : 111, compact ? 7.7 : 7.8, compact ? 8.1 : 7.9);
  if (!compact) body += `<path d="M716 88V326" stroke="${colors.border}" stroke-dasharray="4 5"/>`;
  const x = compact ? 30 : 748;
  const valueX = compact ? 208 : 885;
  const base = compact ? 384 : 108;
  const size = compact ? 28 : 17;
  body += text(x, base, 'gabriel@github', compact ? 32 : 23, colors.green);
  body += text(x, base + 53, 'perfil', size, colors.muted) + text(valueX, base + 53, 'Full Stack Developer', size);
  body += text(x, base + 104, 'formação', size, colors.muted) + text(valueX, base + 104, 'Análise e Desenvolvimento', size);
  body += text(valueX, base + 134, 'de Sistemas', size);
  body += text(x, base + 181, 'status', size, colors.muted) + text(valueX, base + 181, 'Concluído', size, colors.green);
  body += text(x, base + 228, 'atuação', size, colors.muted) + text(valueX, base + 228, 'Produtos de ponta a ponta', size);
  return panel(width, compact ? 655 : 365, '$ whoami', body, 'Arte de duas mãos se aproximando, desenhada em caracteres ASCII. Gabriel Klengues: Full Stack Developer, formado em Análise e Desenvolvimento de Sistemas. Graduação concluída; atuação em produtos de ponta a ponta.');
}
function stack(compact) {
  const width = compact ? 720 : 1200;
  let body = '';
  groups.forEach((group, i) => {
    const x = compact ? 30 + (i % 2) * 352 : 28 + i * 296;
    const y = compact ? 103 + Math.floor(i / 2) * 270 : 104;
    if (!compact && i > 0) body += `<path d="M${x - 18} 88V300" stroke="${colors.border}" stroke-dasharray="4 5"/>`;
    if (compact && i % 2 === 1) body += `<path d="M359 ${y - 20}V${y + 216}" stroke="${colors.border}"/>`;
    body += text(x, y, group.label, compact ? 26 : 18, colors.muted);
    group.entries.forEach(([name, label], row) => {
      const baseline = y + 48 + row * (compact ? 48 : 47);
      body += icon(name, x, baseline - (compact ? 27 : 25), compact ? 32 : 30);
      body += text(x + (compact ? 47 : 43), baseline, label, compact ? 28 : 22);
    });
  });
  return panel(width, compact ? 590 : 325, '$ stack', body, 'Frontend: Angular, React, Vue. Backend e APIs: C#, TypeScript, Node.js. Dados e cache: PostgreSQL, MySQL, SQL Server, Redis. Cloud: AWS.');
}
for (const compact of [false, true]) {
  const suffix = compact ? '-mobile' : '';
  await writeFile(new URL(`assets/profile${suffix}.svg`, root), whoami(compact));
  await writeFile(new URL(`assets/stack${suffix}.svg`, root), stack(compact));
}
console.log(`Painéis estáticos gerados em ${fileURLToPath(root)}.`);
