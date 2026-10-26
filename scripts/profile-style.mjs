export const colors = { bg: '#141818', border: '#303735', text: '#d9ded5', muted: '#a0aaa2', green: '#b1cc91', dim: '#748077' };
export const escape = value => String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
export const text = (x, y, value, size = 20, fill = colors.text, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
export function panel(width, height, command, content, description) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(command)}</title><desc id="desc">${escape(description)}</desc>
<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="2" fill="${colors.bg}" stroke="${colors.border}"/>
<path d="M1 58H${width - 1}" stroke="${colors.border}"/>
<g font-family="Consolas, 'Liberation Mono', monospace">${text(26, 38, command, width <= 760 ? 31 : 23, colors.green)}${content}</g></svg>\n`;
}
