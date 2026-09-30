import json, re, concurrent.futures as cf, scrape
r = json.load(open('raw.json'))
def textlinks(b):
    # text-of-bill docs are the ones under /TOB/ or /FC/; analyses under /BA/; PA summaries under /SUM/
    tob = [d for d in b['docs'] if re.search(r'/TOB/', d['url'], re.I)]
    fc = [d for d in b['docs'] if re.search(r'/FC/', d['url'], re.I)]
    ba = [d for d in b['docs'] if re.search(r'/BA/', d['url'], re.I)]
    sm = [d for d in b['docs'] if re.search(r'/SUM/', d['url'], re.I) or d['label'].startswith('Summary for Public Act')]
    return tob, fc, ba, sm
def txt(u):
    p = u.replace(scrape.CANON, '')
    if p.lower().endswith(('.htm', '.html')): return scrape.clean(scrape.fetch(scrape.BASE + p) or '')
    return re.sub(r'[ \t]+', ' ', scrape.pdftext(p))
def one(k):
    b = r[k]; tob, fc, ba, sm = textlinks(b); out = dict(k=k)
    # statement of purpose: earliest bill text first (proposed / raised), then others
    for d in list(reversed(tob)) + tob:
        t = txt(d['url'])
        m = re.search(r'Statement of Purpose:\s*(.+?)(?:\[Proposed deletions|\n\s*\n\s*\n|Co-Sponsors:|$)', t, re.S)
        if m:
            out['purpose'] = re.sub(r'\s+', ' ', m.group(1)).strip()[:3000]; out['purpose_u'] = d['url']; break
    # proposed bills: first paragraph "That ..." is the whole proposal
    if 'purpose' not in out and tob:
        t = txt(tob[-1]['url'])
        m = re.search(r'(That (?:the )?(?:general statutes|chapter|section|title).+?\.)\s', re.sub(r'\s+', ' ', t), re.S)
        if m: out['purpose'] = m.group(1)[:900]; out['purpose_u'] = tob[-1]['url']
    for d in (sm[:1] or ba[:1]):
        t = re.sub(r'\s+', ' ', txt(d['url']))
        m = re.search(r'SUMMARY:?\s*(.+?)(?:EFFECTIVE DATE|§\s*1\b|BACKGROUND|COMMITTEE ACTION)', t)
        out['summary'] = (m.group(1) if m else t[:1500]).strip()[:2500]; out['summary_u'] = d['url']; out['summary_kind'] = 'OLR public act summary' if d in sm else 'OLR bill analysis'
        break
    return out
res = {}
with cf.ThreadPoolExecutor(8) as ex:
    for o in ex.map(one, sorted(r)):
        res[o['k']] = o
json.dump(res, open('purpose.json', 'w'), indent=0)
print(sum('purpose' in v for v in res.values()), sum('summary' in v for v in res.values()), len(res))
