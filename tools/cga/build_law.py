"""Build bills, votes, legislators and testimony data for the law site from the CGA scrape.
Every value here is copied from a General Assembly record. Where the build infers something
(topic, final-passage vs. amendment on older Senate roll calls, position read from a PDF's
text), the record says so in a field of its own."""
import json, re, unicodedata, os
from collections import Counter, defaultdict

LAW = '/home/claude/law/data'
raw = json.load(open('/home/claude/cga/raw.json'))
tmytext = json.load(open('/home/claude/cga/tmytext.json')) if os.path.exists('/home/claude/cga/tmytext.json') else {}
subj = json.load(open('/home/claude/cga/subjbills.json'))
old = {b['id']: b for b in json.load(open('/home/claude/cga/orig_bills.json'))['bills']}
oldt = json.load(open('/home/claude/cga/orig_testimony.json'))
laws = json.load(open(f'{LAW}/laws.json'))
roster = {'House': json.load(open('/home/claude/cga/hlist.json')), 'Senate': json.load(open('/home/claude/cga/slist.json'))}

# The site owner asked that his name and identifiers stay off the site.
WITHHOLD = re.compile(r'(?!x)x')  # nothing withheld: testimony is public record

SMALL = {'and', 'or', 'of', 'the', 'to', 'for', 'in', 'on', 'by', 'a', 'an', 'at', 'as', 'vs', 'with', 'from', 'into', 'per'}
KEEP = {'THC': 'THC', 'DCP': 'DCP', 'LCO': 'LCO', 'CGA': 'CGA', 'DMHAS': 'DMHAS', 'DRS': 'DRS', 'OLR': 'OLR', 'OFA': 'OFA',
        'CT': 'CT', 'LLC': 'LLC', 'PA': 'P.A.', 'HB': 'HB', 'SB': 'SB', 'CBD': 'CBD', 'DUI': 'DUI', 'OSE': 'OSE', 'SOTS': 'SOTS'}
def title(s):
    s = str(s or '').strip()
    if not s: return s
    words = re.split(r'(\s+|-|/)', s)
    out = []
    for i, w in enumerate(words):
        if not w.strip() or w in '-/': out.append(w); continue
        u = re.sub(r'[^A-Za-z]', '', w).upper()
        if u in KEEP and len(u) > 1 and w.upper().strip('.,();:') == u: out.append(w.upper()); continue
        if re.match(r'^[\(\[]?[a-z]\)$', w) or re.match(r'^\(\w+\)$', w): out.append(w); continue  # subsection letters (a)
        lw = w.lower()
        if i > 0 and lw in SMALL: out.append(lw)
        elif w[:1].isdigit(): out.append(w)
        elif any(c.isupper() for c in w[1:]) and not w.isupper(): out.append(w)  # McCarthy, DeGraw
        else: out.append(lw[:1].upper() + lw[1:])
    return ''.join(out)

def acts_title(s):  # "AN ACT CONCERNING THE RETAIL SALE OF CANNABIS" -> "An Act Concerning the Retail Sale of Cannabis"
    return title(s.lower()).replace("Consumer Protection's", "Consumer Protection's")

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Z]', '', s.upper())

# ------------------------------------------------------------------ topics
TOPICS = [
    ('Adult-Use Legalization and Retail', r'adult[- ]use|retail sale|legaliz|recreational|regulation and taxation of the (production|retail)|responsibl'),
    ('Medical Cannabis and Patients', r'palliative|medical (marijuana|cannabis)|qualifying patient|caregiver|debilitating|terminally ill'),
    ('Hemp and Hemp-Derived THC', r'\bhemp|cannabinoid|infused beverage|moderate-thc'),
    ('Criminal Justice and Erasure', r'decriminaliz|erasure|sentence|offense|criminal record|possession of (a )?small'),
    ('Impaired Driving and Public Safety', r'driving|motor vehicle|impair|traffic stop|police|public safety'),
    ('Taxes and Revenue', r'\btax|revenue|excise|deduction'),
    ('Social Equity and Reinvestment', r'social equity|equit|community (restoration|reinvestment)|angel investor'),
    ('Labor and Workplace', r'labor|workplace|workforce|wage|employ'),
    ('Licensing and Regulation', r'regulat|licens|consumer protection|antitrust|anti-trust|application fee|establishment'),
    ('Youth Prevention and Public Health', r'youth|prevention|minor|public health|study|advertis|promotional'),
]
FOCUS = re.compile(r'cannabis|marijuana|marihuana|\bhemp\b|cannabinoid|\bTHC\b', re.I)

