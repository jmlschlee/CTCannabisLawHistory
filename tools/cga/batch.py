import json, os, re, traceback, concurrent.futures as cf, scrape
T = json.load(open('targets.json'))
out = json.load(open('raw.json')) if os.path.exists('raw.json') else {}
def one(k):
    if k in out and out[k].get('ok'): return k, out[k]
    y, b = k.split('|'); num = b.replace('-', '')
    num = num[:2] + str(int(num[2:]))
    try:
        r = scrape.full(y, num); r['ok'] = True; return k, r
    except Exception as e:
        return k, dict(ok=False, err=traceback.format_exc()[-600:])
with cf.ThreadPoolExecutor(6) as ex:
    for i, (k, r) in enumerate(ex.map(one, T)):
        out[k] = r
        print(i, k, r.get('ok'), len(r.get('votes') or []), len(r.get('tmy') or []), flush=True)
        if i % 10 == 0: json.dump(out, open('raw.json', 'w'))
json.dump(out, open('raw.json', 'w'))
print('fail', [k for k, v in out.items() if not v.get('ok')])
