import json, re, subprocess, os, concurrent.futures as cf, scrape
exec(open('tmytext.py').read().split('def one')[0].split('r = json.load')[0])
src = open('tmytext.py').read()
SUP = eval(re.search(r'SUP = (re\.compile\(.*?\))\n', src, re.S).group(1)); OPP = eval(re.search(r'OPP = (re\.compile\(.*?\))\n', src, re.S).group(1))
tx = json.load(open('tmytext.json'))
todo = [u for u, v in tx.items() if v['why'].startswith('no text layer')]
def one(u):
    p = scrape.fetch(u.replace(scrape.CANON, scrape.BASE).replace(' ', '%20'), binary=True)
    op = p + '.ocr.txt'
    if not os.path.exists(op):
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '150', '-gray', '-x', '0', '-y', '0', '-W', '1300', '-H', '1000', p, p + '.pg'], capture_output=True, timeout=120)
        img = next((p + '.pg' + s for s in ('-1.pgm', '-01.pgm', '-001.pgm') if os.path.exists(p + '.pg' + s)), None)
        if not img: return u, None
        subprocess.run(['tesseract', img, op[:-4], '--psm', '3', '--oem', '1'], capture_output=True, timeout=180)
        os.remove(img)
    x = re.sub(r'\s+', ' ', open(op, errors='ignore').read()) if os.path.exists(op) else ''
    s = [m.group(0) for m in SUP.finditer(x)]; o = [m.group(0) for m in OPP.finditer(x)]
    if s and not o: return u, dict(tp='Supports', why=s[0], ocr=True)
    if o and not s: return u, dict(tp='Opposes', why=o[0], ocr=True)
    if s and o: return u, dict(tp='Mixed', why=f'{s[0]} / {o[0]}', ocr=True)
    return u, dict(tp='', why='scanned image; no clear phrase after OCR' if len(x) > 40 else 'scanned image; OCR found no text', ocr=True)
with cf.ThreadPoolExecutor(2) as ex:
    for i, (u, v) in enumerate(ex.map(one, todo)):
        if v: tx[u] = v
        if i % 50 == 0: print(i, flush=True); json.dump(tx, open('tmytext.json', 'w'))
json.dump(tx, open('tmytext.json', 'w'))
from collections import Counter; print(Counter(v['tp'] for v in tx.values() if v.get('ocr')))
