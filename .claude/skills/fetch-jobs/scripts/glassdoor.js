async (page) => {
  // Resumable Glassdoor.ie collector. Phase 1: expand each search with "Show more jobs". Phase 2: open job pages.
  const store = page;
  const w = page.context().pages().find(p => p.url().includes('glassdoor.ie'));
  await w.bringToFront();
  const S = await store.evaluate(() => window.__search || {});
  const kws = (S.queries || ['software engineer', 'senior software engineer', 'full stack developer', 'full stack engineer', 'software developer', 'senior software developer']).map(q => q.toLowerCase().trim().replace(/\s+/g, '-'));
  const ROLE = S.titles ? new RegExp(S.titles, 'i') : /software\s+(engineer|developer|development\s+engineer)|full[\s-]?stack|\bSDE\b|\bSWE\b/i;
  await store.evaluate(() => { window.__gd = window.__gd || {}; window.__gdq = window.__gdq || 0; window.__gdd = window.__gdd || {}; });
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [1000, 3000]);
  const sleep = () => w.waitForTimeout(DMIN + Math.random() * (DMAX - DMIN));
  const isBlocked = t => /just a moment|attention|verify|security|access denied|blocked/i.test(t);
  const closeModal = async () => {
    for (const sel of ['button[aria-label="Close"]', 'button.CloseButton', '[data-test="modal-close-btn"]', 'button[class*="CloseButton"]']) {
      const b = await w.$(sel).catch(() => null);
      if (b && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await w.waitForTimeout(500); }
    }
  };
  const readCards = () => w.evaluate(() => [...document.querySelectorAll('li[data-jobid]')].map(li => ({
    id: li.getAttribute('data-jobid'),
    title: li.querySelector('a[data-test="job-title"]')?.innerText.trim() || '',
    company: li.querySelector('[class*="EmployerProfile_compactEmployerName"]')?.innerText.trim() || '',
    location: li.querySelector('[data-test="emp-location"]')?.innerText.trim() || '',
    link: li.querySelector('a[data-test="job-title"]')?.href || '',
  })));
  let blocked = null;

  // Phase 1
  let qi = await store.evaluate(() => window.__gdq);
  while (qi < kws.length) {
    const kw = kws[qi];
    const url = `https://www.glassdoor.ie/Job/ireland-${kw}-jobs-SRCH_IL.0,7_IN70_KO8,${8 + kw.length}.htm?fromAge=30`;
    try { await w.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000}); } catch (e) { blocked = `search ${kw}: ${String(e).slice(0, 80)}`; break; }
    await w.waitForTimeout(3000);
    const t = await w.title().catch(() => '');
    if (isBlocked(t)) { blocked = `search ${kw}: ${t}`; break; }
    let prev = -1;
    for (let k = 0; k < 40; k++) {
      await closeModal();
      const n = await w.$$eval('li[data-jobid]', els => els.length).catch(() => 0);
      if (n === prev) break;
      prev = n;
      const more = w.locator('button:has-text("Show more jobs")');
      if (!(await more.count()) || !(await more.first().isVisible().catch(() => false))) break;
      await more.first().scrollIntoViewIfNeeded().catch(() => {});
      await more.first().click().catch(() => {});
      await sleep();
      await w.waitForTimeout(1500);
    }
    await closeModal();
    const cards = await readCards().catch(() => []);
    await store.evaluate(([cards, kw]) => { for (const c of cards) { const e = window.__gd[c.id]; if (!e) window.__gd[c.id] = {...c, queries: [kw]}; else if (!e.queries.includes(kw)) e.queries.push(kw); } }, [cards, kw]);
    qi++;
    await store.evaluate(q => { window.__gdq = q; }, qi);
    await sleep();
  }
  if (blocked) return {phase: 1, query: kws[qi], cards: await store.evaluate(() => Object.keys(window.__gd).length), blocked};

  // Phase 2
  const todo = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.values(window.__gd).filter(c => R.test(c.title) && c.link && !window.__gdd[c.id]).map(c => [c.id, c.link]); }, ROLE.source);
  for (const [id, link] of todo.slice(0, 60)) {
    try { await w.goto(link, {waitUntil: 'domcontentloaded', timeout: 45000}); } catch (e) { blocked = `detail ${id}: ${String(e).slice(0, 80)}`; break; }
    await w.waitForTimeout(1500);
    let t = await w.title().catch(() => '');
    // Give Cloudflare's interstitial time to clear by itself before calling it a block.
    for (let k = 0; k < 10 && (isBlocked(t) || /^loading/i.test(t)); k++) { await w.waitForTimeout(2500); t = await w.title().catch(() => ''); }
    if (isBlocked(t)) { blocked = `detail ${id}: ${t}`; break; }
    await closeModal();
    const r = await w.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean).flat();
      const jp = ld.find(x => x['@type'] === 'JobPosting');
      const pane = document.querySelector('[class*="JobDetails_jobDescription"]');
      let text = '';
      if (jp?.description) {
        const d = new DOMParser().parseFromString(jp.description.replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n').replace(/<li[^>]*>/gi, '\n- '), 'text/html');
        text = d.body.textContent || '';
      } else if (pane) text = pane.innerText;
      const loc = jp ? [].concat(jp.jobLocation || []).map(l => [l.address?.addressLocality, l.address?.addressRegion, l.address?.addressCountry?.name || l.address?.addressCountry].filter(Boolean).join(', ')).join(' / ') : '';
      return {title: jp?.title || '', company: jp?.hiringOrganization?.name || '', location: loc, date: jp?.datePosted || '', source: jp ? 'ld' : (pane ? 'pane' : 'none'),
              description: text.replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()};
    }).catch(e => ({err: String(e).slice(0, 100)}));
    if (r.err) { blocked = `detail ${id}: ${r.err}`; break; }
    await store.evaluate(([id, r]) => { window.__gdd[id] = r; }, [id, r]);
    await sleep();
  }
  const left = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.values(window.__gd).filter(c => R.test(c.title) && c.link && !window.__gdd[c.id]).length; }, ROLE.source);
  return {phase: 2, cards: await store.evaluate(() => Object.keys(window.__gd).length), fetched: await store.evaluate(() => Object.keys(window.__gdd).length), left, blocked};
}