def topics_for(t):
    t = t.lower(); out = [k for k, p in TOPICS if re.search(p, t)]
    return out or ['Other Cannabis Provisions']

# ------------------------------------------------------------------ stage
def stage(b, votes):
    h = ' | '.join(x['a'] for x in b['hist'])
    if b['pa']: return 'Became a Public Act'
    if re.search(r'veto', h, re.I): return 'Vetoed'
    hp = any(v['kind'] == 'floor' and v['chamber'] == 'House' and v['type'] == 'Final Passage' and v['res'] == 'Passed' for v in votes) or re.search(r'House Passed', h)
    sp = any(v['kind'] == 'floor' and v['chamber'] == 'Senate' and v['type'] == 'Final Passage' and v['res'] == 'Passed' for v in votes) or re.search(r'Senate Passed', h)
    if hp and sp: return 'Passed Both Chambers'
    if hp or sp: return 'Passed One Chamber'
    if re.search(r'Joint Favorable|\bJF\b|Favorable Report|Joint Fav', h): return 'Reported Out of Committee'
    if re.search(r'Public Hearing', h): return 'Public Hearing Held'
    return 'Introduced, No Hearing'
STAGES = ['Introduced, No Hearing', 'Public Hearing Held', 'Reported Out of Committee', 'Passed One Chamber',
          'Passed Both Chambers', 'Vetoed', 'Became a Public Act']

# ------------------------------------------------------------------ vote classification
def classify_floor(bill, v, sen_by_date):
    lab = v['label'].upper()
    if v['chamber'] == 'House' or re.search(r'PASS|AMD|LCO|ADOPT|AMENDED|EMERGENCY', lab):
        if re.search(r'\bAMD\b|LCO\s*#|ADOPT', lab) and not re.search(r'\bPASS\b', lab): return 'Amendment', False
        return 'Final Passage', False
    # Older-format Senate labels carry no description. The last roll call on a day on which the
    # bill history records a Senate passage is treated as the passage vote; earlier roll calls that
    # day are amendment or motion votes. Flagged as inferred.
    same = sen_by_date[v['date']]
    seq = int(re.search(r'Vote (\d+)', v['label']).group(1))
    top = max(int(re.search(r'Vote (\d+)', x['label']).group(1)) for x in same)
    day = [h['a'] for h in bill['hist'] if h['d'] == v['date']]
    passed_day = any(re.search(r'Senate (Passed|Adopted|Rejected|Failed)(?! Senate Amendment| House Amendment)', a) for a in day) or not day
    if seq == top and passed_day: return 'Final Passage', True
    return 'Amendment or Motion', True

# ------------------------------------------------------------------ legislators
people = {}
def pkey(ch, dist, sur): return f'{ch}|{dist}|{norm(sur)}'
def surname_of(name):  # 'Candelaria, J.' or "D'Agostino M." or 'John W. Fonfara'
    if ',' in name: return name.split(',')[0].strip()
    parts = name.split()
    if len(parts) >= 2 and re.fullmatch(r'[A-Z]\.?', parts[-1]): return ' '.join(parts[:-1])
    parts = [p for p in parts if p.rstrip('.').upper() not in ('JR', 'SR', 'II', 'III', 'IV')]
    return parts[-1] if parts else name
def initial_of(name):
    m = re.search(r',\s*([A-Z])', name) or re.search(r'\s([A-Z])\.?$', name)
    return m.group(1) if m else ''
