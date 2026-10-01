async (page) => {
  // Resumable Jobs.ie collector (same platform as IrishJobs). Visible navigation, 1-3s random gaps.
  const store = page;
  const w = page.context().pages().find(p => /\/\/www\.jobs\.ie/.test(p.url()));
  await w.bringToFront();
  const qs = ['software-engineer', 'senior-software-engineer', 'full-stack-developer', 'full-stack-engineer', 'software-developer', 'senior-software-developer'];
  const ROLE = /software-(engineer|developer|development-engineer)|full-?stack|(^|-)sde(-|$)/i;
  await store.evaluate(() => { window.__js = window.__js || {}; window.__jsq = window.__jsq || 0; window.__jsp = window.__jsp || 1; window.__jsd = window.__jsd || {}; window.__jslast = window.__jslast || ''; });
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [1000, 3000]);
  const sleep = () => w.waitForTimeout(DMIN + Math.random() * (DMAX - DMIN));
  const isBlocked = t => /access denied|just a moment|attention|verify/i.test(t);
  let steps = 0, blocked = null;

  // Phase 1: listing pages
  let [qi, p, last] = await store.evaluate(() => [window.__jsq, window.__jsp, window.__jslast]);
  while (qi < qs.length && steps < 80) {
    const q = qs[qi];
    try { await w.goto(`https://www.jobs.ie/jobs/${q}?page=${p}`, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = `listing ${q} p${p}: ${String(e).slice(0, 80)}`; break; }
    const t = await w.title().catch(() => '');
    if (isBlocked(t)) { blocked = `listing ${q} p${p}: ${t}`; break; }
    const links = await w.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/job/"]')].map(a => a.getAttribute('href').split('?')[0]).filter(h => /job\d+$/.test(h)))]).catch(() => []);
    const sig = links.join('|');
    await store.evaluate(([links, q]) => { for (const l of links) { const e = window.__js[l]; if (!e) window.__js[l] = [q]; else if (!e.includes(q)) e.push(q); } }, [links, q]);
    steps++;
    // Past the last page the site returns an empty list or repeats the final page.
    if (!links.length || sig === last) { qi++; p = 1; last = ''; } else { p++; last = sig; }
    await store.evaluate(([a, b, c]) => { window.__jsq = a; window.__jsp = b; window.__jslast = c; }, [qi, p, last]);
    await sleep();
  }
  if (blocked || qi < qs.length) return {phase: 1, query: qs[qi], page: p, links: await store.evaluate(() => Object.keys(window.__js).length), blocked};

  // Phase 2: job pages for role titles not already captured from IrishJobs (same job IDs).
  const todo = await store.evaluate(re => {
    const R = new RegExp(re, 'i');
    const ijIds = new Set(Object.keys(window.__ijd || {}).map(u => u.match(/job(\d+)$/)[1]));
    return Object.keys(window.__js).filter(u => R.test(u.split('/')[2]) && !window.__jsd[u] && !ijIds.has(u.match(/job(\d+)$/)[1]));
  }, ROLE.source);
  for (const u of todo.slice(0, 80)) {
    try { await w.goto('https://www.jobs.ie' + u, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = `detail ${u}: ${String(e).slice(0, 80)}`; break; }
    const t = await w.title().catch(() => '');
    if (isBlocked(t)) { blocked = `detail ${u}: ${t}`; break; }
    const r = await w.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean).flat();
      const jp = ld.find(x => x['@type'] === 'JobPosting');
      if (!jp) return {missing: true};
      const d = new DOMParser().parseFromString((jp.description || '').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n').replace(/<li[^>]*>/gi, '\n- '), 'text/html');
      const loc = [].concat(jp.jobLocation || []).map(l => [l.address?.addressLocality, l.address?.addressRegion, l.address?.addressCountry].filter(Boolean).join(', ')).join(' / ');
      return {title: jp.title, company: jp.hiringOrganization?.name || '', location: loc, date: jp.datePosted,
              description: (d.body.textContent || '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()};
    }).catch(e => ({err: String(e).slice(0, 100)}));
    if (r.err) { blocked = `detail ${u}: ${r.err}`; break; }
    await store.evaluate(([u, r]) => { window.__jsd[u] = r; }, [u, r]);
    steps++;
    await sleep();
  }
  const left = await store.evaluate(re => {
    const R = new RegExp(re, 'i');
    const ijIds = new Set(Object.keys(window.__ijd || {}).map(u => u.match(/job(\d+)$/)[1]));
    return Object.keys(window.__js).filter(u => R.test(u.split('/')[2]) && !window.__jsd[u] && !ijIds.has(u.match(/job(\d+)$/)[1])).length;
  }, ROLE.source);
  return {phase: 2, links: await store.evaluate(() => Object.keys(window.__js).length), fetched: await store.evaluate(() => Object.keys(window.__jsd).length), left, blocked};
}
