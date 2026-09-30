/* ==========================================================================
   Charts. Plain HTML and SVG, no library.

   Rules applied throughout, from the data-viz method:
   - one series gets one color; bar length already encodes magnitude, so no ramp
   - categorical hues in fixed slot order, never cycled, never reassigned by rank
   - a legend whenever there are two or more series, plus direct labels
   - 2px surface gap between stacked segments
   - hairline recessive axes, thin marks
   - a hover layer on every plotted mark
   - a table equivalent is always reachable; color never carries meaning alone
   ========================================================================== */
import { esc, num } from './app.js';

const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* --------------------------------------------------------- horizontal bars
   One series. Labels and values are always printed, so the chart is readable
   without color at all. */
export function barChart(node, rows, { max = null, fmt = num, color = 'var(--s1)' } = {}) {
  const hi = max ?? Math.max(1, ...rows.map(r => r.n));
  node.innerHTML = `<div class="bars">${rows.map(r => {
    const pct = Math.max(r.n > 0 ? 1.5 : 0, (r.n / hi) * 100);
    return `<div class="row">
      <div class="lab" title="${esc(r.k)}">${esc(r.k)}</div>
      <div class="track" role="img" aria-label="${esc(r.k)}: ${fmt(r.n)}">
        <div class="fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="val">${fmt(r.n)}</div></div>`;
  }).join('')}</div>`;
}

/* --------------------------------------------------------- vertical columns
   One series over time. Hover gives the exact value; the axis labels thin out
   on narrow screens rather than overlapping. */
export function columnChart(node, rows, { fmt = num, color = 'var(--s1)', everyN = 1 } = {}) {
  const hi = Math.max(1, ...rows.map(r => r.n));
  node.innerHTML = `
    <div class="spark">${rows.map(r => {
      const h = r.n > 0 ? Math.max(3, (r.n / hi) * 100) : 2;
      return `<div class="col" data-zero="${r.n ? 0 : 1}" style="height:${h}%;background:${r.n ? color : 'var(--rule-strong)'}"
        title="${esc(r.k)}: ${fmt(r.n)}" tabindex="0" role="img"
        aria-label="${esc(r.k)}: ${fmt(r.n)}"></div>`;
    }).join('')}</div>
    <div class="xaxis">${rows.map((r, i) =>
      `<span>${i % everyN === 0 ? esc(String(r.k).slice(-4)) : ''}</span>`).join('')}</div>`;
}

/* --------------------------------------------------------- stacked bars
   Several series. Legend is mandatory; each segment also carries a title and an
   aria-label, and the counts are printed beside the bar, so identity never rests
   on color. A 2px gap separates segments. */
export function stackedBars(node, rows, series, { fmt = num } = {}) {
  const hi = Math.max(1, ...rows.map(r => series.reduce((a, s) => a + (r[s.key] || 0), 0)));
  node.innerHTML = `<div class="stack">${rows.map(r => {
    const tot = series.reduce((a, s) => a + (r[s.key] || 0), 0);
    return `<div class="row">
      <div class="lab" title="${esc(r.k)}">${esc(r.k)}</div>
      <div class="track">${series.map(s => {
        const v = r[s.key] || 0;
        if (!v) return '';
        return `<div class="seg" style="flex:0 0 ${(v / hi) * 100}%;background:${s.color}"
          title="${esc(r.k)} — ${esc(s.label)}: ${fmt(v)}"
          role="img" aria-label="${esc(r.k)}, ${esc(s.label)}: ${fmt(v)}"></div>`;
      }).join('')}</div>
      <div class="val">${fmt(tot)}</div></div>`;
  }).join('')}</div>
  <div class="legend">${series.map(s =>
    `<span class="it"><span class="sw" style="background:${s.color}"></span>${esc(s.label)}</span>`
  ).join('')}</div>`;
}

/* --------------------------------------------------------- ego network
   A deterministic radial layout around one chosen actor, not a force-directed
   hairball. Edge color is the evidence strength, and the strength is also
   printed on every spoke label, so color never carries it alone. */
const STRENGTH_COLOR = { 5: 'var(--s7)', 4: 'var(--s1)', 3: 'var(--s2)', 2: 'var(--ink-muted)', 1: 'var(--rule-strong)', 0: 'var(--rule-strong)' };
const STRENGTH_WIDTH = { 5: 2.4, 4: 2, 3: 1.6, 2: 1.2, 1: 1, 0: 1 };

export function egoNetwork(node, centerLabel, spokes, { w = 720, h = 460 } = {}) {
  if (!spokes.length) {
    node.innerHTML = `<div class="empty">No relationships recorded for this actor at the
      selected evidence strength.</div>`;
    return;
  }
  const cx = w / 2, cy = h / 2;
  const n = spokes.length;
  const rx = Math.min(w / 2 - 110, 280), ry = Math.min(h / 2 - 48, 178);
  const pts = spokes.map((s, i) => {
    const a = (-Math.PI / 2) + (i / n) * Math.PI * 2;
    return { ...s, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a };
  });
  const clip = (t, max) => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  node.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="auto"
      role="img" aria-label="Relationships recorded for ${esc(centerLabel)}"
      style="max-height:${h}px;overflow:visible">
    <g>${pts.map(p => `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}"
        stroke="${STRENGTH_COLOR[p.str] || 'var(--ink-muted)'}"
        stroke-width="${STRENGTH_WIDTH[p.str] || 1.2}" stroke-linecap="round" opacity=".85"/>`).join('')}</g>
    <g>${pts.map(p => {
      const right = Math.cos(p.a) >= -0.15;
      const anchor = right ? 'start' : 'end';
      const dx = right ? 11 : -11;
      return `<g>
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="${STRENGTH_COLOR[p.str] || 'var(--ink-muted)'}"
          stroke="var(--surface)" stroke-width="2"><title>${esc(p.label)} — ${esc(p.what)} (evidence strength ${p.str})</title></circle>
        <text x="${p.x + dx}" y="${p.y - 1}" text-anchor="${anchor}" font-size="11"
          font-family="system-ui, sans-serif" fill="var(--ink)">${esc(clip(p.label, 26))}</text>
        <text x="${p.x + dx}" y="${p.y + 11}" text-anchor="${anchor}" font-size="9.5"
          font-family="system-ui, sans-serif" fill="var(--ink-muted)">${esc(clip(p.what, 34))} &middot; strength ${p.str}</text>
      </g>`;
    }).join('')}</g>
    <g>
      <circle cx="${cx}" cy="${cy}" r="9" fill="var(--ink)" stroke="var(--surface)" stroke-width="3"/>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="12.5" font-weight="650"
        font-family="system-ui, sans-serif" fill="var(--ink)">${esc(clip(centerLabel, 40))}</text>
    </g>
  </svg>
  <div class="legend">
    <span class="it"><span class="sw" style="background:var(--s1)"></span>strength 4 &mdash; strong documentary support</span>
    <span class="it"><span class="sw" style="background:var(--s2)"></span>strength 3 &mdash; supported inference</span>
    <span class="it"><span class="sw" style="background:var(--ink-muted)"></span>strength 2 &mdash; weak lead</span>
  </div>`;
}

export { STRENGTH_COLOR };