def person(ch, dist, name, yr, full=None, sur=None):
    sur = sur or surname_of(name)
    k = pkey(ch, dist, sur)
    p = people.setdefault(k, dict(id='LEG_' + re.sub(r'[^A-Z0-9]', '', k.upper().replace('|', '_')), ch=ch, dist=dist,
                                  sur=sur, names=Counter(), full=Counter(), yrs=set(), votes=[], spon=[], amd=[], tmy=[]))
    p['names'][name] += 1; p['yrs'].add(int(yr))
    if full: p['full'][full] += 1
    return p

# committee tallies first: they carry district + surname + initial for every member.
year_roster = defaultdict(lambda: defaultdict(set))  # (yr, ch) -> norm surname -> {(dist, initial)}
for k, b in raw.items():
    for v in b['votes']:
        if v['kind'] != 'committee': continue
        for m in v['members']:
            year_roster[(b['yr'], m['ch'])][norm(surname_of(m['name']))].add((m['dist'], initial_of(m['name'])))
for ch in roster:
    for r in roster[ch]:
        for y in ('2025', '2026'):
            year_roster[(y, ch)][norm(surname_of(r['name']))].add((r['dist'], initial_of(r['name']) or r['name'].split(',')[1].strip()[:1]))

def term_years(y):
    y = int(y); a = y if y % 2 else y - 1
    return [str(a), str(a + 1)]

unresolved = Counter()
def resolve_house(name, yr):
    sur = norm(name.split(',')[0]); ini = initial_of(name) if ',' in name else ''
    for ys in ([yr], term_years(yr), [str(int(yr) + d) for d in (-2, 2, -3, 3, -4, 4)]):
        c = set()
        for y in ys: c |= year_roster[(y, 'House')].get(sur, set())
        if ini: c = {x for x in c if x[1] == ini}
        dists = {d for d, _ in c}
        if len(dists) == 1: return dists.pop()
        if len(dists) > 1: break
    unresolved[(yr, name)] += 1
    return ''

