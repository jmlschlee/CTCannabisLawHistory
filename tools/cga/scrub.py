import json, re
D='/home/claude/law/data'
import os
RX=re.compile(os.environ.get('WITHHOLD_NAMES', r'(?!x)x'), re.I)  # names to keep off the site, e.g. WITHHOLD_NAMES='smith|jones'
d=json.load(open(f'{D}/influence.json'))
hit_ids=set()
for r in d['rows']:
    if RX.search(json.dumps(r)):
        hit_ids.add(r['aid']); r.update(a='Name Withheld', aid='WITHHELD', l='Filing withheld at the site owner\'s request', atype='individual')
still=set(r['aid'] for r in d['rows'])|set(r['tid'] for r in d['rows'])
d['actors']=[a for a in d['actors'] if not RX.search(json.dumps(a)) and (a['id'] not in hit_ids or a['id'] in still)]
json.dump(d,open(f'{D}/influence.json','w'),separators=(',',':'))
e=json.load(open(f'{D}/entities.json'))
for k,v in e.items():
    if isinstance(v,list): e[k]=[x for x in v if not RX.search(json.dumps(x))]
json.dump(e,open(f'{D}/entities.json','w'),separators=(',',':'))
tl=json.load(open(f'{D}/timeline.json'))
for k,v in tl.items():
    if isinstance(v,list): tl[k]=[x for x in v if not RX.search(json.dumps(x))]
json.dump(tl,open(f'{D}/timeline.json','w'),separators=(',',':'))
print(len(hit_ids), 'actors scrubbed')
