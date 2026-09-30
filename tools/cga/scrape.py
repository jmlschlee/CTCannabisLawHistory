"""Scrape one CGA bill completely: status page, history, sponsors, documents, committee tally
sheets (member votes), floor roll calls (member votes), amendments (offered by), testimony list.
Everything is cached under cache/. Facts only as printed by the General Assembly."""
import re, os, json, html, hashlib, subprocess, sys
BASE = 'https://prdext3.cga.ct.gov'
CANON = 'https://www.cga.ct.gov'
C = '/home/claude/cga/cache'; os.makedirs(C, exist_ok=True)

def fetch(url, binary=False, post=None):
    key = hashlib.md5((url + (post or '')).encode()).hexdigest()
    p = f'{C}/{key}' + ('.pdf' if binary else '.txt')
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        cmd = ['curl', '-sS', '-m', '60', '-o', p, '-g', url]
        if post: cmd[1:1] = ['-X', 'POST', '-H', 'Content-Type: application/json; charset=utf-8', '-d', post]
        subprocess.run(cmd, capture_output=True)
    if not os.path.exists(p): return None
    if binary: return p
    return open(p, encoding='latin-1', errors='ignore').read()

def pdftext(url):
    p = fetch(BASE + url if url.startswith('/') else url, binary=True)
    if not p: return ''
    tp = p + '.txt'
    if not os.path.exists(tp):
        subprocess.run(['pdftotext', '-layout', p, tp], capture_output=True)
    return open(tp, errors='ignore').read() if os.path.exists(tp) else ''

def clean(x): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()

def bill_page(yr, num):
    t, n = re.match(r'(HB|SB)0*(\d+)', num).groups()
    u = f'{BASE}/asp/cgabillstatus/cgabillstatus.asp?selBillType=Bill&which_year={yr}&bill_num={n}' + ('&bill_type=SB' if t == 'SB' else '')
    return fetch(u), f'{CANON}/asp/cgabillstatus/cgabillstatus.asp?selBillType=Bill&which_year={yr}&bill_num={n}'

def parse_bill(yr, num):
    s, url = bill_page(yr, num)
    s = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    title = re.search(r'(AN ACT[^<]{3,400})', s)
    out = dict(yr=str(yr), num=num, title=html.unescape(title.group(1)).strip().rstrip('.') if title else '', url=url)
    links = [(clean(x), u) for u, x in re.findall(r'<a[^>]+href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>', s, flags=re.S) if re.search(r'/\d{4}/', u) and not u.startswith('/2026/bul') and 'sup/titles' not in u]
    out['docs'] = [dict(label=l, url=CANON + u if u.startswith('/') else u) for l, u in links]
    pa = [l for l, u in links if l.startswith('Public Act No.')]
    out['pa'] = pa[0].replace('Public Act No.', 'P.A.').strip() if pa else ''
    # introduced by / co-sponsors
    m = re.search(r'Introduced by:(.*?)(?:New today|</td>|</div>)', s, flags=re.S)
    out['intro'] = [x.strip() for x in re.split(r'<br\s*/?>|,\s(?=(?:Rep|Sen)\.)', m.group(1)) if clean(x)] if m else []
    out['intro'] = [clean(x) for x in out['intro'] if clean(x)]
    m = re.search(r'Co-sponsors of [^<]*</[^>]+>(.*?)(?:NOTE:|</table>)', s, flags=re.S)
    out['cosponsors'] = [x.strip().rstrip(',') for x in re.findall(r'((?:Rep|Sen)\.\s.+?\d+(?:st|nd|rd|th) Dist\.)', clean(m.group(1)))] if m else []
    # history
    txt = clean(s)
    i = txt.find('Bill History Date Action Taken'); j = txt.find('Co-sponsors of', i) if i >= 0 else -1
    j = j if j > 0 else txt.find('NOTE: Please direct', i)
    hist = []
    if i >= 0:
        seg = txt[i + len('Bill History Date Action Taken'): j]
        for d, a in re.findall(r'(\d{1,2}/\d{1,2}/\d{4})\s+(.*?)(?=\s\d{1,2}/\d{1,2}/\d{4}\s|$)', seg):
            mm, dd, yy = d.split('/'); hist.append(dict(d=f'{yy}-{int(mm):02d}-{int(dd):02d}', a=a.strip()))
    out['hist'] = sorted(hist, key=lambda h: h['d'])
    return out

TALLY_HDR = re.compile(r'yea\s+nay\s+abstain\s+absent', re.I)
MEM = re.compile(r'(Rep|Sen)\.\s+(.+?)\s+(S?\d{2,3})(?=\s|$)')
VMAP = {'yea': 'Y', 'nay': 'N', 'abstain': 'A', 'absent': 'X', '': '?'}

def mkmem(pre, name, dist, vote):
    name = re.sub(r'\s+,', ',', re.sub(r"\s*'\s*", "'", name)).strip()
    return dict(ch='House' if pre == 'Rep' else 'Senate', name=name, dist=dist.lstrip('S').lstrip('0'), v=VMAP[vote])