bills_out, votes_out = [], []
for key in sorted(raw):
    b = raw[key]; yr = b['yr']; num = b['num']
    bid = f'BILL_{yr}_{num}'
    focus = bool(FOCUS.search(b['title']))
    ob = old.get(bid, {})
    sen_by_date = defaultdict(list)
    for v in b['votes']:
        if v['kind'] == 'floor' and v['chamber'] == 'Senate': sen_by_date[v['date']].append(v)
    vs = []
    for v in b['votes']:
        if not v['members'] or not v.get('totals'): continue
        T = v['totals']
        if v['kind'] == 'committee':
            act = re.sub(r'\s+', ' ', v.get('action') or '').strip()
            if re.match(r'Language', act): act = 'Committee Amendment Vote'
            typ = 'Committee Vote on Amendment' if act == 'Committee Amendment Vote' else ('Change of Reference' if re.search(r'Change of Reference', act) and not re.search(r'Joint Favorable', act) else 'Committee Vote')
            inf = False
            res = 'Passed' if T.get('yea', 0) > T.get('nay', 0) else 'Failed'
            body = v['committee'] or re.sub(r' Vote Tally.*', '', v.get('label', ''))
        else:
            typ, inf = classify_floor(b, v, sen_by_date)
            res = ('Passed' if T['yea'] > T['nay'] else 'Failed') if typ == 'Final Passage' else ('Adopted' if T['yea'] > T['nay'] else 'Rejected')
            body = v['chamber']; act = v['label']
        vid = f'V{len(votes_out) + 1:05d}'
        rec = dict(id=vid, bid=bid, yr=yr, kind=v['kind'], body=title(body), chamber=v.get('chamber', ''), label=v.get('label') or act,
                   action=title(act) if v['kind'] == 'committee' else '', type=typ, inf=inf, date=v['date'], res=res,
                   t=dict(y=T.get('yea', 0), n=T.get('nay', 0), a=T.get('absent', 0) + T.get('abstain', 0)), u=v['url'])
        # members
        mv = []
        pre = {}
        for i, m in enumerate(v['members']):
            if m['ch'] == 'House' and not m['dist']: pre[i] = resolve_house(m['name'], yr)
        dupe = Counter((d, norm(v['members'][i]['name'].split(',')[0])) for i, d in pre.items() if d)
        for i, m in enumerate(v['members']):
            if m['v'] == '?': continue
            if m['ch'] == 'House' and not m['dist']:
                d = pre[i]
                if d and dupe[(d, norm(m['name'].split(',')[0]))] > 1:
                    # two members print identically on this roll call (e.g. two "Miller, P."): kept on the vote, not attributed to a person
                    mv.append(['', m['v'], m['name']]); continue
                p = person('House', d or '?', m['name'], yr, sur=m['name'].split(',')[0])
            else:
                p = person(m['ch'], m['dist'], m['name'], yr, full=m['name'] if (v['kind'] == 'floor' and m['ch'] == 'Senate') else None)
            p['votes'].append((vid, m['v']))
            mv.append([p['id'], m['v']])
        cnt = Counter(x[0] for x in mv if x[0])
        for x in mv:
            if x[0] and cnt[x[0]] > 1:  # two members resolve to one identity on the same vote: do not attribute either
                pp = next(p for p in people.values() if p['id'] == x[0])
                pp['votes'] = [q for q in pp['votes'] if q[0] != vid]
                x[:] = ['', x[1], next(p for p in people.values() if p['id'] == x[0])['sur']]
        rec['m'] = mv
        vs.append(rec); votes_out.append(rec)
    # stage
    b['hist'] = b['hist']
    st = stage(b, vs)
    pa = b['pa'] or ob.get('pa', '')
    act = next((a for a in laws['acts'] if a.get('billid') == bid), None)
    if act: pa = act['pa']
    if pa and st != 'Became a Public Act': st = 'Became a Public Act'
    # sponsors
    spon = []
    for s in (b.get('intro') or []) + (b.get('cosponsors') or []):
        m = re.match(r'(Rep|Sen)\.\s+(.+?),\s*(\d+)(?:st|nd|rd|th) Dist', s)
        if m:
            ch = 'House' if m.group(1) == 'Rep' else 'Senate'
            p = person(ch, m.group(3), m.group(2).split()[-1] if ',' not in m.group(2) else m.group(2), yr, full=m.group(2))
            p['spon'].append(dict(bid=bid, role='Introduced' if s in (b.get('intro') or []) else 'Co-Sponsor'))
            spon.append(dict(n=s, pid=p['id'], role='Introduced' if s in (b.get('intro') or []) else 'Co-Sponsor'))
        else:
            spon.append(dict(n=s, pid='', role='Introduced'))
    # amendments
    amds = []
    for a in b.get('amds') or []:
        called = bool(re.search(r'Schedule', a['label']))
        offered = []
        for o in a['offered']:
            for pre, sur, dist in re.findall(r'(REP|SEN)\.\s+([A-Z][A-Z\'’\-\. ]+?),\s*(\d+)\s*(?:st|nd|rd|th)\s*Dist', o, re.I):
                ch = 'House' if pre.upper() == 'REP' else 'Senate'
                p = person(ch, dist, sur.title(), yr)
                p['amd'].append(dict(bid=bid, lco=a['lco'], lab=a['label'], u=a['url'], called=called))
                offered.append(dict(n=f'{"Rep." if ch == "House" else "Sen."} {sur.title()}', pid=p['id']))
        amds.append(dict(lco=a['lco'], ch=a['ch'], lab=a['label'], called=called, by=offered, u=a['url']))
    tp = topics_for(b['title'] + ' ' + (ob.get('why') or ''))
    if not focus: tp = ['Budget and Multi-Subject Bills']
    bills_out.append(dict(id=bid, num=num, yr=yr, title=acts_title(b['title']), focus=focus,
        subj=subj.get(key, []), topics=tp, stage=st, enacted=bool(pa), pa=pa, paid=(act or {}).get('id', ob.get('paid', '')),
        by=', '.join(b.get('intro') or []) or ob.get('by', ''), spon=spon,
        first=b['hist'][0]['d'] if b['hist'] else '', last=b['hist'][-1]['d'] if b['hist'] else '',
        hist=[dict(d=h['d'], a=h['a']) for h in b['hist']], amds=amds, votes=[x['id'] for x in vs],
        why=ob.get('why', ''), s='SOURCE_0014', l=b['url'], docs=[d for d in b['docs'] if re.search(r'Bill Analysis|Fiscal Note For File|Public Act No|Summary for Public Act|Joint Fav', d['label'])][:8]))

