async (page) => {
  // Resumable Cpl.com collector (Ireland). Phase 1: search listings (ItemList JSON-LD). Phase 2: job pages (JobPosting JSON-LD) for role titles.
  const store = page;
  const ctx = page.context();
  const w = ctx.pages().find(p => p !== store && p.url().includes('cpl.com')) || await ctx.newPage();
  await w.bringToFront();
  const S = await store.evaluate(() => window.__search || {});
  const qs = S.queries || ['software engineer', 'senior software engineer', 'full stack developer', 'full stack engineer', 'software developer', 'senior software developer'];
  const ROLE = S.titles ? new RegExp(S.titles, 'i') : /software\s+(engineer|developer|development\s+engineer)|full[\s-]?stack|\bSDE\b|\bSWE\b/i;
  await store.evaluate(() => { window.__cpl = window.__cpl || {}; window.__cplq = window.__cplq || 0; window.__cplp = window.__cplp || 1; window.__cpld = window.__cpld || {}; });
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [1000, 3000]);
  const sleep = () => w.waitForTimeout(DMIN + Math.random() * (DMAX - DMIN));
  const isBlocked = t => /access denied|just a moment|attention|verify|too many requests/i.test(t);
  let steps = 0, blocked = null;

  // Phase 1: listing pages. The quoted phrase keeps the search to titles containing it.
  let [qi, p] = await store.evaluate(() => [window.__cplq, window.__cplp]);
  while (qi < qs.length && steps < 40) {
    const q = qs[qi];
    try { await w.goto(`https://www.cpl.com/jobs?jobs.location=IE&jobs.q=${encodeURIComponent('"' + q + '"')}&page=${p}`, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = `listing ${q} p${p}: ${String(e).slice(0, 80)}`; break; }
    await w.waitForTimeout(3000);
    const t = await w.title().catch(() => '');
    if (isBlocked(t)) { blocked = `listing ${q} p${p}: ${t}`; break; }
    const items = await w.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).find(x => x && x['@type'] === 'ItemList');
      return (ld?.itemListElement || []).map(e => ({url: e.url, name: e.name}));
    }).catch(() => []);
    let fresh = 0;
    await store.evaluate(([items, q]) => { for (const it of items) { const e = window.__cpl[it.url]; if (!e) window.__cpl[it.url] = {name: it.name, queries: [q]}; else if (!e.queries.includes(q)) e.queries.push(q); } }, [items, q]);
    for (const it of items) fresh++;
    steps++;
    if (!items.length || p >= 10) { qi++; p = 1; } else p++;
    await store.evaluate(([a, b]) => { window.__cplq = a; window.__cplp = b; }, [qi, p]);
    await sleep();
  }
  if (blocked || qi < qs.length) return {phase: 1, query: qs[qi], page: p, links: await store.evaluate(() => Object.keys(window.__cpl).length), blocked};

  // Phase 2: job pages for role titles.
  const todo = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.entries(window.__cpl).filter(([u, e]) => R.test(e.name) && !window.__cpld[u]).map(([u]) => u); }, ROLE.source);
  for (const u of todo.slice(0, 60)) {
    try { await w.goto(u, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = `detail ${u}: ${String(e).slice(0, 80)}`; break; }
    await w.waitForTimeout(1500);
    const t = await w.title().catch(() => '');
    if (isBlocked(t)) { blocked = `detail ${u}: ${t}`; break; }
    const r = await w.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean).flat();
      const jp = ld.find(x => x['@type'] === 'JobPosting');
      if (!jp) return {missing: true};
      const d = new DOMParser().parseFromString((jp.description || '').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n').replace(/<li[^>]*>/gi, '\n- '), 'text/html');
      const loc = [].concat(jp.jobLocation || []).map(l => [l.address?.addressLocality, l.address?.addressRegion, l.address?.addressCountry].filter(Boolean).join(', ')).join(' / ');
      return {title: jp.title, company: jp.hiringOrganization?.name || 'Cpl', location: loc, date: jp.datePosted,
              description: (d.body.textContent || '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()};
    }).catch(e => ({err: String(e).slice(0, 100)}));
    if (r.err) { blocked = `detail ${u}: ${r.err}`; break; }
    await store.evaluate(([u, r]) => { window.__cpld[u] = r; }, [u, r]);
    steps++;
    await sleep();
  }
  const left = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.entries(window.__cpl).filter(([u, e]) => R.test(e.name) && !window.__cpld[u]).length; }, ROLE.source);
  return {phase: 2, links: await store.evaluate(() => Object.keys(window.__cpl).length), fetched: await store.evaluate(() => Object.keys(window.__cpld).length), left, blocked};
}
