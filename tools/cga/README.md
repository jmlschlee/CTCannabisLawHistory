# How the bill, vote and testimony data was built

These scripts pulled every cannabis bill from 2012 to 2026 from the Connecticut General Assembly
and turned it into `data/bills.json`, `data/votes.json`, `data/legislators.json` and
`data/testimony.json`. They were run in a scratch folder; the paths at the top of each file point
there, so set them before running again.

1. `subj.py` — lists every bill filed under Marijuana, Hemp or the marijuana tax in the CGA
   "Bills by Subject" index, 2012 to 2026.
2. `batch.py` — runs `scrape.py` on every bill: status page, history, sponsors, committee tally
   sheets and floor roll calls (member by member), amendments ("Offered by") and the testimony list
   for every committee. Every roll call is checked against the totals printed on it.
3. `tmytext.py`, then `ocr.py` — for testimony with no position in the filename, reads the first
   pages of the PDF (with text recognition for scans) for a plain statement of support or opposition.
4. `build_law.py` — assigns topics, matches House roll-call surnames to districts, and writes the
   JSON the site reads.
5. `scrub.py` — keeps the site owner's name off the site.

Requires Python 3, `curl`, `pdftotext` and `pdftoppm` (poppler) and `tesseract`. The mirror host
`prdext3.cga.ct.gov` serves the same files as `www.cga.ct.gov`.