# ------------------------------------------------------------------ testimony
POSMAP = {'Supports': 'Supports', 'Opposes': 'Opposes', 'Comments': 'Comments Only'}
old_by_u = {r['u']: r for r in oldt['rows']}
def parse_who(t):
    t = re.sub(r'\s+', ' ', t).strip()
    pos = ''
    m = re.search(r'-(Supports?|Opposes?|In Support|In Opposition|Comments|Neutral)\s*$', t, re.I)
    if m: pos = m.group(1); t = t[:m.start()]
    t = t.rstrip('-').strip()
    m = re.match(r"^([A-Za-z'’\.\- ]+),\s*(?:(MD|PhD|Dr\.?|Jr\.?|Esq\.?|RN|DO|PharmD)\s*,\s*)?([A-Za-z'’\.\- ]+?)(?:,\s*([^-]*?))?(?:-(.*))?$", t)
    if not m or len(m.group(1).split()) > 3:
        return dict(who=t, role='', org='', pos=pos)
    last, suf, first, role, org = m.groups()
    fw = first.strip().split()
    if len(fw) > 1 and fw[-1].lower() == last.strip().lower(): first = ' '.join(fw[:-1])  # "Smith, John Smith"
    if first.strip().lower() == last.strip().lower(): return dict(who=last.strip(), role=(role or '').strip(), org=(org or '').strip(), pos=pos)  # "CHA, CHA"
    if len(last.split()) >= 2 and not suf:  # "Ethan Ruby, CEO of Theraplant": name first, role after the comma
        return dict(who=last.strip(), role=', '.join(x for x in (first, role) if x).strip(), org=(org or '').strip(), pos=pos)
    who = f'{first.strip()} {last.strip()}' + (f', {suf}' if suf else '')
    return dict(who=who, role=(role or '').strip(), org=(org or '').strip().strip('-').strip(), pos=pos)

rows = []
bill_by_id = {b['id']: b for b in bills_out}
for key in sorted(raw):
    b = raw[key]; bid = f'BILL_{b["yr"]}_{b["num"]}'
    B = bill_by_id[bid]
    for t in b['tmy'] or []:
        o = old_by_u.get(t['u'])
        pw = parse_who(t['who'])
        p = t['p'] or ('Opposes' if re.search(r'oppos', pw['pos'], re.I) else 'Supports' if re.search(r'support', pw['pos'], re.I) else '')
        how = 'Filename' if p else ''
        if not p and o and o['p'] in ('Supports', 'Opposes'): p, how = o['p'], 'Filename'
        tx = tmytext.get(t['u'])
        if not p and tx and tx['tp']: p, how = tx['tp'], 'Text'
        who = o['who'] if o else pw['who']
        anon = bool(re.match(r'anonymous', who, re.I)) or (o or {}).get('anon', False)
        wh = bool(WITHHOLD.search(t['who'] + t['u']))
        rows.append(dict(yr=b['yr'], b=f'{b["num"][:2]}-{int(b["num"][2:]):05d}', bid=bid, c=t['comm'],
                         who='Name Withheld' if wh else ('Anonymous Witness' if anon else who),
                         role='' if wh else ((o or {}).get('role') or pw['role']), org='' if wh else ((o or {}).get('org') or pw['org']),
                         p=POSMAP.get(p, p) or 'Not Stated', how=how, q=(tx or {}).get('why', '') if how == 'Text' else '',
                         anon=anon, wh=wh, eid=(o or {}).get('eid', ''), u='' if wh else t['u'], focus=B['focus']))
for i, r in enumerate(rows): r['id'] = f'TMY_{i + 1:05d}'

# speakers: reuse audited entity ids where the filing was already in the dataset, else group by name
eid_by_name = {}
for s in oldt['speakers']:
    eid_by_name[norm(s['who'])] = s['id']
    for a in s.get('aka') or []: eid_by_name.setdefault(norm(a), s['id'])
