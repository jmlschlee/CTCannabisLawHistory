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
  { group: 'The Law', items: [
    ['timeline.html', 'Timeline', 'Every dated event in one stream'],
    ['laws.html', 'Changes', 'Each enacted change, old text against new'],
    ['statutes.html', 'Statutes', 'By statute section, with repeals flagged'],
    ['issues.html', 'Topics', 'Fourteen subjects, kept apart on purpose'],
  ]},
  { group: 'Bills and Votes', items: [
    ['stances.html', 'Where They Stand', 'Who is for and against cannabis, and why'],
    ['bills.html', 'Bills', 'Every cannabis bill since 2012, passed or not'],
    ['sections.html', 'Special Sections', 'Odor and stops, enforcement, driving, rollbacks'],
    ['legislators.html', 'Lawmakers', 'Every vote by every legislator'],
    ['testimony.html', 'Testimony', 'Every written filing, across every committee'],
  ]},
  { group: 'People and Influence', items: [
    ['people.html', 'Who Testified', 'Ranked by how often they filed'],
    ['influence.html', 'Influence', 'A map of what the record ties together'],
    ['agencies.html', 'Agencies', 'Regulation, or policy?'],
  ]},
  { group: 'Help', items: [
    ['guide.html', 'Site Guide', 'How to use this site, in two minutes'],
  ]},
  { group: 'Check the Work', items: [
    ['gaps.html', 'Gaps', 'What was missing, and what the record holds'],
    ['sources.html', 'Sources', 'Every document behind every figure'],
    ['methodology.html', 'Method', 'How this was built, and how to break it'],
    ['guardrails.html', 'Guardrails', 'The claims the record does not support'],
    ['entities.html', 'Name Merges', 'Every judgment that two names are one person'],
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
const PRIMARY = ['stances.html', 'bills.html', 'sections.html', 'legislators.html', 'testimony.html'];

function buildHeader() {
  const cur = here();
  const prim = FLAT.filter(i => PRIMARY.includes(i[0]));
  const rest = NAV.map(g => ({ group: g.group, items: g.items.filter(i => !PRIMARY.includes(i[0])) }))
                  .filter(g => g.items.length);
  const inRest = rest.some(g => g.items.some(i => i[0] === cur));

  const h = document.createElement('header');
  h.className = 'masthead';
  h.innerHTML = `<div class="masthead-in">
    <a class="brand" href="index.html">${LOGO}<span>CT Cannabis Law</span></a>
    <nav class="main" aria-label="Main">
      ${prim.map(([href, t]) => `<a href="${href}"${href === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
    </nav>
    <div class="more-wrap">
        <button type="button" class="more-btn${inRest ? ' on' : ''}" id="moreBtn"
          aria-expanded="false" aria-controls="moreMenu" aria-haspopup="true"><span class="lbl-more">More</span><span class="lbl-menu">Menu</span>
          <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3.2 5 7l4-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="more-menu" id="moreMenu" role="menu" hidden>
          <div class="grp mobile-only"><h5>Main</h5>
            ${[['index.html', 'Home', 'Start here'], ...prim].map(([href, t, d]) => `<a role="menuitem" href="${href}"${href === cur ? ' aria-current="page"' : ''}>
              <strong>${t}</strong><span>${d}</span></a>`).join('')}</div>
          ${rest.map(g => `<div class="grp"><h5>${g.group}</h5>
            ${g.items.map(([href, t, d]) => `<a role="menuitem" href="${href}"${href === cur ? ' aria-current="page"' : ''}>
              <strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`).join('')}
        </div>
    </div>
    <div class="gsearch" role="search"><input id="gq" type="search" placeholder="Search a lawmaker, bill or person" aria-label="Search the site" autocomplete="off">
      <div class="res" id="gres" hidden></div></div>
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
  wireSearch(h.querySelector('.gsearch'));
  const on = h.querySelector('nav.main a[aria-current="page"]');
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

export function wireSearch(root) {
  const inp = root.querySelector('input'), box = root.querySelector('.res');
  let idx = null, act = -1, links = [];
  const build = async () => {
    if (idx) return idx;
    const [L, B, T] = await Promise.all([load('legislators'), load('bills'), load('testimony')]);
    idx = [
      ...L.legislators.map(l => ({ g: 'Lawmakers', t: (l.ch === 'House' ? 'Rep. ' : 'Sen. ') + l.name,
        s: `${l.party ? (l.party === 'D' ? 'Democrat' : l.party === 'R' ? 'Republican' : l.party) + ' · ' : ''}${l.ch}${l.dist && l.dist !== '?' ? ' District ' + l.dist : ''} · ${l.first}–${l.last}`,
        k: (l.name + ' ' + l.aka.join(' ') + ' ' + l.sur).toLowerCase(), u: `legislators.html?id=${encodeURIComponent(l.id)}#record`, w: l.n.votes })),
      ...B.bills.map(b => ({ g: 'Bills', t: `${b.num.replace(/^(HB|SB)/, '$1 ')} (${b.yr})`, s: b.title,
        k: (b.num + ' ' + b.num.replace(/^(HB|SB)/, '$1 ') + ' ' + b.yr + ' ' + b.title + ' ' + (b.pa || '')).toLowerCase(), u: `bill.html?id=${encodeURIComponent(b.id)}`, w: b.tmy.n })),
      ...T.speakers.map(p => ({ g: 'People Who Testified', t: p.who, s: `${p.k || ''} · ${p.orgs.slice(0, 1).join('')} · ${p.n} filing${p.n === 1 ? '' : 's'}`,
        k: (p.who + ' ' + p.orgs.join(' ') + ' ' + (p.aka || []).join(' ')).toLowerCase(), u: `people.html?id=${encodeURIComponent(p.id)}`, w: p.n })),
    ];
    return idx;
  };
  const show = async () => {
    const q = inp.value.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    const all = await build();
    const words = q.split(/\s+/);
    const hit = all.filter(x => words.every(w => x.k.includes(w)));
    const groups = ['Lawmakers', 'Bills', 'People Who Testified'].map(g => [g, hit.filter(x => x.g === g)
      .sort((a, b) => (b.t.toLowerCase().startsWith(q) - a.t.toLowerCase().startsWith(q)) || b.w - a.w).slice(0, 6)]).filter(x => x[1].length);
    links = groups.flatMap(x => x[1]); act = -1;
    box.innerHTML = groups.length ? groups.map(([g, xs]) => `<h6>${esc(g)}</h6>${xs.map(x => `<a href="${x.u}"><strong>${esc(x.t)}</strong><small>${esc(x.s)}</small></a>`).join('')}`).join('')
      : '<p class="small muted" style="padding:.5rem .6rem;margin:0">Nothing matches.</p>';
    box.hidden = false;
  };
  inp.addEventListener('input', debounce(show, 120));
  inp.addEventListener('focus', () => { build(); if (inp.value.trim().length > 1) show(); });
  inp.addEventListener('keydown', e => {
    const as = [...box.querySelectorAll('a')];
    if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(act + 1, as.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(act - 1, 0); }
    else if (e.key === 'Enter') { const a = as[act >= 0 ? act : 0]; if (a) location.href = a.href; return; }
    else if (e.key === 'Escape') { box.hidden = true; return; } else return;
    as.forEach((a, i) => a.classList.toggle('on', i === act)); if (as[act]) as[act].scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('click', e => { if (!root.contains(e.target)) box.hidden = true; });
}

function buildFooter() {
  const f = document.createElement('footer');
  f.className = 'site';
  f.innerHTML = `<div class="in">
    <div class="cols">
      ${NAV.map(g => `<div><h4>${g.group}</h4><ul class="clean">
        ${g.items.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`).join('')}
      <div><h4>About this site</h4>
        <p style="margin:0 0 .6rem">Connecticut cannabis law from 2012 on: every bill, vote,
        amendment and piece of testimony, linked to the official record.</p>
        <p style="margin:0"><a href="guide.html">New here? Read the site guide.</a></p></div>
    </div></div>`;
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
/* Source data is lowercase by convention ("campaign contribution"). Nothing on the page is.
   Short labels (categories, types, statuses) are shown in Title Case; longer text that reads
   as a sentence gets a capital first letter only. */
const SMALL = new Set(['and', 'or', 'of', 'the', 'to', 'for', 'in', 'on', 'by', 'a', 'an', 'at', 'as', 'with', 'from', 'into', 'vs', 'per', 'nor']);
const UPPER = new Set(['thc', 'dcp', 'lco', 'cga', 'dmhas', 'drs', 'olr', 'ofa', 'llc', 'cbd', 'ose', 'sots', 'dui', 'gl', 'jud', 'fin', 'ph', 'app', 'ct', 'ceo', 'md', 'rn']);
export function titleCase(s) {
  const t = String(s ?? '').trim();
  if (!t) return t;
  return t.split(/(\s+|-|\/)/).map((w, i) => {
    if (!w.trim() || w === '-' || w === '/') return w;
    const bare = w.replace(/[^A-Za-z]/g, '').toLowerCase();
    if (UPPER.has(bare) && w.length <= bare.length + 2) return w.toUpperCase();
    if (/^\(?[a-z0-9]{1,3}\)$/.test(w)) return w;             // subsection letters: (a), (12)
    if (/[A-Z]/.test(w.slice(1)) || /^\d/.test(w)) return w;   // McCarthy, DeGraw, 21a-420
    if (i > 0 && SMALL.has(w.toLowerCase()) && !(w.length === 1 && w === w.toUpperCase())) return w.toLowerCase();
    return w.replace(/[A-Za-z]/, c => c.toUpperCase());
  }).join('');
}
export const cap = s => {
  const t = String(s ?? '').trim();
  if (!t) return t;
  if (t.split(/\s+/).length <= 8 && !/[.;:!?]\s|[.;:!?]$/.test(t)) return titleCase(t);
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
const TIER = { '1': 'Primary record', '2': 'Official record', '3': 'Published summary (can lag the law)', '4': 'Secondary source' };
export function cite(sourceId, locator) {
  if (!sourceId) return '';
  const s = (SRCMAP || {})[sourceId];
  const title = s ? s.t : 'Source document';
  const loc = locator && /^https?:/.test(locator) ? locator : '';
  const url = loc || (s && /^https?:/.test(s.u) ? s.u : '');
  const shortT = title.length > 70 ? title.slice(0, 68).replace(/\s+\S*$/, '') + '…' : title;
  return `<details class="cite"><summary>
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h5l3 3v9H6z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 2v4h4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
      Source: ${esc(shortT)}</summary>
    <div class="body"><dl>
      <dt>Document</dt><dd>${url ? `<a href="${esc(url)}" rel="noopener">${esc(title)} &#8599;</a>` : esc(title)}</dd>
      ${s && s.c ? `<dt>Published by</dt><dd>${esc(s.c)}</dd>` : ''}
      ${s && s.r ? `<dt>Kind of record</dt><dd>${esc(TIER[s.r] || 'Record')}</dd>` : ''}
      ${locator && !loc && !/^runs\//.test(locator) ? `<dt>Where in it</dt><dd>${esc(locator)}</dd>` : ''}
      ${s && s.n ? `<dt>Limits</dt><dd>${esc(s.n)}</dd>` : ''}
    </dl></div></details>`;
}

/* ---------------------------------------------------------------- filters */
export function debounce(fn, ms = 140) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function selectField(id, label, options, { all = 'All', value = '' } = {}) {
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <select id="${id}">${all === null ? '' : `<option value="">${esc(all)}</option>`}
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


/* ---------------------------------------------------------------- casing
   Headings, labels, chips and table headers are always in Title Case, and short
   stat labels always start with a capital, however the data arrived. */
const TC_SEL = 'h1, h2, h3, h4, h5, dt, summary, .chip, .eyebrow, .callout .hd, label, .tabs button, .segmented button, .kpi span, .legend-inline span, .legend span, .tl-title, .rank .who, .rec-title, .bars .lab, .stack .lab, th, option';
function tcNode(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) {
    const v = n.nodeValue; if (!/[a-z]/.test(v)) continue;
    if (n.parentElement && n.parentElement.closest('.mono, code, input, textarea, [data-keepcase], .meta, p, .org, .l2, .rec-body')) continue;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0], core = v.trim();
    if (!core) continue;
    // A full sentence keeps sentence case, with a capital first letter.
    const t = (/[.!?]$/.test(core) && core.split(/\s+/).length > 3) ? core.replace(/^([^A-Za-z]*)([a-z])/, (m, p, c) => p + c.toUpperCase()) : titleCase(core);
    if (t !== core) n.nodeValue = lead + t + trail;
  }
}
function capFirst(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n = w.nextNode();
  while (n && !n.nodeValue.trim()) n = w.nextNode();
  if (!n || (n.parentElement && n.parentElement.closest('.mono, code, a[href^="http"]'))) return;
  const m = n.nodeValue.match(/^(\s*)([a-z][a-z'’\-]*)(?=[\s,;)\/]|$)/);
  if (m) n.nodeValue = m[1] + m[2][0].toUpperCase() + n.nodeValue.slice(m[1].length + 1);
}
function applyCasing(root = document.body) {
  root.querySelectorAll(TC_SEL).forEach(tcNode);
  root.querySelectorAll('.stat .k, .kv dd, .sub, .meta, td, .lede, p.small').forEach(capFirst);
}
let _tcT = null;
function watchCasing() {
  applyCasing();
  new MutationObserver(() => { clearTimeout(_tcT); _tcT = setTimeout(() => applyCasing(), 30); })
    .observe(document.body, { childList: true, subtree: true });
}

/* ---------------------------------------------------------------- boot */
export function boot() {
  const skip = el('a', 'skip', 'Skip to content');
  skip.href = '#main';
  document.body.prepend(skip);
  buildHeader();
  buildFooter();
  watchCasing();
}

if (!document.body.dataset.noChrome) boot();

/* ---------------------------------------------------------------- shared labels */
export const DIRS = {
  E: ['ok', 'Expands Access or Eases Penalties', 'Expands Access'],
  R: ['bad', 'Adds Penalties, Restrictions or Enforcement', 'Adds Penalties or Enforcement'],
  M: ['warn', 'Mixed: Both Directions', 'Mixed'],
  N: ['', 'Regulation, Tax or Study', 'Regulation or Study'],
  O: ['', 'Budget or Multi-Subject Bill', 'Multi-Subject'],
};
export const dirChip = (d, short = true) => { const x = DIRS[d] || DIRS.O;
  return `<span class="chip dir ${x[0]}" title="${esc(x[1])}">${esc(short ? x[2] : x[1])}</span>`; };
const KIND_CLS = { 'Lawmaker': 'k-leg', 'State Agency': 'k-gov', 'Law Enforcement': 'k-police', 'Local Official': 'k-local',
  'Health and Medical': 'k-health', 'Industry': 'k-ind', 'Advocate or Group': 'k-adv', 'Member of the Public': 'k-pub', 'Anonymous': 'k-pub' };
export const kindChip = k => k ? `<span class="chip kind ${KIND_CLS[k] || ''}">${esc(k)}</span>` : '';
export const billHref = id => `bill.html?id=${encodeURIComponent(id)}`;
export const legHref = id => `legislators.html?id=${encodeURIComponent(id)}#record`;
export const personHref = id => `people.html?id=${encodeURIComponent(id)}`;
/* Green = pro-cannabis, red = anti-cannabis, yellow = in between. */
export function lean(p, a) {
  const n = p + a; if (!n) return null;
  const s = p / n; return s >= 0.67 ? 'pro' : s <= 0.33 ? 'anti' : 'mid';
}
const LEAN_T = { pro: 'Mostly pro-cannabis', anti: 'Mostly anti-cannabis', mid: 'Mixed record' };
export function leanDot(p, a, withText = false) {
  const l = lean(p, a); if (!l) return '';
  return `<span class="lean ${l}" title="${LEAN_T[l]}: ${p} pro, ${a} anti">${withText ? LEAN_T[l] : ''}</span>`;
}

/* ---------------------------------------------------------------- who stood where on one bill
   Titles say what supporting this bill means, so "for" is never ambiguous. */
export function sideTitles(dir) {
  if (dir === 'R') return [['Supported the harsher rules', 'bad'], ['Opposed the harsher rules', 'ok']];
  if (dir === 'E') return [['Supported expanding access', 'ok'], ['Opposed expanding access', 'bad']];
  return [['Supported the bill', 'warn'], ['Opposed the bill', 'warn']];
}
const KORDER = ['Lawmaker', 'State Agency', 'Law Enforcement', 'Local Official', 'Health and Medical', 'Industry', 'Advocate or Group', 'Member of the Public', 'Anonymous'];
function dedupe(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.anon ? 'anon' : (r.eid || r.who);
    if (!m.has(k)) m.set(k, { ...r, n: 0, urls: [] });
    const x = m.get(k); x.n++; if (r.u) x.urls.push(r.u); if (!x.org && r.org) x.org = r.org;
    x.text = (x.text ?? true) && r.how === 'Text';
  }
  return [...m.values()].sort((a, b) => KORDER.indexOf(a.k) - KORDER.indexOf(b.k) || a.who.localeCompare(b.who));
}
function personLine(x) {
  const name = x.anon ? 'Anonymous witness' + (x.n > 1 ? `es` : '') : x.who;
  const href = x.leg ? legHref(x.leg) : x.eid ? personHref(x.eid) : '';
  return `<li class="pl"><div class="pl1">${href && !x.anon ? `<a href="${href}">${esc(name)}</a>` : esc(name)}${x.n > 1 ? ` <span class="muted small">&times;${x.n}</span>` : ''}
      ${x.urls[0] ? `<a class="pdf" href="${esc(x.urls[0])}" rel="noopener" aria-label="Read the filing">PDF</a>` : ''}</div>
    <div class="pl2">${kindChip(x.k)}${x.org || x.role ? `<span>${esc([x.role, x.org].filter(Boolean).join(' · '))}</span>` : ''}
      ${x.text ? '<span title="The filing has no position in its file name; this side was read from the text of the filing.">&middot; side read from filing text</span>' : ''}</div></li>`;
}
export function sideBoxes(rows, dir, { limit = 40 } = {}) {
  const [a, b] = sideTitles(dir);
  const box = ([title, tone], pos) => {
    const all = dedupe(rows.filter(r => r.p === pos));
    const named = all.filter(x => !['Member of the Public', 'Anonymous'].includes(x.k));
    const pub = all.filter(x => ['Member of the Public', 'Anonymous'].includes(x.k));
    const filings = rows.filter(r => r.p === pos).length;
    return `<div class="side ${tone}"><div class="side-h"><span class="lean ${tone === 'ok' ? 'pro' : tone === 'bad' ? 'anti' : 'mid'}"></span>${esc(title)}
        <span class="side-n">${num(filings)}</span></div>
      ${all.length ? `<ul class="plist">${named.slice(0, limit).map(personLine).join('')}</ul>
        ${named.length > limit ? `<p class="small muted">and ${num(named.length - limit)} more on the full bill page</p>` : ''}
        ${pub.length ? `<details class="more pub"><summary>${num(pub.reduce((s, x) => s + x.n, 0))} from members of the public${pub.some(x => x.anon) ? ' or anonymous' : ''}</summary><ul class="plist">${pub.map(personLine).join('')}</ul></details>` : ''}`
        : '<p class="small muted" style="margin:.4rem 0 0">No one filed on this side.</p>'}</div>`;
  };
  return `<div class="sides">${box(a, 'Supports')}${box(b, 'Opposes')}</div>`;
}
const VAGUE = /^To (implement the Governor's budget recommendations|improve public health|better allocate resources|make minor and technical changes|make various revisions)\b/i;
export function shortPurpose(p, n = 190) {
  if (!p || VAGUE.test(p) || p.length < 25) return '';
  let s = p.replace(/^To\s+/, '');
  const m = s.match(/^\(1\)\s*(.*?)(?:,\s*\(2\)|$)/);
  if (m && m[1]) s = m[1] + (/\(2\)/.test(p) ? ', and more' : '');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s.replace(/\.$/, '') + '.';
}

/* "To (1) do this, (2) do that" as a numbered list. */
export function purposeHtml(p) {
  if (!p) return '';
  const parts = p.replace(/^To:?\s*/, '').split(/\s*\(\d{1,2}\)\s*/).map(x => x.replace(/[,;]?\s*(and)?\s*$/, '').trim()).filter(Boolean);
  if (parts.length < 3) return `<p style="margin:0">${esc(p)}</p>`;
  const lead = /^\(1\)/.test(p.replace(/^To:?\s*/, '')) ? '' : parts.shift();
  return `${lead ? `<p style="margin:0 0 .3rem">${esc(lead)}</p>` : ''}<ol class="plist-num">${parts.map(x => `<li>${esc(x.charAt(0).toUpperCase() + x.slice(1))}</li>`).join('')}</ol>`;
}

/* ---------------------------------------------------------------- why someone is marked pro or anti
   One renderer used everywhere a person's stance is explained. */
function billLine(b, extra = '') {
  return `<li class="why-li"><a href="${billHref(b.id)}"><strong>${esc(b.num.replace(/^(HB|SB)/, '$1 '))} (${esc(b.yr)})</strong></a>
    ${b.enacted ? '<span class="chip ok">Became Law</span>' : '<span class="chip">Did Not Pass</span>'}
    <div class="why-d">${esc(shortPurpose(b.purpose) || b.title)}</div>${extra ? `<div class="why-x">${extra}</div>` : ''}</li>`;
}
function whyGroup(title, tone, items, empty) {
  if (!items.length) return empty ? `<div class="why-g"><h4 class="why-h ${tone}">${title} <span>0</span></h4><p class="small muted" style="margin:0">${empty}</p></div>` : '';
  return `<div class="why-g"><h4 class="why-h ${tone}">${title} <span>${items.length}</span></h4><ul class="why-ul">${items.join('')}</ul></div>`;
}
export function lawmakerWhy(l, VOTE, BILL, LEGMAP) {
  const cnt = l.dv.map(([vid, c, pa]) => ({ v: VOTE.get(vid), c, pa })).filter(x => x.v).map(x => ({ ...x, b: BILL.get(x.v.bid) }))
    .sort((a, b) => (b.v.date || '').localeCompare(a.v.date || ''));
  const where = v => `${v.kind === 'committee' ? v.body + ' Committee' : v.body + ' floor'}, ${fmtDate(v.date)}`;
  const g = (pa, dir, code) => cnt.filter(x => x.pa === pa && x.b.dir === dir && x.c === code)
    .map(x => billLine(x.b, `Voted <strong>${x.c === 'Y' ? 'yes' : 'no'}</strong> &middot; ${esc(where(x.v))} &middot; ${esc(x.v.res.toLowerCase())} ${x.v.t.y}&ndash;${x.v.t.n}`));
  const spon = [...new Map(l.spon.map(s => [s.bid, s])).values()].map(s => ({ ...s, b: BILL.get(s.bid) })).filter(x => x.b);
  const sp = dir => spon.filter(x => x.b.dir === dir).map(x => billLine(x.b, esc(x.role === 'Introduced' ? 'Introduced it' : 'Co-sponsored it')));
  const amd = l.amd.map(a => { const b = BILL.get(a.bid); const full = b ? b.amds.find(x => x.lco === a.lco) : null;
    return b ? `<li class="why-li"><strong>${esc(full && full.sched ? full.sched.replace('"', 'Amendment "') : 'Amendment LCO ' + a.lco)}</strong> to
      <a href="${billHref(b.id)}">${esc(b.num.replace(/^(HB|SB)/, '$1 '))} (${esc(b.yr)})</a> ${dirChip(b.dir)}
      <span class="chip ${full && full.res === 'Adopted' ? 'ok' : full && full.res === 'Rejected' ? 'bad' : ''}">${esc(full && full.res ? full.res : a.called ? 'Called' : 'Never Called')}</span>
      <div class="why-d">${esc(full && full.eff ? (full.eff.length > 240 ? full.eff.slice(0, 238).replace(/\s+\S*$/, '') + '…' : full.eff) : full && full.open ? 'Amendment text: ' + full.open.slice(0, 200) + '…' : '')}</div>
      <div class="why-x"><a href="${esc(a.u)}" rel="noopener">Read the amendment</a></div></li>` : ''; }).filter(Boolean);
  const tmy = l.tmy.map(t => { const b = BILL.get(t.bid); return b ? billLine(b, `Filed testimony: <strong>${esc(t.p)}</strong>${t.u ? ` &middot; <a href="${esc(t.u)}" rel="noopener">read it</a>` : ''}`) : ''; }).filter(Boolean);
  return `<div class="why">
    ${whyGroup('Voted for bills that expand access or ease penalties', 'pro', g('P', 'E', 'Y'))}
    ${whyGroup('Voted against bills that add penalties or enforcement', 'pro', g('P', 'R', 'N'))}
    ${whyGroup('Voted against bills that expand access or ease penalties', 'anti', g('A', 'E', 'N'))}
    ${whyGroup('Voted for bills that add penalties or enforcement', 'anti', g('A', 'R', 'Y'))}
    ${!cnt.length ? '<p class="small muted">No counted votes on bills that clearly expand access or add enforcement.</p>' : ''}
    ${whyGroup('Absent or not voting on these bills', 'mid', (l.dabs || []).map(id => VOTE.get(id)).filter(Boolean).map(v => { const b = BILL.get(v.bid); return b ? billLine(b, `${dirChip(b.dir)} Absent &middot; ${esc(where(v))} &middot; ${esc(v.res.toLowerCase())} ${v.t.y}&ndash;${v.t.n}`) : ''; }).filter(Boolean))}
    ${(() => { const av = l.v.map(([vid, c]) => ({ v: VOTE.get(vid), c })).filter(x => x.v && !['Final Passage', 'Committee Vote'].includes(x.v.type) && x.v.kind === 'floor')
        .sort((a, b) => (b.v.date || '').localeCompare(a.v.date || ''));
      const items = av.map(x => { const b = BILL.get(x.v.bid); if (!b) return '';
        const a = x.v.amd ? b.amds.find(q => q.lco === x.v.amd) : null;
        const by = a ? a.by.map(o => (LEGMAP && LEGMAP.get(o.pid)) ? LEGMAP.get(o.pid).name : o.n).join(', ') : '';
        const vote = x.c === 'Y' ? 'yes' : x.c === 'N' ? 'no' : 'absent';
        return `<li class="why-li"><span class="v ${x.c}">${x.c === 'Y' ? 'Yea' : x.c === 'N' ? 'Nay' : 'Absent'}</span>
          <strong>${esc(a && a.sched ? a.sched.replace('"', 'Amendment "') : 'An amendment or motion')}</strong> to
          <a href="${billHref(b.id)}">${esc(b.num.replace(/^(HB|SB)/, '$1 '))} (${esc(b.yr)})</a> ${dirChip(b.dir)}
          <div class="why-d">${a && a.eff ? esc(a.eff.length > 220 ? a.eff.slice(0, 218).replace(/\s+\S*$/, '') + '…' : a.eff) : a && a.open ? 'Amendment text: ' + esc(a.open.slice(0, 180)) + '…' : 'Which amendment this was is not printed on the roll call.'}</div>
          <div class="why-x">${by ? 'Offered by ' + esc(by) + ' &middot; ' : ''}voted ${vote} &middot; ${esc(where(x.v))} &middot; amendment ${esc(x.v.res.toLowerCase())} ${x.v.t.y}&ndash;${x.v.t.n}</div></li>`; }).filter(Boolean);
      return items.length ? `<details class="more"><summary>How they voted on amendments (${items.length})</summary><ul class="why-ul" style="margin-top:.4rem">${items.join('')}</ul></details>` : ''; })()}
    ${(() => { const mv = l.v.map(([vid, c]) => ({ v: VOTE.get(vid), c })).filter(x => x.v && ['Final Passage', 'Committee Vote'].includes(x.v.type)).map(x => ({ ...x, b: BILL.get(x.v.bid) }))
        .filter(x => x.b && !['E', 'R'].includes(x.b.dir)).sort((a, b) => (b.v.date || '').localeCompare(a.v.date || ''));
      const items = mv.map(x => billLine(x.b, `${dirChip(x.b.dir)} Voted <strong>${x.c === 'Y' ? 'yes' : x.c === 'N' ? 'no' : 'absent'}</strong> &middot; ${esc(where(x.v))} &middot; ${esc(x.v.res.toLowerCase())} ${x.v.t.y}&ndash;${x.v.t.n}`));
      return items.length ? `<details class="more"><summary>Votes on mixed, regulatory and budget bills, not counted as pro or anti (${items.length})</summary><ul class="why-ul" style="margin-top:.4rem">${items.join('')}</ul></details>` : ''; })()}
    ${whyGroup('Sponsored bills that expand access', 'pro', sp('E'))}
    ${whyGroup('Sponsored bills that add penalties or enforcement', 'anti', sp('R'))}
    ${whyGroup('Sponsored bills that do both, or regulate', 'mid', [...sp('M'), ...sp('N')])}
    ${whyGroup('Amendments they offered', 'mid', amd)}
    ${whyGroup('Testimony they filed', 'mid', tmy)}
  </div>`;
}
export function filerWhy(s, rows, BILL) {
  const mine = rows.filter(r => r.eid === s.id);
  const g = (pos, dir) => mine.filter(r => r.p === pos && BILL.get(r.bid)?.dir === dir)
    .map(r => billLine(BILL.get(r.bid), `${esc(r.c)} committee${r.how === 'Text' ? ' &middot; side read from filing text' : ''}${r.u ? ` &middot; <a href="${esc(r.u)}" rel="noopener">read the filing</a>` : ''}`));
  const other = mine.filter(r => !['E', 'R'].includes(BILL.get(r.bid)?.dir) || !['Supports', 'Opposes'].includes(r.p))
    .map(r => { const b = BILL.get(r.bid); return b ? billLine(b, `<strong>${esc(r.p)}</strong>${r.u ? ` &middot; <a href="${esc(r.u)}" rel="noopener">read the filing</a>` : ''}`) : ''; }).filter(Boolean);
  return `<div class="why">
    ${whyGroup('Supported bills that expand access or ease penalties', 'pro', g('Supports', 'E'))}
    ${whyGroup('Opposed bills that add penalties or enforcement', 'pro', g('Opposes', 'R'))}
    ${whyGroup('Opposed bills that expand access or ease penalties', 'anti', g('Opposes', 'E'))}
    ${whyGroup('Supported bills that add penalties or enforcement', 'anti', g('Supports', 'R'))}
    ${whyGroup('Other filings (mixed or regulatory bills, or no clear side)', 'mid', other)}
  </div>`;
}
