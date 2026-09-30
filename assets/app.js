/* ==========================================================================
   Shared behavior. No framework, no build step, no dependencies.
   Every page ends with a <script type="module"> that imports from here.
   ========================================================================== */

/* ---------------------------------------------------------------- theme */
const THEME_KEY = 'ctcl-theme';
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) {}

/* ---------------------------------------------------------------- nav
   Grouped, so fourteen links read as three ideas instead of a wall. */
export const NAV = [
  { group: 'The law', items: [
    ['timeline.html', 'Timeline', 'Every dated event in one stream'],
    ['laws.html', 'Changes', 'Each enacted change, old text against new'],
    ['statutes.html', 'Statutes', 'By statute section, with repeals flagged'],
    ['issues.html', 'Topics', 'Fourteen subjects, kept apart on purpose'],
    ['gaps.html', 'Gaps', 'What was missing, and what the record holds'],
  ]},
  { group: 'The people', items: [
    ['people.html', 'People', 'Ranked by how often they filed'],
    ['testimony.html', 'Testimony', 'Every filing, searchable'],
    ['influence.html', 'Influence', 'What the record shows, and what it does not'],
    ['bills.html', 'Bills', 'How each bill moved, and what was refused'],
    ['agencies.html', 'Agencies', 'Regulation, or policy?'],
  ]},
  { group: 'Check the work', items: [
    ['sources.html', 'Sources', 'Every document behind every figure'],
    ['methodology.html', 'Method', 'How this was built, and how to break it'],
    ['guardrails.html', 'Guardrails', 'The claims the record does not support'],
    ['entities.html', 'Merges', 'Every judgment that two names are one person'],
    ['downloads.html', 'Data', 'All of it, as CSV'],
  ]},
];
const FLAT = NAV.flatMap(g => g.items);

const LOGO = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
<rect x="1.6" y="2.6" width="16.8" height="14.8" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M5 7.4h10M5 10.4h7M5 13.4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

function here() {
  const p = location.pathname.split('/').pop();
  return (!p || p === '') ? 'index.html' : p;
}

/* Six links that cover most visits, then everything else grouped behind "More".
   Sixteen links in a row is not navigation, it is a list that happens to be at the
   top of the page. */
const PRIMARY = ['timeline.html', 'laws.html', 'people.html', 'influence.html',
                 'bills.html', 'gaps.html'];