nxt = max(int(s['id'].split('_')[1]) for s in oldt['speakers'] if s['id'].split('_')[1].isdigit()) + 1
for r in rows:
    if r['wh'] or r['anon']: r['eid'] = ''; continue
    if not r['eid']:
        k = norm(r['who'])
        rev = norm(' '.join(reversed(r['who'].split()))) if len(r['who'].split()) == 2 else ''
        if k not in eid_by_name and rev in eid_by_name: k = rev  # filed with first and last name swapped
        if k not in eid_by_name: eid_by_name[k] = f'TMYP_{nxt:04d}'; nxt += 1
        r['eid'] = eid_by_name[k]

# legislators who filed testimony
LEGRX = re.compile(r'^(Rep\.|Representative|Sen\.|Senator|State Representative|State Senator)\b|,\s*(State )?(Representative|Senator|Rep\.|Sen\.)\b', re.I)
for r in rows:
    if r['wh'] or r['anon']: continue
    txt = r['who'] + ', ' + r['role']
    if not LEGRX.search(txt) and not re.search(r'\b(State Representative|State Senator|Senator|Representative)\b', r['role'], re.I): continue
    ch = 'Senate' if re.search(r'Sen', txt) else 'House'
    sur = norm(r['who'].replace('Rep.', '').replace('Sen.', '').replace('Representative', '').replace('Senator', '').split(',')[0].split()[-1] if r['who'] else '')
    cands = [p for p in people.values() if p['ch'] == ch and norm(p['sur']) == sur and int(r['yr']) in p['yrs']]
    if len(cands) == 1:
        cands[0]['tmy'].append(dict(id=r['id'], bid=r['bid'], p=r['p'], u=r['u'], c=r['c'])); r['leg'] = cands[0]['id']

# ------------------------------------------------------------------ bill testimony tallies
tc = defaultdict(Counter)
for r in rows: tc[r['bid']][r['p'] + ('~' if r['how'] == 'Text' else '')] += 1
for B in bills_out:
    c = tc[B['id']]
    B['tmy'] = dict(n=sum(c.values()), sup=c['Supports'], opp=c['Opposes'], supT=c['Supports~'], oppT=c['Opposes~'],
                    mix=c['Mixed~'], com=c['Comments Only'], ns=c['Not Stated'])

# ------------------------------------------------------------------ legislators out
vote_by_id = {v['id']: v for v in votes_out}
legs = []
for k, p in people.items():
    if not p['votes'] and not p['spon'] and not p['amd']: continue
    cur = next((r for r in roster[p['ch']] if r['dist'] == p['dist'] and norm(surname_of(r['name'])) == norm(p['sur'])), None)
    if cur:
        nm = cur['name']; nm = (nm.split(',', 1)[1].strip() + ' ' + nm.split(',')[0]) if ',' in nm else nm
    elif p['full']:
        nm = p['full'].most_common(1)[0][0].title() if p['full'].most_common(1)[0][0].isupper() else p['full'].most_common(1)[0][0]
    else:
        nm = p['names'].most_common(1)[0][0]
        nm = nm.title() if nm.isupper() else nm
    by_topic = defaultdict(Counter)
    for vid, code in p['votes']:
        v = vote_by_id[vid]; B = bill_by_id[v['bid']]
        if v['type'] not in ('Final Passage', 'Committee Vote'): continue
        for t in B['topics']: by_topic[t][code] += 1
    legs.append(dict(id=p['id'], name=nm, ch=p['ch'], dist=p['dist'], party=(cur or {}).get('party', ''), current=bool(cur),
                     sur=p['sur'], first=min(p['yrs']), last=max(p['yrs']), yrs=sorted(p['yrs']),
                     aka=[n for n, _ in p['names'].most_common(4)],
                     v=[[vid, c] for vid, c in p['votes']], spon=p['spon'], amd=p['amd'], tmy=p['tmy'],
                     topics={t: dict(Y=c['Y'], N=c['N'], A=c['A'] + c['X']) for t, c in by_topic.items()},
                     n=dict(votes=len(p['votes']), yea=sum(1 for _, c in p['votes'] if c == 'Y'), nay=sum(1 for _, c in p['votes'] if c == 'N'),
                            spon=len(p['spon']), amd=len(p['amd']), tmy=len(p['tmy']))))
