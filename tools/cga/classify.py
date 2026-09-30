import json, re
r = json.load(open('raw.json')); P = json.load(open('purpose.json'))
FOCUS = re.compile(r'cannabis|marijuana|marihuana|\bhemp\b|cannabinoid|\bTHC\b', re.I)
TAGS = [
 ('Criminal Penalties', r'class [a-e] (misdemeanor|felony)|guilty of|imprison|criminal penalt|crime of|felony'),
 ('Fines and Civil Penalties', r'infraction|civil penalt|fined? (of )?not (more|less) than|\bfines?\b|penalt(y|ies) for'),
 ('Police Stops, Searches and Odor', r'odor|smell|stop or search|investigatory stop|probable cause|search of a (person|motor)'),
 ('Enforcement Powers and Task Forces', r'enforcement|task force|seiz|cease and desist|inspection|injunct|attorney general'),
 ('Nuisance and Public Use', r'nuisance|public (use|consumption|place)|smok(e|ing) (from|in)|multi(-| )?(unit|family)|landlord|lease'),
 ('Impaired Driving', r'driv|motor vehicle|impair|roadside'),
 ('Legalization and Retail', r'legaliz|retail sale|adult[- ]use|recreational|regulation and taxation of the'),
 ('Medical Access', r'palliative|qualifying patient|caregiver|debilitating|medical (marijuana|cannabis)|terminally ill'),
 ('Home Grow and Possession', r'home (grow|cultivat)|possession limit|possess(ion)? of (a )?small|grow (plants|cannabis)'),
 ('Decriminalization, Erasure and Sentencing', r'decriminaliz|erasure|erase|modification of sentence|sentence modification|pardon'),
 ('Social Equity', r'social equity|equity joint venture|community reinvestment|disproportionately impacted'),
 ('Taxes and Revenue', r'\btax|excise|revenue'),
 ('Licensing and Business Rules', r'licens|cultivator|dispensar|retailer|producer|backer|advertis|packag|label'),
 ('Hemp and Intoxicating Hemp', r'\bhemp|cannabinoid|infused beverage|moderate-thc|high-thc'),
 ('Youth and Prevention', r'youth|minor|under (the age of )?21|prevention|school'),
 ('Workplace and Labor', r'employ|workplace|labor|wage'),
 ('Studies and Reports', r'\bstudy|report|working group|feasibility'),
]
ACCESS_WORDS = r'legaliz|allow|authoriz(e|ing) .{0,40}(cannabis|marijuana|patient|use)|expand|add .{0,40}debilitating|qualifying patient|caregiver|decriminaliz|erasure|erase|reduc(e|ing) (the )?penalt|repeal(ing)? (the )?(penalt|prohibition)|home grow|social equity|delivery|modif(y|ication of) (a )?sentence|terminally ill|patients? to use'
RESTRICT_WORDS = r'prohibit|restrict|penalt|infraction|misdemeanor|felony|fine|enforcement|task force|seiz|nuisance|odor|stop or search|ban|limit(ing)? the (potency|number)|cap on|cause of action against|require .{0,40}warning'
out = {}
for k, b in r.items():
    p = P.get(k, {}); text = ' '.join([b['title'], p.get('purpose', ''), p.get('summary', '')[:1800]])
    tags = [t for t, rx in TAGS if re.search(rx, text, re.I)]
    a = [m.group(0) for m in re.finditer(ACCESS_WORDS, text, re.I)][:3]
    x = [m.group(0) for m in re.finditer(RESTRICT_WORDS, text, re.I)][:3]
    d = 'Mixed' if a and x else 'Expands Access' if a else 'Adds Penalties or Enforcement' if x else 'Regulation, Tax or Study'
    out[k] = dict(tags=tags, auto=d, a=a, x=x, focus=bool(FOCUS.search(b['title'])))
json.dump(out, open('classes.json', 'w'), indent=0)
from collections import Counter
print(Counter(v['auto'] for v in out.values() if v['focus']))
