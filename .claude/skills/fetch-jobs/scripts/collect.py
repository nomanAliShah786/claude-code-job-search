"""Collect LinkedIn public job search results for Ireland (last 30 days)."""
import html, json, re, sys, time, urllib.parse
from collect_util import get, pause

# UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
QUERIES = [
    "full stack developer", "full stack engineer", "fullstack developer",
    "software engineer", "senior software engineer",
    "software developer", "senior software developer",
]
OUT = "linkedin_search.jsonl"


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


seen = {}
for q in QUERIES:
    start, empty = 0, 0
    while start < 1000:
        url = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?"
               + urllib.parse.urlencode({"keywords": q, "location": "Ireland", "f_TPR": "r2592000", "start": start}))
        page = get(url)
        if page is None:
            print(f"{q} start={start}: gave up", file=sys.stderr)
            break
        cards = re.split(r'(?=<li>)', page)
        n = 0
        for c in cards:
            m = re.search(r'urn:li:jobPosting:(\d+)', c)
            if not m:
                continue
            n += 1
            jid = m.group(1)
            title = re.search(r'base-search-card__title">(.*?)</h3>', c, re.S)
            comp = re.search(r'base-search-card__subtitle">(.*?)</h4>', c, re.S)
            loc = re.search(r'job-search-card__location">(.*?)</span>', c, re.S)
            date = re.search(r'datetime="([^"]+)"', c)
            if jid not in seen:
                seen[jid] = {"id": jid, "title": text(title.group(1)) if title else "",
                             "company": text(comp.group(1)) if comp else "",
                             "location": text(loc.group(1)) if loc else "",
                             "date": date.group(1) if date else "", "queries": [q]}
            elif q not in seen[jid]["queries"]:
                seen[jid]["queries"].append(q)
        print(f"{q} start={start}: {n} cards, total unique {len(seen)}", file=sys.stderr)
        if n == 0:
            empty += 1
            if empty >= 2:
                break
        else:
            empty = 0
        start += 10 if n else 10
        pause("1.2-1.2")

with open(OUT, "w") as f:
    for j in seen.values():
        f.write(json.dumps(j) + "\n")
print(len(seen))
