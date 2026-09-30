import json, re, scrape, concurrent.futures as cf
r = json.load(open('raw.json'))
Q = r"[\"'“”‘’]"
def txt(u):
    p = u.replace(scrape.CANON, '')
    if p.lower().endswith(('.htm', '.html')): return scrape.clean(scrape.fetch(scrape.BASE + p) or '')
    return scrape.pdftext(p)
def one(k):
    b = r[k]; out = {}
    # OLR analyses describe each adopted amendment ("*House Amendment "A" ...")
    eff = {}
    for d in b['docs']:
        if not re.search(r'/BA/', d['url'], re.I): continue
        t = re.sub(r'\s+', ' ', txt(d['url']))
        for m in re.finditer(r'\*?(House|Senate) Amendment ' + Q + r'([A-Z])' + Q + r'\s*(.{20,900}?)(?=\*(?:House|Senate) Amendment|EFFECTIVE DATE|SUMMARY:|§\s*\d|BACKGROUND|COMMITTEE ACTION|$)', t):
            key = (m.group(1), m.group(2))
            if key not in eff: eff[key] = dict(t=m.group(3).strip(), u=d['url'])
    hist = b['hist']
    for a in b.get('amds') or []:
        m = re.search(r'(House|Senate) Schedule ([A-Z]+)', a['label'])
        rec = dict(lco=a['lco'])
        if m:
            ch, L = m.groups(); rec['sched'] = f'{ch} "{L}"'
            def hit(h):
                mm = re.match(r'(House|Senate) (Adopted|Rejected)\s+(House|Senate) Amendment Schedules?\s+([A-Z](?:\s*,\s*[A-Z])*)', h['a'])
                if mm and mm.group(3) == ch and L in re.split(r'\s*,\s*', mm.group(4)): return mm.group(1), mm.group(2)
                mm = re.match(r'Amendment Withdrawn,\s*(House|Senate) Amendment Schedule\s+([A-Z])', h['a'])
                if mm and mm.group(1) == ch and mm.group(2) == L: return ch, 'Withdrawn'
                return None
            hits = [(h, hit(h)) for h in hist if hit(h)]
            hits.sort(key=lambda x: (x[1][0] != ch, x[0]['d']))  # the chamber that offered it acts first
            if hits:
                h, (by, res) = hits[0]; rec['res'] = res; rec['resd'] = h['d']; rec['by_ch'] = by
                rec['also'] = [dict(ch=x[1][0], res=x[1][1], d=x[0]['d']) for x in hits[1:]]
            if (ch, L) in eff: rec['eff'] = eff[(ch, L)]['t']; rec['eff_u'] = eff[(ch, L)]['u']
        # the amendment's own opening lines, for what it does
        t = re.sub(r'\s+', ' ', re.sub(r'(?m)^\s*\d{1,3}\s+', '', txt(a['url'])))
        m = re.search(r'To:\s.*?(?:ACT|RESOLUTION)[^"”]*\.?\s?["”]\s*', t)
        body = t[m.end():] if m else t
        body = re.sub(r'LCO No\. \d+\s*\S*AMD\.DOCX\s*\d+ of \d+', ' ', body)
        rec['open'] = re.sub(r'\s+', ' ', body)[:420].strip()
        out[a['lco'] + '|' + a['label']] = rec
    return k, out
res = {}
with cf.ThreadPoolExecutor(8) as ex:
    for k, o in ex.map(one, sorted(r)): res[k] = o
json.dump(res, open('amdinfo.json', 'w'), indent=0)
n = sum(len(v) for v in res.values()); print(n, 'amendments', sum(1 for v in res.values() for a in v.values() if a.get('res')), 'with result', sum(1 for v in res.values() for a in v.values() if a.get('eff')), 'with OLR effect')
