"""Merge all sources into one deduplicated ad set: combined.jsonl."""
"""Usage: python3 combine.py <run folder>. Reads <run folder>/raw/, writes <run folder>/combined.jsonl."""
import collections, json, os, re, sys

OUT_DIR = sys.argv[1]
R = os.path.join(OUT_DIR, "raw") + "/"


def load(path):
    if not os.path.exists(path):
        return {}
    d = json.load(open(path))
    return json.loads(d) if isinstance(d, str) else d


ads = []
# LinkedIn
for l in (open(R + "linkedin_ads.jsonl") if os.path.exists(R + "linkedin_ads.jsonl") else []):
    j = json.loads(l)
    ads.append({"source": "LinkedIn", "id": "li-" + j["id"], "title": j["title"], "company": j["company"],
                "location": j["location"], "date": j["date"], "description": j["description"]})
# Indeed
cards = {c["jk"]: c for c in (load(R + "indeed_search.json") or [])}
for jk, d in load(R + "indeed_ads.json").items():
    c = cards.get(jk, {})
    ads.append({"source": "Indeed", "id": "in-" + jk, "title": d.get("title") or c.get("title", ""), "company": d.get("company") or c.get("company", ""),
                "location": (d.get("location") or c.get("loc", "")) + ", Ireland", "date": "", "description": d.get("description", "")})
# IrishJobs and Jobs.ie (same platform and job IDs)
for src, path in (("IrishJobs.ie", "irishjobs_ads.json"), ("Jobs.ie", "jobsie_ads.json")):
    for u, d in load(R + path).items():
        if d.get("missing"):
            continue
        ads.append({"source": src, "id": "sj-" + re.search(r"job(\d+)$", u).group(1), "title": d["title"], "company": d["company"],
                    "location": d["location"].replace(", IE", ", Ireland") if d["location"] else "Ireland", "date": d.get("date", ""), "description": d["description"]})
# Glassdoor
try:
    gcards = {c["id"]: c for c in (load(R + "glassdoor_search.json") or [])}
    for gid, d in load(R + "glassdoor_ads.json").items():
        c = gcards.get(gid, {})
        ads.append({"source": "Glassdoor", "id": "gd-" + gid, "title": d.get("title") or c.get("title", ""), "company": d.get("company") or c.get("company", ""),
                    "location": (d.get("location") or c.get("location", "")) + ", Ireland", "date": d.get("date", ""), "description": d.get("description", "")})
except FileNotFoundError:
    pass

# RecruitIreland (text taken from the page, no structured data)
for h, d in load(R + "recruitireland_ads.json").items():
    if d:
        ads.append({"source": "RecruitIreland", "id": "ri-" + h.rstrip("/").split("-")[-1], "title": d["title"], "company": d["company"],
                    "location": d.get("location") or "Ireland", "date": d.get("date", ""), "description": d["description"]})

print("raw", collections.Counter(a["source"] for a in ads))

NI = re.compile(r"northern ireland|united kingdom|belfast|derry|londonderry|antrim|armagh|tyrone|fermanagh|newry|lisburn|\bGB\b|\bUK\b", re.I)
ROLE = re.compile(r"software\s+(engineer|developer|development\s+engineer)|full[\s-]?stack|\bSDE\b|\bSWE\b", re.I)
JUNIOR = re.compile(r"\b(intern|internship|graduate|grad|student|apprentice|placement|summer)\b", re.I)
MGMT = re.compile(r"\b(manager|director|head of|vice president|VP|chief)\b", re.I)
NOT_SW = re.compile(r"\b(recruit|sales|account executive|mechanical|electrical|PLC|SCADA)\b", re.I)


def norm_co(c):
    # First word of the company name, so "J.P. Morgan" and "JPMorgan Chase & Co." or "Cisco" and "Cisco Systems" match.
    c = re.sub(r"[^a-z0-9 ]", "", c.lower().replace("j.p.", "jp").replace("jp morgan", "jpmorgan"))
    k = (c.split() or [""])[0]
    return "jpmorgan" if k.startswith("jpmorgan") else k


def norm_title(t):
    t = t.lower()
    t = re.split(r"\s[-\u2013\u2014|]\s|\(|,", t)[0]
    t = re.sub(r"\b(sr|snr)\b\.?", "senior", t)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def words(t):
    return set(re.findall(r"[a-z0-9+#]{3,}", t.lower()))


dropped = collections.Counter()
kept = []
for a in ads:
    if not a["description"] or len(a["description"]) < 200:
        dropped["no description"] += 1; continue
    if NI.search(a["location"]):
        dropped["outside Republic of Ireland"] += 1; continue
    if not ROLE.search(a["title"]):
        dropped["other title"] += 1; continue
    if JUNIOR.search(a["title"]):
        dropped["intern/graduate"] += 1; continue
    if MGMT.search(a["title"]):
        dropped["manager/director"] += 1; continue
    if NOT_SW.search(a["title"]):
        dropped["non-software"] += 1; continue
    kept.append(a)

# Cross-source and repost dedupe: same company and >= 60% word overlap in the description.
PRIORITY = {"LinkedIn": 0, "Indeed": 1, "IrishJobs.ie": 2, "Jobs.ie": 3, "Glassdoor": 4, "RecruitIreland": 5}
kept.sort(key=lambda a: (PRIORITY.get(a["source"], 9), -len(a["description"])))
by_co = collections.defaultdict(list)
final = []
for a in kept:
    ws = words(a["description"])
    dup = None
    for b, bws in by_co[norm_co(a["company"])]:
        J = len(ws & bws) / max(1, len(ws | bws))
        ta, tb = norm_title(a["title"]), norm_title(b["title"])
        same_title = ta == tb or (min(len(ta), len(tb)) >= 12 and (ta in tb or tb in ta))
        if (same_title and J >= 0.6) or J >= 0.85:
            dup = b; break
    if dup:
        dup.setdefault("also_on", set()).add(a["source"])
        dropped["duplicate (same ad on another site or reposted)"] += 1
        continue
    a["also_on"] = set()
    by_co[norm_co(a["company"])].append((a, ws))
    final.append(a)

SENIOR = re.compile(r"\b(senior|sr\.?|lead|staff|principal)\b", re.I)
for a in final:
    a["group"] = "fullstack" if re.search(r"full[\s-]?stack", a["title"], re.I) else ("senior" if SENIOR.search(a["title"]) else "swe")
    a["also_on"] = sorted(a["also_on"])

with open(os.path.join(OUT_DIR, "combined.jsonl"), "w") as f:
    for a in final:
        f.write(json.dumps(a) + "\n")
print("kept", len(final), collections.Counter(a["source"] for a in final))
print("groups", collections.Counter(a["group"] for a in final))
print("dropped", dict(dropped))
print("on 2+ sites", sum(1 for a in final if a["also_on"]))
