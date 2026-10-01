import os, random, subprocess, sys, time

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"


def get(url, tries=6):
    """Fetch via curl (Python's SSL store rejects the local proxy cert). Returns body, '' on 400/404, None on failure."""
    for i in range(tries):
        r = subprocess.run(["curl", "-s", "-A", UA, "-w", "\n%{http_code}", "--max-time", "30", url],
                           capture_output=True, text=True, errors="replace")
        body, _, code = r.stdout.rpartition("\n")
        if code == "200":
            return body
        if code in ("400", "404"):
            return ""
        wait = 5 * (i + 1)
        print(f"  HTTP {code or r.returncode}, retry in {wait}s", file=sys.stderr)
        time.sleep(wait)
    return None


def pause(default):
    """Sleep a random gap between requests. FETCH_DELAY="min-max" (seconds) overrides the default range."""
    lo, hi = map(float, os.environ.get("FETCH_DELAY", default).split("-"))
    time.sleep(random.uniform(lo, hi))