def iso(m, d, y): return f'{y}-{int(m):02d}-{int(d):02d}'

def rows_html(s):
    return [[clean(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', r, flags=re.S)] for r in re.findall(r'<tr[^>]*>(.*?)</tr>', s, flags=re.S | re.I)]

def parse_tally(url):
    path = url.replace(CANON, '')
    members = []
    if path.lower().endswith('.htm') or path.lower().endswith('.html'):
        s = fetch(BASE + path)
        if not s: return None
        t = clean(s)
        for cells in rows_html(s):
            for k, c in enumerate(cells):
                m = MEM.fullmatch(c)
                if m:
                    vs = cells[k + 1:k + 5]
                    vote = next((w for w, x in zip(['yea', 'nay', 'abstain', 'absent'], vs) if x.strip().upper() == 'X'), '')
                    members.append(mkmem(m.group(1), m.group(2), m.group(3), vote))
        rows = rows_html(s)
        comm = re.search(r'<title>\s*(.*?)\s+Committee', s, flags=re.S | re.I)
        comm = comm.group(1).strip().title() if comm else ''
        get = lambda lab: next((r[r.index(lab) + 1] for r in rows if lab in r and r.index(lab) + 1 < len(r)), '')
        tot = next((rows[i + 1] for i, r in enumerate(rows) if r and r[0] == 'TOTALS' and i + 1 < len(rows)), None)
        nums = [int(x) for x in (tot or []) if x.isdigit()]
        d = re.search(r'Vote date:\s*(\d{1,2})/(\d{1,2})/(\d{4})', t)
        return dict(kind='committee', committee=comm, action=get('Action:'), motion=get('Motion:'), second=get('Second:'),
                    date=iso(*d.groups()) if d else '', totals=dict(zip(['voting', 'yea', 'nay', 'abstain', 'absent'], nums)) if len(nums) >= 5 else None,
                    members=members, url=url)
    t = pdftext(path)
    if not t: return None
    lines = t.splitlines()
    comm = next((l.strip() for l in lines if l.strip()), '').title()
    if not TALLY_HDR.search(t): return None
    pdf = fetch(BASE + path, binary=True)
    bb = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    for page in re.findall(r'<page.*?</page>', bb, flags=re.S):
        ws = [(float(a), float(b), float(c), html.unescape(w)) for a, b, c, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)</word>', page)]
        cols = [((x0 + x1) / 2, w) for x0, y, x1, w in ws if w in ('yea', 'nay', 'abstain', 'absent')]
        if not cols: continue
        rows = {}
        for x0, y, x1, w in sorted(ws, key=lambda q: q[1]):
            key = next((r for r in rows if abs(r - y) < 5), y)
            rows.setdefault(key, []).append((x0, x1, w))
        for k in sorted(rows):
            toks = sorted(rows[k])
            i = 0
            while i < len(toks):
                if toks[i][2] in ('Rep.', 'Sen.'):
                    j = i + 1
                    while j < len(toks) and not re.fullmatch(r'S?\d{2,3}', toks[j][2]): j += 1
                    if j >= len(toks): break
                    name = ' '.join(x[2] for x in toks[i + 1:j])
                    n = j + 1
                    while n < len(toks) and toks[n][2] not in ('Rep.', 'Sen.'): n += 1
                    xs = [(x0 + x1) / 2 for x0, x1, w in toks[j + 1:n] if w == 'X']
                    vote = min(cols, key=lambda c: abs(c[0] - xs[0]))[1] if xs else ''
                    members.append(mkmem(toks[i][2][:3], name, toks[j][2], vote))
                    i = n
                else: i += 1
    g = lambda pat: (re.search(pat, t) or [None, ''])[1]
    date = re.search(r'Vote date:\s*(\d{1,2})/(\d{1,2})/(\d{4})', t)
    tot = re.search(r'TOTALS\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', t)
    return dict(kind='committee', committee=re.sub(r'\s*Committee.*', '', comm), action=g(r'Action:\s*(.+)').strip(),
                motion=g(r'Motion:\s*([^\n]+?)(?:\s{2,}|$)').strip(), second=g(r'Second:\s*([^\n]+)').strip(),
                date=iso(*date.groups()) if date else '',
                totals=dict(zip(['voting', 'yea', 'nay', 'abstain', 'absent'], map(int, tot.groups()))) if tot else None,
                members=members, url=url)

def parse_floor(url, label):
    path = url.replace(CANON, '')
    ch = 'Senate' if '/VOTE/S/' in path.upper() else 'House'
    yr = re.search(r'/(\d{4})/VOTE', path, re.I).group(1)
    members = []
    if path.lower().endswith('.htm'):
        s = fetch(BASE + path)
        if not s: return None
        t = clean(s)
        for cells in rows_html(s):
            code, dist = '', ''
            for c in cells:
                c = c.strip()
                if c in ('Y', 'N', 'A', 'X'): code = c
                elif re.fullmatch(r'\d{1,3}', c): dist = c
                elif re.fullmatch(r"[A-Z][A-Za-z .,'’\-]+(\s*\([A-Z. ]+\))?", c) and len(c) > 1:
                    role = (re.search(r'\(([A-Z. ]+)\)', c) or [None, ''])[1]
                    nm = re.sub(r'\s*\(.*\)', '', c)
                    members.append(dict(ch=ch, dist=dist, name=nm.title(), v=code or 'X', **({'role': role} if role else {}))); code, dist = '', ''
    else:
        t = pdftext(path)
        if not t: return None
        body = t.split('roll call vote:', 1)[-1] if 'roll call vote:' in t else t
        for l in body.splitlines():
            if ch == 'Senate' and re.search(r'\s\d{1,2}\s+[A-Z]', l):
                for code, dist, name in re.findall(r'(?:^|\s{2,})([YNAX])?\s+(\d{1,3})\s+([A-Z][A-Z .,\'’\-]+?)(?=\s{2,}|$)', l):
                    if len(name.strip()) < 3: continue
                    members.append(dict(ch=ch, dist=dist, name=name.strip().title(), v=code or 'X'))
            else:
                for code, name in re.findall(r'(?<!\S)([YNAX])\s+([A-Z][A-Z\'’\-]+(?:[ ,.]{1,2}[A-Z][A-Z\'’\-.]*)*\.?)(?=\s{2,}|\s*$)', l):
                    if len(name) < 2: continue
                    members.append(dict(ch=ch, dist='', name=name.strip().title(), v=code))
    g = lambda pat: (re.search(pat, t) or [None, ''])[1]
    date = re.search(r'Taken on (\d{1,2})/(\d{1,2})', t)
    return dict(kind='floor', chamber=ch, label=label, date=iso(date.group(1), date.group(2), yr) if date else '',
                totals=dict(yea=int(g(r'Those voting Yea[\s.]*(\d+)') or 0), nay=int(g(r'Those voting Nay[\s.]*(\d+)') or 0),
                            absent=int(g(r'absent and not voting[\s.]*(\d+)') or 0)),
                members=members, url=url)

def parse_amd(url, label):
    p = url.replace(CANON, '')
    t = clean(fetch(BASE + p) or '').replace(' Offered by:', '\nOffered by:') if p.lower().endswith('.htm') else pdftext(p)
    m = re.search(r'Offered by:\s*(.*?)(?:\n\s*\n\s*\n|To:|In line|Strike|After)', t, flags=re.S)
    offered = [re.sub(r'\s+', ' ', x).strip() for x in (m.group(1).splitlines() if m else []) if x.strip()]
    lco = re.search(r'LCO#?\s*(\d+)', label)
    return dict(label=label, lco=lco.group(1) if lco else '', offered=offered, url=url,
                ch='Senate' if label.startswith('Senate') else 'House', party=(re.search(r'\((\w)\)\s*$', label) or [None, ''])[1])

def testimony(yr, num):
    t, n = re.match(r'(HB|SB)0*(\d+)', num).groups()
    b = f'{t}-{int(n):05d}'
    s = fetch(f'{BASE}/aspx/CGADisplayTestimonies/CGADisplayTestimony.aspx/getTestimonyByAllCommAndBillNumber', post=json.dumps({'billNum': b, 'SVSessYear': str(yr)}))
    try: rows = json.loads(json.loads(s)['d'])
    except Exception: return None
    out = []
    for r in rows:
        u = r['LinkURL'].replace(BASE, CANON)
        fn = u.rsplit('/', 1)[-1]
        pos = 'Supports' if re.search(r'-(In )?Support', fn, re.I) else 'Opposes' if re.search(r'-(In )?Oppos', fn, re.I) else 'Comments' if re.search(r'-(Comment|Neutral|Info)', fn, re.I) else ''
        out.append(dict(who=r['LinkText'].strip(), comm=r['commCode'].upper(), u=u, p=pos))
    return out

def full(yr, num):
    b = parse_bill(yr, num)
    b['votes'] = []
    for d in b['docs']:
        if 'Tally Sheet' in d['label']:
            v = parse_tally(d['url'])
            if v: v['label'] = d['label']; b['votes'].append(v)
        elif 'Roll Call Vote' in d['label']:
            v = parse_floor(d['url'], d['label'])
            if v: b['votes'].append(v)
    b['amds'] = [parse_amd(d['url'], d['label']) for d in b['docs'] if re.search(r'Schedule [A-Z]+ LCO|LCO Amendment', d['label'])]
    b['tmy'] = testimony(yr, num)
    return b

if __name__ == '__main__':
    x = full(sys.argv[1], sys.argv[2])
    print(json.dumps({k: v for k, v in x.items() if k not in ('docs',)}, indent=1)[:4000])
