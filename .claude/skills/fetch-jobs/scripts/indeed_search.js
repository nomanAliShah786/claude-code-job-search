async (page) => {
  // Resumable Indeed search collector. State lives in the about:blank store tab (tab 0).
  const store = page;
  const ctx = page.context();
  const w = ctx.pages().find(p => p !== store && p.url().includes('indeed.com')) || await ctx.newPage();
  const qs = ['full stack developer', 'full stack engineer', 'software engineer', 'senior software engineer', 'software developer', 'senior software developer'];
  const locs = ['Ireland', 'Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Athlone'];
  const variants = ['', '&sort=date', '&sort=date&fromage=7', '&sort=date&fromage=3', '&sc=0kf%3Aexplvl(SENIOR_LEVEL)%3B', '&sc=0kf%3Aexplvl(MID_LEVEL)%3B',
                    '&sc=0kf%3Ajt(contract)%3B', '&sc=0kf%3Ajt(fulltime)%3B', '&sc=0kf%3Aattr(DSQF7)%3B', '&sort=date&sc=0kf%3Aexplvl(SENIOR_LEVEL)%3B'];
  const combos = [];
  for (const q of qs) for (const l of locs) for (const v of variants) combos.push([q, l, v]);
  const st = await store.evaluate(() => { window.__indeed = window.__indeed || {}; window.__cursor = window.__cursor || 0; window.__skip = window.__skip || {}; return {cursor: window.__cursor, skip: window.__skip}; });
  let cursor = st.cursor, done = 0, blocked = null;
  const skip = st.skip;
  const sleep = ms => w.waitForTimeout(ms);
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [5000, 11000]);
  while (cursor < combos.length && done < 40) {
    const [q, l, v] = combos[cursor];
    if (skip[q + '|' + l]) { cursor++; continue; }
    // fromage=30 unless the variant sets its own window
    const url = `https://ie.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(l)}${v.includes('fromage') ? '' : '&fromage=30'}${v}`;
    try {
      await w.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
    } catch (e) { blocked = 'goto error: ' + String(e).slice(0, 100); break; }
    let title = await w.title();
    for (let k = 0; k < 10 && /moment|attention|verify|blocked/i.test(title); k++) { await sleep(4000); title = await w.title(); }
    if (/moment|attention|verify|blocked|sign in/i.test(title)) { blocked = `challenge on ${url}: ${title}`; break; }
    let res = [];
    for (let k = 0; k < 6 && !res.length; k++) {
      res = await w.evaluate(() => (window.mosaic?.providerData?.["mosaic-provider-jobcards"]?.metaData?.mosaicProviderJobCardsModel?.results || [])
        .map(x => ({jk: x.jobkey, title: x.title, company: x.company, loc: x.formattedLocation, pub: x.pubDate})));
      if (!res.length) await sleep(1500);
    }
    await store.evaluate(([rs, q]) => { for (const r of rs) { const e = window.__indeed[r.jk]; if (!e) window.__indeed[r.jk] = {...r, queries: [q]}; else if (!e.queries.includes(q)) e.queries.push(q); } }, [res, q]);
    // A title like "10 Senior Software Developer jobs" means page 1 already shows everything.
    const m = title.match(/^(\d[\d,]*)(\+)?\s/);
    if (v === '' && (!res.length || (m && !m[2] && parseInt(m[1].replace(/,/g, '')) <= 15))) skip[q + '|' + l] = true;
    cursor++; done++;
    await store.evaluate(([c, s]) => { window.__cursor = c; window.__skip = s; }, [cursor, skip]);
    await sleep(DMIN + Math.random() * (DMAX - DMIN));
  }
  const total = await store.evaluate(() => Object.keys(window.__indeed).length);
  return {cursor, of: combos.length, done, total, blocked};
}
