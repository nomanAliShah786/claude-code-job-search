"""Fetch the full description for every job in search.jsonl. Resumable."""
import html, json, os, random, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from collect_util import TITLE_RE, get, in_country, pause

OUT = "linkedin_ads.jsonl"
done = set()
if os.path.exists(OUT):
    with open(OUT) as f:
        done = {json.loads(l)["id"] for l in f}

jobs = [json.loads(l) for l in open("linkedin_search.jsonl")]
ROLE = re.compile(TITLE_RE, re.I)
jobs = [j for j in jobs if ROLE.search(j["title"]) and in_country(j["location"])]
todo = [j for j in jobs if j["id"] not in done]
print(f"{len(todo)} to fetch, {len(done)} done", file=sys.stderr)


def to_text(s):
    s = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>|</div>", "\n", s)
    s = re.sub(r"<li[^>]*>", "\n- ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\xa0]+", " ", s)
    return re.sub(r"\n\s*\n+", "\n", s).strip()


def fetch(j):
    pause("2-6")
    page = get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{j['id']}")
    if not page:
        return None
    m = re.search(r'show-more-less-html__markup[^>]*>(.*?)</div>\s*<button', page, re.S)
    j["description"] = to_text(m.group(1)) if m else ""
    crit = re.findall(r'job-criteria-subheader">\s*(.*?)\s*</h3>\s*<span[^>]*>\s*(.*?)\s*</span>', page, re.S)
    j["criteria"] = {html.unescape(k.strip()): html.unescape(v.strip()) for k, v in crit}
    return j


with open(OUT, "a") as f, ThreadPoolExecutor(2) as ex:
    for i, j in enumerate(ex.map(fetch, todo)):
        if j and j["description"]:
            f.write(json.dumps(j) + "\n")
            f.flush()
        if i % 25 == 0:
            print(f"{i}/{len(todo)}", file=sys.stderr)
