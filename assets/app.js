/* ==========================================================================
   Shared behaviour. No framework, no build step, no dependencies.
   Every page: <body data-page="x"> then <script type="module" src="assets/app.js">
   ========================================================================== */

/* ---------------------------------------------------------------- theme */
const THEME_KEY = 'ctcl-theme';
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) {}

/* ---------------------------------------------------------------- nav */
const NAV = [
  ['index.html', 'Home'],
  ['timeline.html', 'Timeline'],
  ['laws.html', 'Laws by year'],
  ['statutes.html', 'Statutes'],
  ['bills.html', 'Bills'],
  ['testimony.html', 'Testimony'],
  ['influence.html', 'Influence'],
  ['issues.html', 'Issues'],
  ['agencies.html', 'Agencies'],
  ['sources.html', 'Sources'],
  ['methodology.html', 'Method'],
  ['guardrails.html', 'Guardrails'],
  ['downloads.html', 'Data'],
];

const LOGO = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
<rect x="1.5" y="2.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M5 7.5h10M5 10.5h7M5 13.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

function here() {
  const p = location.pathname.split('/').pop();
  return (!p || p === '') ? 'index.html' : p;
}

function buildHeader() {
  const cur = here();
  const el = document.createElement('header');
  el.className = 'masthead';
  el.innerHTML = `<div class="masthead-in">
    <a class="brand" href="index.html">${LOGO}<span>CT Cannabis Law <span class="sub">&middot; timeline &amp; influence</span></span></a>
    <nav class="main" aria-label="Main">
      ${NAV.map(([h, t]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
    </nav>
    <button class="theme-btn" type="button" id="themeBtn" aria-live="polite">
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
      <span id="themeLbl">Theme</span></button>
  </div>`;
  document.body.prepend(el);
  const btn = el.querySelector('#themeBtn');
  const lbl = el.querySelector('#themeLbl');
  const modes = ['system', 'light', 'dark'];
  let cm = 'system';
  try { cm = localStorage.getItem(THEME_KEY) || 'system'; } catch (e) {}
  const setLbl = () => { lbl.textContent = cm.charAt(0).toUpperCase() + cm.slice(1); };
  setLbl();
  btn.addEventListener('click', () => {
    cm = modes[(modes.indexOf(cm) + 1) % modes.length];
    try { cm === 'system' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, cm); } catch (e) {}
    applyTheme(cm === 'system' ? null : cm);
    setLbl();
  });
}

function buildFooter() {
  const el = document.createElement('footer');
  el.className = 'site';
  el.innerHTML = `<div class="in">
    <div class="cols">
      <div><h4>The record</h4><ul class="clean">
        <li><a href="timeline.html">Timeline</a></li>
        <li><a href="laws.html">Laws by year</a></li>
        <li><a href="statutes.html">Statute explorer</a></li>
        <li><a href="bills.html">Bill lineage</a></li></ul></div>
      <div><h4>The people</h4><ul class="clean">
        <li><a href="testimony.html">Testimony</a></li>
        <li><a href="influence.html">Influence map</a></li>
        <li><a href="agencies.html">Agencies</a></li></ul></div>
      <div><h4>Check the work</h4><ul class="clean">
        <li><a href="sources.html">Source library</a></li>
        <li><a href="methodology.html">Methodology</a></li>
        <li><a href="guardrails.html">Guardrails</a></li>
        <li><a href="downloads.html">Download the data</a></li></ul></div>
      <div><h4>About</h4>
        <p style="margin:0">Built from primary public records by Josiah Schlee,
        CT Cannabis Record Package. Every figure links to the source it came from.</p></div>
    </div>
    <p style="margin:0;border-top:1px solid var(--rule);padding-top:1rem">
      Statutory text on this site comes from the <strong>enacted public acts</strong>, never from
      the General Assembly&rsquo;s published chapter pages, which lag the session.
      <a href="methodology.html">Why that matters</a>.
      No records request in this project has been sent to anyone.
    </p></div>`;
  document.body.appendChild(el);
}

/* ---------------------------------------------------------------- data */
const _cache = new Map();
export async function load(name) {
  if (_cache.has(name)) return _cache.get(name);
  const p = fetch(`data/${name}.json`).then(r => {
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    return r.json();
  });
  _cache.set(name, p);
  return p;
}

/* ---------------------------------------------------------------- helpers */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = n => Number(n).toLocaleString('en-US');
export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function fmtDate(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '';
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, dd] = d.split('-');
  return `${Number(dd)} ${M[Number(m) - 1]} ${y}`;
}

