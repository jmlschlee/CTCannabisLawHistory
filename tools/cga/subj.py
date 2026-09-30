import re, json, subprocess, html, concurrent.futures as cf
B='https://prdext3.cga.ct.gov/asp/cgasubjectsearch/'
def get(u):
    for i in range(4):
        r=subprocess.run(['curl','-sS','-m','60','-g',u],capture_output=True,text=True,errors='ignore').stdout
        if len(r)>20000: return r
    return r
KW=re.compile(r'cannabis|marijuana|marihuana|hemp|cannabinoid',re.I)
def year(y):
    subs={}
    for L in 'CHMDT':
        s=get(f'{B}default.asp?which_year1={y}&LeadingChar={L}')
        for code,txt in re.findall(r'subbills\.asp\?subj_code=(\d+)&which_year1=\d+>(.*?)</a>',s,flags=re.S):
            t=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>','',txt))).strip()
            if KW.search(t): subs[code]=t
    out={}
    for code,t in subs.items():
        s=get(f'{B}subbills.asp?subj_code={code}&which_year1={y}')
        for b in set(re.findall(r'\b([HS]B)\s*-?\s*0*(\d{2,5})\b',s)):
            out.setdefault(f'{y}|{b[0]}-{int(b[1]):05d}',[]).append(t)
    return y,subs,out
res={}
with cf.ThreadPoolExecutor(4) as ex:
    for y,subs,out in ex.map(year,range(2012,2027)):
        print(y,len(subs),list(subs.values())[:6],len(out)); res.update(out)
json.dump(res,open('subjbills.json','w'),indent=0)
