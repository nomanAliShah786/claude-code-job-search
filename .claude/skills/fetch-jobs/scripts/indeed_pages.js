async (page) => {
  // Signed-in Indeed pagination, resumable. State lives in the about:blank store tab.
  const store = page;
  const w = page.context().pages().find(p => p !== store && p.url().includes('indeed.com'));
  const S = await store.evaluate(() => window.__search || {});
  const qs = S.queries || ['software engineer', 'senior software engineer', 'full stack developer', 'full stack engineer', 'software developer', 'senior software developer'];
  const host = S.indeedHost || 'ie.indeed.com';
  const loc = (S.locations || ['Ireland'])[0];
  const st = await store.evaluate(() => { window.__indeed = window.__indeed || {}; window.__pq = window.__pq || 0; window.__pstart = window.__pstart || 0; window.__runSeen = window.__runSeen || {}; window.__plog = window.__plog || []; return [window.__pq, window.__pstart]; });
  let [qi, start] = st, done = 0, blocked = null;
  const log = [];
  const sleep = ms => w.waitForTimeout(ms);
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [8000, 16000]);
  const read = async () => {
    for (let k = 0; k < 6; k++) {
      try {
        const r = await w.evaluate(() => (window.mosaic?.providerData?.["mosaic-provider-jobcards"]?.metaData?.mosaicProviderJobCardsModel?.results || [])
          .map(x => ({jk: x.jobkey, title: x.title, company: x.company, loc: x.formattedLocation, pub: x.pubDate})));
        if (r.length) return r;
      } catch (e) {}
      await sleep(1500);
    }
    return [];
  };
  while (qi < qs.length && done < 25) {
    const q = qs[qi];
    const url = `https://${host}/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}&fromage=30&start=${start}`;
    try { await w.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = 'goto error: ' + String(e).slice(0, 100); break; }
    let title = await w.title().catch(() => '');
    for (let k = 0; k < 10 && /moment|attention|verify|blocked/i.test(title); k++) { await sleep(4000); title = await w.title().catch(() => ''); }
    if (/moment|attention|verify|blocked|sign in/i.test(title) || w.url().includes('secure.indeed.com')) { blocked = `challenge on ${url}: ${title}`; break; }
    const res = await read();
    if (!res.length) {
      const body = await w.evaluate(() => document.body.innerText).catch(() => '');
      if (!/did not match any jobs|no jobs found|(^|[^\d,])0 jobs/i.test(body)) { blocked = `0 cards (likely check) on ${url}: ${await w.title().catch(() => '')}`; break; }
    }
    const [fresh, newToQuery] = await store.evaluate(([rs, q]) => { const rs2 = window.__runSeen[q] = window.__runSeen[q] || {}; let a = 0, b = 0; for (const r of rs) { const e = window.__indeed[r.jk]; if (!e) { window.__indeed[r.jk] = {...r, queries: [q]}; a++; } else if (!e.queries.includes(q)) e.queries.push(q); if (!rs2[r.jk]) { rs2[r.jk] = 1; b++; } } return [a, b]; }, [res, q]);
    // Indeed's last page repeats the previous one; stop a query when a page brings nothing new to it.
    const line = `${q} start=${start}: ${res.length} cards, ${newToQuery} new this run, ${fresh} new overall`; log.push(line); await store.evaluate(l => window.__plog.push(l), line);
    done++;
    if (!res.length || newToQuery === 0) { qi++; start = 0; } else start += 10;
    await store.evaluate(([a, b]) => { window.__pq = a; window.__pstart = b; }, [qi, start]);
    await sleep(DMIN + Math.random() * (DMAX - DMIN));
  }
  const total = await store.evaluate(() => Object.keys(window.__indeed).length);
  return {query: qs[qi] || 'finished', start, done, total, blocked, log: log.slice(-8)};
}