function buildHeader() {
  const cur = here();
  const prim = FLAT.filter(i => PRIMARY.includes(i[0]));
  const rest = NAV.map(g => ({ group: g.group, items: g.items.filter(i => !PRIMARY.includes(i[0])) }))
                  .filter(g => g.items.length);
  const inRest = rest.some(g => g.items.some(i => i[0] === cur));

  const h = document.createElement('header');
  h.className = 'masthead';
  h.innerHTML = `<div class="masthead-in">
    <a class="brand" href="index.html">${LOGO}<span>CT Cannabis Law <span class="sub">&middot; 2012&ndash;2027</span></span></a>
    <nav class="main" aria-label="Main">
      <a href="index.html"${cur === 'index.html' ? ' aria-current="page"' : ''}>Home</a>
      ${prim.map(([href, t]) => `<a href="${href}"${href === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
    </nav>
    <div class="more-wrap">
        <button type="button" class="more-btn${inRest ? ' on' : ''}" id="moreBtn"
          aria-expanded="false" aria-controls="moreMenu" aria-haspopup="true">More
          <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3.2 5 7l4-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="more-menu" id="moreMenu" role="menu" hidden>
          ${rest.map(g => `<div class="grp"><h5>${g.group}</h5>
            ${g.items.map(([href, t, d]) => `<a role="menuitem" href="${href}"${href === cur ? ' aria-current="page"' : ''}>
              <strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`).join('')}
        </div>
    </div>
    <button class="theme-btn" type="button" id="themeBtn" aria-live="polite" title="Light, dark, or follow the system">
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
      <span id="themeLbl">Theme</span></button>
  </div>`;
  document.body.prepend(h);

  const mb = h.querySelector('#moreBtn'), mm = h.querySelector('#moreMenu');
  const closeMenu = () => { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); };
  mb.addEventListener('click', e => {
    e.stopPropagation();
    const open = mm.hidden;
    mm.hidden = !open;
    mb.setAttribute('aria-expanded', String(open));
    if (open) { const a = mm.querySelector('a'); if (a) a.focus(); }
  });
  document.addEventListener('click', e => { if (!mm.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const btn = h.querySelector('#themeBtn'), lbl = h.querySelector('#themeLbl');
  const modes = ['system', 'light', 'dark'];
  let cm = 'system';
  try { cm = localStorage.getItem(THEME_KEY) || 'system'; } catch (e) {}
  const setLbl = () => { lbl.textContent = cm[0].toUpperCase() + cm.slice(1); };
  setLbl();
  btn.addEventListener('click', () => {
    cm = modes[(modes.indexOf(cm) + 1) % modes.length];
    try { cm === 'system' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, cm); } catch (e) {}
    applyTheme(cm === 'system' ? null : cm);
    setLbl();
  });
  const on = h.querySelector('nav.main a[aria-current="page"]');
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function buildFooter() {
  const f = document.createElement('footer');
  f.className = 'site';
  f.innerHTML = `<div class="in">
    <div class="cols">
      ${NAV.map(g => `<div><h4>${g.group}</h4><ul class="clean">
        ${g.items.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`).join('')}
      <div><h4>About this site</h4>
        <p style="margin:0 0 .6rem">A public record of how Connecticut cannabis law changed
        between 2012 and 2027, built from primary documents. Every figure links to the
        source it came from.</p>
        <p style="margin:0">No records request in this project has been sent to anyone.</p></div>
    </div>
    <p style="margin:0;border-top:1px solid var(--rule);padding-top:1rem">
      Statutory text on this site comes from the <strong>enacted public acts</strong>, never from
      the General Assembly&rsquo;s published chapter pages, which lag the session.
      <a href="methodology.html">Why that matters</a>.
    </p></div>`;
  document.body.appendChild(f);
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
/* Source data is lowercase by convention ("campaign contribution"). Headings and
   labels on the page are not, so a data value gets a capital when it is shown. */
export const cap = s => {
  const t = String(s ?? '').trim();
  if (!t) return t;
  if (/[A-Z]/.test(t[0]) || /^\d/.test(t)) return t;
  return t[0].toUpperCase() + t.slice(1);
};
export const plural = (n, one, many) => `${num(n)} ${Number(n) === 1 ? one : (many || one + 's')}`;
export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function fmtDate(d) {
  if (!d) return '';
  if (/^\d{4}$/.test(d)) return d;
  if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, dd] = d.slice(0, 10).split('-');
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
  const lag = tier === '3'
    ? `<dt>Warning</dt><dd>Tier 3 lags the session. It is never relied on for current law here.</dd>` : '';
  return `<details class="cite"><summary>
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h5l3 3v9H6z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v4h4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 5v9h7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
      Source ${esc(sourceId)} &middot; tier ${esc(tier)}</summary>
    <div class="body"><dl>
      <dt>Source</dt><dd>${esc(title)}</dd>
      ${s && s.c ? `<dt>Held by</dt><dd>${esc(s.c)}</dd>` : ''}
      ${locator ? `<dt>Exact locator</dt><dd class="mono">${esc(locator)}</dd>` : ''}
      ${s && s.u ? `<dt>Where</dt><dd>${/^https?:/.test(s.u)
        ? `<a href="${esc(s.u)}" rel="noopener">${esc(s.u)}</a>` : `<span class="mono">${esc(s.u)}</span>`}</dd>` : ''}
      ${s && s.n ? `<dt>Limits</dt><dd>${esc(s.n)}</dd>` : ''}
      ${lag}
    </dl></div></details>`;
}

/* ---------------------------------------------------------------- filters */
export function debounce(fn, ms = 140) {
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

export function clearButton(id = 'clr') {
  return `<div class="field" style="min-width:auto"><label for="${id}">&nbsp;</label>
    <button class="btn" id="${id}" type="button">Clear</button></div>`;
}

/* Wire a set of filter inputs to one redraw, plus the Clear button. */
export function wire(ids, draw, clearId = 'clr') {
  const d = debounce(draw);
  ids.forEach(i => { const n = $('#' + i); if (n) n.addEventListener('input', d); });
  const c = $('#' + clearId);
  if (c) c.addEventListener('click', () => {
    ids.forEach(i => { const n = $('#' + i); if (n) n.value = ''; });
    draw();
  });
  draw();
}

/* ---------------------------------------------------------------- typeahead
   A <select> with several hundred options is not a control anyone can use. This
   filters as you type, ranks prefix matches first, and keeps the keyboard working. */
export function combo(node, items, onPick, { placeholder = 'Type a name…', label = 'Search' } = {}) {
  const id = 'combo-' + Math.random().toString(36).slice(2, 8);
  node.innerHTML = `<div class="field grow combo">
    <label for="${id}">${esc(label)}</label>
    <input id="${id}" type="search" role="combobox" aria-expanded="false"
      aria-controls="${id}-list" aria-autocomplete="list" autocomplete="off"
      placeholder="${esc(placeholder)}">
    <div class="combo-list" id="${id}-list" role="listbox" hidden></div>
  </div>`;
  const input = node.querySelector('input'), list = node.querySelector('.combo-list');
  let active = -1, shown = [];

  const render = q => {
    const t = q.trim().toLowerCase();
    shown = (t
      ? items.filter(i => i.search.includes(t))
          .sort((a, b) => (a.label.toLowerCase().startsWith(t) ? 0 : 1) -
                          (b.label.toLowerCase().startsWith(t) ? 0 : 1) || b.n - a.n)
      : items.slice()).slice(0, 60);
    active = -1;
    list.innerHTML = shown.length ? shown.map((i, k) => `
      <div class="opt" role="option" id="${id}-o${k}" data-k="${k}" aria-selected="false">
        <span>${esc(i.label)}${i.aka ? `<span class="aka">also filed as ${esc(i.aka)}</span>` : ''}</span>
        <span class="n">${esc(i.hint || num(i.n))}</span></div>`).join('')
      : `<div class="none">Nothing matches &ldquo;${esc(q)}&rdquo;.</div>`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const mark = () => {
    Array.from(list.children).forEach((c, k) => c.setAttribute('aria-selected', k === active));
    if (active >= 0) {
      list.children[active].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', `${id}-o${active}`);
    }
  };
  const choose = k => {
    const it = shown[k];
    if (!it) return;
    input.value = it.label;
    close();
    onPick(it);
  };

  input.addEventListener('focus', () => render(input.value));
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', e => {
    if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { render(input.value); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, shown.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
    else if (e.key === 'Escape') { close(); }
  });
  list.addEventListener('mousedown', e => {
    const o = e.target.closest('.opt');
    if (o) { e.preventDefault(); choose(Number(o.dataset.k)); }
  });
  document.addEventListener('click', e => { if (!node.contains(e.target)) close(); });
  return { input, set: v => { input.value = v; } };
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
      if (c) data.sort((a, b) => {
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
        if (sKey === k) sDir = -sDir; else { sKey = k; sDir = (k === 'n' || k === 'bills') ? -1 : 1; }
        draw();
      });
    });
  };
  draw();
}

/* Show the reader something went wrong rather than a blank page. */
export function fail(node, e) {
  if (node) node.innerHTML = `<div class="empty">This section could not load its data
    (<span class="mono">${esc(e && e.message ? e.message : e)}</span>). The
    <a href="downloads.html">download page</a> has the same figures as CSV.</div>`;
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
