# CT Cannabis Law: Timeline and Influence Map

A public, searchable record of how Connecticut cannabis law changed between 2012 and 2027 — what
changed, when it took effect, which bill carried it, who testified for and against, which agency
implemented it, and what the public record does and does not show about influence.

Statutory text on this site comes from the **enacted public acts**, never from the General
Assembly's published chapter pages, which lag the session. The site says why, with a worked
example, on its methodology page.

**No records request in this project has been sent to anyone.**

---

## What is in here

| Thing | Where |
|---|---|
| 17 web pages | the `.html` files in this folder |
| Styling and behavior | `assets/` — one CSS file, two JavaScript files |
| The data the pages read | `data/` — 13 JSON files |
| The same data as spreadsheets | `downloads/` — 22 CSV files, 1 workbook, 1 PDF report |
| Netlify settings | `netlify.toml`, `_headers`, `_redirects` |

What the site covers: 463 enacted legal changes across 16 public acts, 23 bills (7 of which did
not pass), 110 statute sections, 683 testimony filings by 504 named parties, 1,035 influence
events, and 12 logged gaps — 2 of them closed from the public record, 10 still open.

**There is no build step.** No npm, no Node, no compiler, no framework. The files you see are the
files the browser gets. That is deliberate: a site with no build step cannot break because a
dependency changed, and it will still deploy in five years.

---

## Put it online — pick ONE of these three

### Option 1 — Drag and drop (fastest, no GitHub, about 30 seconds)

Best if you just want it live today.

1. Zip this folder. On a Mac, right-click it → **Compress**. On Windows, right-click →
   **Send to** → **Compressed (zipped) folder**.
2. Go to **https://app.netlify.com/drop**
3. Drag the zip onto the page.
4. Done. Netlify shows you a URL like `https://gleaming-torte-a1b2c3.netlify.app`.

To rename it: in Netlify, **Site configuration** → **Change site name**.

To update the site later, drag a new zip onto the same site's **Deploys** tab.

> A zip built for exactly this is included with the delivery:
> `ct-cannabis-law-site-netlify-drop.zip`. You can drop that one directly.

---

### Option 2 — GitHub in the browser, then Netlify (no command line at all)

Best if you want a permanent home with version history and automatic redeploys, but you would
rather not touch a terminal.

**Step A — make the repository**

1. Go to **https://github.com/new**
2. Repository name: `ct-cannabis-law` (anything you like).
3. Choose **Public** or **Private** — either works with Netlify.
4. Leave every checkbox unticked. Do **not** add a README; this folder has one.
5. Click **Create repository**.

**Step B — upload the files**

6. On the new empty repository page, click the link **uploading an existing file**.
   (Direct URL: `https://github.com/YOUR-NAME/ct-cannabis-law/upload/main`)
7. Open this folder on your computer, select **everything inside it** — all the `.html` files and
   the `assets`, `data` and `downloads` folders — and drag them onto the GitHub page.
   Select the *contents*, not the folder itself, or every path gets an extra level and the site
   will 404.
8. GitHub uploads folders correctly by drag-and-drop. Wait for all of them to finish listing.
9. In **Commit changes**, type `Initial commit`, then click **Commit changes**.

> GitHub's web uploader caps a single upload at 100 files. This folder has fewer than 60, so one
> pass is enough. If it ever complains, upload `downloads/` by itself in a second commit.

**Step C — connect Netlify**

10. Go to **https://app.netlify.com** and sign in (you can sign in *with GitHub*).
11. **Add new site** → **Import an existing project** → **GitHub**.
12. Authorize Netlify, then pick your repository.
13. Netlify reads `netlify.toml` and fills the settings in for you. Confirm they say:
    - **Build command** — empty
    - **Publish directory** — `.`
14. Click **Deploy site**.

From now on, every change you commit on GitHub redeploys the site automatically.

---

### Option 3 — Push from your own computer (git command line)

Best if you are comfortable in a terminal. This folder is already an initialized git repository
with the first commit made, so there is nothing to set up.

```sh
cd ct-cannabis-law-site
git log --oneline          # you should see one commit already here
```

Create an empty repository on GitHub first (Step A above — no README, no .gitignore), then:

```sh
./push.sh https://github.com/YOUR-NAME/ct-cannabis-law.git
```

`push.sh` sets the remote and pushes `main`. Git will ask for your username and password; for the
password, GitHub wants a **personal access token**, not your account password. Your credentials go
from your keyboard to GitHub and nowhere else.

Then connect Netlify with Step C above.

> **If you pasted a token into a chat, a document, or an email — revoke it.**
> github.com/settings/tokens → find it → **Delete**. A token is a password. Anyone who reads it
> has whatever access it was granted, and tokens do not expire on their own unless you set them to.
> Make a new one when you need it, give it the narrowest scope that works (`public_repo` for a
> public repository), and set an expiry date.

---

## Use your own domain

In Netlify: **Domain management** → **Add a domain you own** → type it → follow the DNS
instructions Netlify prints. HTTPS is issued automatically and free; it can take a few minutes.

---

## Check it locally before you publish

You need a local web server — opening `index.html` by double-clicking will **not** work, because
browsers refuse to let a `file://` page load the JSON in `data/`. Any of these works:

```sh
python3 -m http.server 8080     # then open http://localhost:8080
npx serve .                     # if you have Node
```

---

## Changing things

**Text on a page** — edit the `.html` file. Each page's content is plain HTML near the top of the
file; the `<script type="module">` block at the bottom is what fills in the data.

**Colors, spacing, type** — `assets/app.css`. Everything is a custom property defined at the top
under `:root`, with dark mode values right below it. Change a value in one place and it changes
everywhere. The palette was validated for color-vision deficiency and contrast; if you change the
categorical colors, validate the new set rather than trusting how it looks.

**Navigation** — the `NAV` array at the top of `assets/app.js`. The header, the "More" menu and
the footer on every page are generated from it, so adding a page means adding one line there.
The `PRIMARY` array just below it decides which links get a permanent slot in the top bar and
which sit behind "More".

**The data** — do not hand-edit `data/*.json`. Those files are generated from the CSVs in the
research project. Editing them by hand means a figure on a page can quietly disagree with the CSV
a reader downloads, which is the one failure this project is organized to prevent.

---

## How to read the data

Every file in `downloads/` is UTF-8 with a header row and one record per line.

- Columns ending `_id` join across files.
- `source_id` joins any row to `sources_ledger.csv`, which names the document, who holds it, the
  exact citation, and what the document cannot be used for.
- `bill_id` joins bills, amendments, votes and testimony.
- `issue_id` joins anything to one of the 14 issues.
- Dates are `YYYY-MM-DD`. A blank date means the source record did not state one — never that the
  event has no date.
- `reliability_tier` tells you how far a row can be pushed. Tier 3 lags the session and is never
  relied on for current law.

Read `guardrails.html` before publishing anything derived from these files. It lists the claims
the record does **not** support, and the language that says only what the evidence carries.

---

## Accessibility and privacy

Every page works from the keyboard, carries a skip link, labels its own controls, and never uses
color as the only way to tell two things apart. Charts print their values as text beside the
marks, and every chart has a table equivalent. Light and dark are both designed, not flipped.

The site loads nothing from any third party — no fonts, no analytics, no trackers, no CDN. It
stores one thing in the browser: your light/dark choice.

---

Built from primary public records. CT Cannabis Record Package.