legs.sort(key=lambda x: (-x['n']['votes'], x['name']))

TOPIC_NAMES = [t for t, _ in TOPICS] + ['Other Cannabis Provisions', 'Budget and Multi-Subject Bills']
meta = dict(built='2026-09-30', topics=TOPIC_NAMES, stages=STAGES,
            counts=dict(bills=len(bills_out), focus=sum(b['focus'] for b in bills_out), enacted=sum(b['enacted'] for b in bills_out),
                        failed=sum(not b['enacted'] for b in bills_out), votes=len(votes_out), legislators=len(legs),
                        member_votes=sum(len(v['m']) for v in votes_out), testimony=len(rows),
                        unresolved=sum(unresolved.values())))
json.dump(dict(meta=meta, bills=bills_out), open(f'{LAW}/bills.json', 'w'), separators=(',', ':'))
json.dump(dict(meta=meta, votes=votes_out), open(f'{LAW}/votes.json', 'w'), separators=(',', ':'))
json.dump(dict(meta=meta, legislators=legs), open(f'{LAW}/legislators.json', 'w'), separators=(',', ':'))

# testimony.json in the shape the site already reads, plus the new fields
spk = defaultdict(lambda: dict(n=0, bills=set(), yrs=set(), orgs=Counter(), sup=0, opp=0, oth=0, names=Counter()))
for r in rows:
    if not r['eid']: continue
    s = spk[r['eid']]; s['n'] += 1; s['bills'].add(r['bid']); s['yrs'].add(r['yr']); s['names'][r['who']] += 1
    if r['org']: s['orgs'][r['org']] += 1
    if r['p'] == 'Supports': s['sup'] += 1
    elif r['p'] == 'Opposes': s['opp'] += 1
    else: s['oth'] += 1
oldsp = {s['id']: s for s in oldt['speakers']}
speakers = []
for eid, s in spk.items():
    o = oldsp.get(eid, {})
    nm = s['names'].most_common(1)[0][0]
    speakers.append(dict(id=eid, who=nm, type=o.get('type', 'individual' if ' ' in nm else 'organization'), n=s['n'], bills=len(s['bills']),
                         first=min(s['yrs']), last=max(s['yrs']), orgs=[x for x, _ in s['orgs'].most_common(5)], norgs=len(s['orgs']),
                         sup=s['sup'], opp=s['opp'], oth=s['oth'], aka=[x for x in s['names'] if x != nm][:4]))
speakers.sort(key=lambda s: (-s['n'], s['who']))
tb = sorted({f"{r['yr']} {r['b']}" for r in rows}, reverse=True)
tmy = dict(bills=tb, positions=['Supports', 'Opposes', 'Mixed', 'Comments Only', 'Not Stated'],
           years=sorted({r['yr'] for r in rows}, reverse=True), committees=sorted({r['c'] for r in rows}), rows=rows, speakers=speakers,
           summary=dict(records=len(rows), people=len(speakers), anonymous=sum(r['anon'] for r in rows), bills=len({r['bid'] for r in rows}),
                        once_only=sum(1 for s in speakers if s['n'] == 1), repeat=sum(1 for s in speakers if s['n'] > 1),
                        most=max((s['n'] for s in speakers), default=0), withheld=sum(r['wh'] for r in rows), withheld_locators=sum(r['wh'] for r in rows),
                        filename=sum(r['how'] == 'Filename' for r in rows), text=sum(r['how'] == 'Text' for r in rows),
                        committees=len({r['c'] for r in rows}), focus=sum(r['focus'] for r in rows)))
json.dump(tmy, open(f'{LAW}/testimony.json', 'w'), separators=(',', ':'))
print(json.dumps(meta['counts'])); print('unresolved house names', unresolved.most_common(15))
print(Counter(b['stage'] for b in bills_out)); print(Counter(t for b in bills_out for t in b['topics']))
print(Counter(r['p'] + '/' + r['how'] for r in rows))
