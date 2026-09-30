"""Write the CSV downloads from the site's JSON."""
import csv, json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/../..')
D = lambda n: json.load(open(f'data/{n}.json'))
B = D('bills')['bills']; V = D('votes')['votes']; L = D('legislators')['legislators']; T = D('testimony')
DIRS = D('bills')['meta']['dirs']; LG = {l['id']: l for l in L}; BB = {b['id']: b for b in B}
def w(name, header, rows):
    with open('downloads/' + name, 'w', newline='', encoding='utf-8') as fh:
        cw = csv.writer(fh); cw.writerow(header); cw.writerows(rows)
w('bills.csv', ['bill', 'session_year', 'title', 'direction', 'statement_of_purpose', 'topics', 'special_sections', 'furthest_stage', 'public_act', 'cannabis_focused', 'introduced_by', 'cosponsors', 'testimony_total', 'supports_filename', 'supports_read_from_text', 'opposes_filename', 'opposes_read_from_text', 'recorded_votes', 'amendments', 'amendments_never_called', 'first_action', 'last_action', 'bill_status_url'],
  [[b['num'], b['yr'], b['title'], DIRS.get(b['dir'], 'Budget or multi-subject bill'), b['purpose'], '; '.join(b['topics']), '; '.join(b['spot']), b['stage'], b['pa'], b['focus'],
    '; '.join(s['n'] for s in b['spon'] if s['role'] == 'Introduced') or b['by'], '; '.join(s['n'] for s in b['spon'] if s['role'] == 'Co-Sponsor'),
    b['tmy']['n'], b['tmy']['sup'], b['tmy']['supT'], b['tmy']['opp'], b['tmy']['oppT'], len(b['votes']), len(b['amds']), sum(1 for a in b['amds'] if not a['called']), b['first'], b['last'], b['l']] for b in B])
w('votes.csv', ['vote_id', 'bill', 'session_year', 'date', 'taken_in', 'kind', 'vote_type', 'type_inferred_from_vote_order', 'on_amendment_lco', 'committee_action', 'label', 'result', 'yea', 'nay', 'absent_or_abstain', 'record_url'],
  [[v['id'], BB[v['bid']]['num'], v['yr'], v['date'], v['body'], v['kind'], v['type'], v['inf'], v.get('amd', ''), v['action'], v['label'], v['res'], v['t']['y'], v['t']['n'], v['t']['a'], v['u']] for v in V])
VM = {'Y': 'Yea', 'N': 'Nay', 'A': 'Absent or abstained', 'X': 'Absent'}
w('member_votes.csv', ['vote_id', 'bill', 'session_year', 'date', 'taken_in', 'vote_type', 'legislator_id', 'legislator', 'party', 'chamber', 'district', 'member_vote', 'record_url'],
  [[v['id'], BB[v['bid']]['num'], v['yr'], v['date'], v['body'], v['type'], m[0], (LG[m[0]]['name'] if m[0] else m[2]), (LG[m[0]]['party'] if m[0] else ''), (LG[m[0]]['ch'] if m[0] else 'House'), (LG[m[0]]['dist'] if m[0] else ''), VM[m[1]], v['u']] for v in V for m in v['m']])
w('legislators.csv', ['legislator_id', 'name', 'chamber', 'district', 'party', 'serving_2026', 'first_year', 'last_year', 'votes', 'yea', 'nay', 'pro_cannabis_votes', 'anti_cannabis_votes', 'sponsored_access_bills', 'sponsored_enforcement_bills', 'bills_sponsored', 'amendments_offered', 'testimony_filed', 'printed_as'],
  [[l['id'], l['name'], l['ch'], l['dist'], l['party'], l['current'], l['first'], l['last'], l['n']['votes'], l['n']['yea'], l['n']['nay'], l['stance']['pro'], l['stance']['anti'], l['stance']['sponE'], l['stance']['sponR'], l['n']['spon'], l['n']['amd'], l['n']['tmy'], '; '.join(l['aka'])] for l in L])
w('amendments.csv', ['bill', 'session_year', 'lco', 'chamber', 'schedule', 'label', 'called', 'result', 'result_date', 'offered_by', 'olr_description', 'amendment_text_begins', 'roll_call_vote_id', 'amendment_url'],
  [[b['num'], b['yr'], a['lco'], a['ch'], a['sched'], a['lab'], a['called'], a['res'], a['resd'], '; '.join(o['n'] for o in a['by']), a['eff'], a['open'], a['vote'], a['u']] for b in B for a in b['amds']])
w('testimony.csv', ['testimony_id', 'session_year', 'bill', 'committee', 'who_filed', 'who_filed_type', 'role_as_filed', 'organization_as_filed', 'position', 'position_source', 'phrase_matched', 'cannabis_focused_bill', 'document_url'],
  [[r['id'], r['yr'], r['b'], r['c'], r['who'], r['k'], r['role'], r['org'], r['p'], r['how'], r['q'], r['focus'], r['u']] for r in T['rows']])
w('stances_testimony.csv', ['person_id', 'name', 'type', 'organizations', 'filings', 'pro_cannabis_positions', 'anti_cannabis_positions'],
  [[s['id'], s['who'], s['k'], '; '.join(s['orgs']), s['n'], s['st']['pro'], s['st']['anti']] for s in T['speakers']])
dl = json.load(open('data/downloads.json')); names = {f['f'] for f in dl['files']}
for f in ['member_votes.csv', 'legislators.csv', 'stances_testimony.csv']:
    if f not in names: dl['files'].append({'f': f})
for f in dl['files']:
    p = 'downloads/' + f['f']; f['bytes'] = os.path.getsize(p)
    if p.endswith('.csv'): f['rows'] = sum(1 for _ in csv.reader(open(p, encoding='utf-8'))) - 1
dl['files'].sort(key=lambda f: f['f']); json.dump(dl, open('data/downloads.json', 'w'))
print('ok', len(dl['files']))
