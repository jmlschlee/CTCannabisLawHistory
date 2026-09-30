import json, subprocess, re, concurrent.futures as cf
def gq(q, v):
    body = json.dumps({"query": q, "variables": v})
    for _ in range(3):
        try: return json.loads(subprocess.run(['curl', '-s', '-m', '180', 'https://electionhistory.ct.gov/api/graphql_pr', '-H', 'content-type: application/json', '-d', body], capture_output=True, text=True).stdout)
        except Exception: pass
    return {}
Q = 'query($f: SearchFilters!, $p: Pagination!){ search(filters:$f, pagination:$p){ results { id office { name } event { startDate } eventTypeDisplayName division { displayName } candidates { displayName isWinner party { name } } } } }'
def year(y):
    F = {"global": {"years": {"from": y, "to": y}}, "ballotQuestions": {"text": "", "types": [], "number": "", "divisions": []},
         "contests": {"candidates": [], "divisions": [], "offices": []}, "specialElectionsOnly": False, "voterStats": False, "stages": []}
    out = []; page = 1
    while True:
        r = gq(Q, {"f": F, "p": {"page": page, "size": 96}})
        res = ((r.get('data') or {}).get('search') or {}).get('results') or []
        for x in res:
            if x.get('office') and re.search(r'State (Representative|Senator)', x['office']['name']): out.append(x)
        if len(res) < 96: break
        page += 1
    return y, out
allc = {}
with cf.ThreadPoolExecutor(4) as ex:
    for y, out in ex.map(year, range(2010, 2027)):
        allc[y] = out; print(y, len(out), flush=True)
json.dump(allc, open('elections.json', 'w'))
