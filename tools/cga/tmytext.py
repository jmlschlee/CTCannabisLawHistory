import json, re, subprocess, os, concurrent.futures as cf, scrape
r = json.load(open('raw.json'))
rows = [t for b in r.values() for t in (b['tmy'] or []) if not t['p']]
SUP = re.compile(r"\b(in (strong |full )?support of|(strongly |fully )?support(s|ing)? (for )?(h\.?\s?b\.?|s\.?\s?b\.?|raised|house bill|senate bill|this bill|the bill|passage|proposed|bill)|urge (you|the committee)[^.]{0,40}(to )?(pass|support|approve|vote (yes|in favor))|in favor of (h\.?\s?b|s\.?\s?b|house bill|senate bill|this|the bill|raised))", re.I)
OPP = re.compile(r"\b(in opposition (to|of)|(strongly )?oppos(e|es|ing) (to )?(h\.?\s?b\.?|s\.?\s?b\.?|raised|house bill|senate bill|this bill|the bill|passage|proposed|any|legaliz|the legaliz|recreational|commercial)|urge (you|the committee)[^.]{0,40}(to )?(reject|oppose|vote (no|against)|not (pass|support))|against (h\.?\s?b|s\.?\s?b|house bill|senate bill|this bill|the bill|legaliz))", re.I)
def one(t):
    u = t['u'].replace(scrape.CANON, scrape.BASE)
    p = scrape.fetch(u.replace(' ', '%20'), binary=True)
    if not p or os.path.getsize(p) < 200: return t['u'], dict(tp='', why='file not readable')
    tp = p + '.p2.txt'
    if not os.path.exists(tp): subprocess.run(['pdftotext', '-l', '2', '-layout', p, tp], capture_output=True, timeout=60)
    x = re.sub(r'\s+', ' ', open(tp, errors='ignore').read()) if os.path.exists(tp) else ''
    if len(x) < 40: return t['u'], dict(tp='', why='no text layer (scanned image)')
    s = [m.group(0) for m in SUP.finditer(x)]; o = [m.group(0) for m in OPP.finditer(x)]
    if s and not o: return t['u'], dict(tp='Supports', why=s[0])
    if o and not s: return t['u'], dict(tp='Opposes', why=o[0])
    if s and o: return t['u'], dict(tp='Mixed', why=f'{s[0]} / {o[0]}')
    return t['u'], dict(tp='', why='no clear support or opposition phrase')
res = {}
with cf.ThreadPoolExecutor(12) as ex:
    for i, (u, v) in enumerate(ex.map(one, rows)):
        res[u] = v
        if i % 200 == 0: print(i, flush=True); json.dump(res, open('tmytext.json', 'w'))
json.dump(res, open('tmytext.json', 'w'))
from collections import Counter; print(Counter(v['tp'] for v in res.values())); print(Counter(v['why'] for v in res.values() if not v['tp']))