/* Citation chip. Every assertion on this site carries one. */
let SRCMAP = null;
export function setSources(map) { SRCMAP = map; }
export function cite(sourceId, locator) {
  if (!sourceId) return '';
  const s = (SRCMAP || {})[sourceId];
  const tier = s ? s.r : '?';
  const title = s ? s.t : sourceId;
  const lagWarn = tier === '3'
    ? `<dt>Warning</dt><dd>Tier 3 lags the session. It is never relied on for current law on this site.</dd>` : '';
  return `<details class="cite"><summary>
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h5l3 3v9H6z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v4h4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 5v9h7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
      Source ${esc(sourceId)} &middot; tier ${esc(tier)}</summary>
    <div class="body"><dl>
      <dt>Source</dt><dd>${esc(title)}</dd>
      ${s && s.c ? `<dt>Custodian</dt><dd>${esc(s.c)}</dd>` : ''}
      ${locator ? `<dt>Exact locator</dt><dd class="mono">${esc(locator)}</dd>` : ''}
      ${s && s.u ? `<dt>Where</dt><dd>${/^https?:/.test(s.u)
        ? `<a href="${esc(s.u)}" rel="noopener">${esc(s.u)}</a>` : `<span class="mono">${esc(s.u)}</span>`}</dd>` : ''}
      ${s && s.n ? `<dt>Limits</dt><dd>${esc(s.n)}</dd>` : ''}
      ${lagWarn}
    </dl></div></details>`;
}

/* ---------------------------------------------------------------- filters */
export function debounce(fn, ms = 160) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function selectField(id, label, options, { all = 'All', value = '' } = {}) {
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <select id="${id}"><option value="">${esc(all)}</option>
    ${options.map(o => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`;
    }).join('')}</select></div>`;
}

export function searchField(id, label, placeholder) {
  return `<div class="field grow"><label for="${id}">${esc(label)}</label>
    <input id="${id}" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></div>`;
}

/* Download whatever the reader is currently looking at. */
export function downloadCSV(filename, rows, cols) {
  const q = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const body = [cols.map(c => q(c.label ?? c.key)).join(',')]
    .concat(rows.map(r => cols.map(c => q(c.get ? c.get(r) : r[c.key])).join(',')))
    .join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* Sortable table from a column spec. */
export function table(container, cols, rows, { sort = null, dir = 1, empty = 'No matching rows.' } = {}) {
  if (!rows.length) { container.innerHTML = `<div class="empty">${esc(empty)}</div>`; return; }
  let sKey = sort, sDir = dir;
  const draw = () => {
    const data = rows.slice();
    if (sKey) {
      const c = cols.find(x => (x.key || x.label) === sKey);
      data.sort((a, b) => {
        const av = c.sortVal ? c.sortVal(a) : (c.get ? c.get(a) : a[c.key]);
        const bv = c.sortVal ? c.sortVal(b) : (c.get ? c.get(b) : b[c.key]);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sDir;
        return String(av ?? '').localeCompare(String(bv ?? ''), 'en') * sDir;
      });
    }
    container.innerHTML = `<div class="tablewrap"><table>
      <thead><tr>${cols.map(c => {
        const k = c.key || c.label;
        const cur = sKey === k ? (sDir === 1 ? 'ascending' : 'descending') : null;
        return `<th${c.num ? ' class="num"' : ''} data-sort="${esc(k)}"${cur ? ` aria-sort="${cur}"` : ''}
          title="Sort by ${esc(c.label)}">${esc(c.label)}${cur ? (sDir === 1 ? ' ↑' : ' ↓') : ''}</th>`;
      }).join('')}</tr></thead>
      <tbody>${data.map(r => `<tr>${cols.map(c =>
        `<td${c.num ? ' class="num"' : ''}>${c.html ? c.html(r) : esc(c.get ? c.get(r) : r[c.key])}</td>`
      ).join('')}</tr>`).join('')}</tbody></table></div>`;
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sKey === k) sDir = -sDir; else { sKey = k; sDir = 1; }
        draw();
      });
    });
  };
  draw();
}

/* ---------------------------------------------------------------- boot */
export function boot() {
  const skip = el('a', 'skip', 'Skip to content');
  skip.href = '#main';
  document.body.prepend(skip);
  buildHeader();
  buildFooter();
}

if (!document.body.dataset.noChrome) boot();
