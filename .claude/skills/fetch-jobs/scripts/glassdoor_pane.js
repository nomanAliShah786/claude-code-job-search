async (page) => {
  // Glassdoor descriptions via the search page's detail pane (click each card), resumable per search.
  const store = page;
  const w = page.context().pages().find(p => p.url().includes('glassdoor.ie'));
  await w.bringToFront();
  const kws = ['software-engineer', 'senior-software-engineer', 'full-stack-developer', 'full-stack-engineer', 'software-developer', 'senior-software-developer'];
  const ROLE = /software\s+(engineer|developer|development\s+engineer)|full[\s-]?stack|\bSDE\b|\bSWE\b/i;
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [1000, 3000]);
  const sleep = () => w.waitForTimeout(DMIN + Math.random() * (DMAX - DMIN));
  const isBlocked = t => /just a moment|attention|verify|security|access denied|blocked/i.test(t);
  const closeModal = async () => {
    for (const sel of ['button[aria-label="Close"]', 'button.CloseButton', '[data-test="modal-close-btn"]', 'button[class*="CloseButton"]']) {
      const b = await w.$(sel).catch(() => null);
      if (b && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await w.waitForTimeout(400); }
    }
  };
  await store.evaluate(() => { window.__gpq = window.__gpq || 0; });
  let qi = await store.evaluate(() => window.__gpq);
  let got = 0, blocked = null;
  while (qi < kws.length && got < 70 && !blocked) {
    const kw = kws[qi];
    const need = await store.evaluate(([kw, re]) => { const R = new RegExp(re, 'i'); return Object.values(window.__gd).filter(c => c.queries.includes(kw) && R.test(c.title) && !window.__gdd[c.id]).map(c => c.id); }, [kw, ROLE.source]);
    if (!need.length) { qi++; await store.evaluate(q => { window.__gpq = q; }, qi); continue; }
    const url = `https://www.glassdoor.ie/Job/ireland-${kw}-jobs-SRCH_IL.0,7_IN70_KO8,${8 + kw.length}.htm?fromAge=30`;
    if (!w.url().startsWith(url.split('?')[0])) {
      await w.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000}).catch(() => {});
      await w.waitForTimeout(3000);
    }
    let t = await w.title().catch(() => '');
    for (let k = 0; k < 8 && /just a moment|loading/i.test(t); k++) { await w.waitForTimeout(2500); t = await w.title().catch(() => ''); }
    if (isBlocked(t)) { blocked = `search ${kw}: ${t}`; break; }
    const needSet = new Set(need);
    let prev = -1;
    for (let round = 0; round < 40 && got < 70; round++) {
      await closeModal();
      const ids = await w.$$eval('li[data-jobid]', els => els.map(e => e.getAttribute('data-jobid')));
      for (const id of ids.filter(i => needSet.has(i))) {
        if (got >= 70) break;
        const card = w.locator(`li[data-jobid="${id}"] a[data-test="job-title"]`).first();
        await card.scrollIntoViewIfNeeded().catch(() => {});
        // Click the card body rather than the link so the pane loads instead of a new page.
        await w.locator(`li[data-jobid="${id}"] [data-test="job-card-wrapper"]`).first().click({position: {x: 10, y: 10}}).catch(() => {});
        await w.waitForTimeout(1200);
        await closeModal();
        const more = w.locator('[class*="JobDetails_showMore"], button:has-text("Show more")').first();
        if (await more.isVisible().catch(() => false)) { await more.click().catch(() => {}); await w.waitForTimeout(400); }
        const r = await w.evaluate(id => {
          const sel = document.querySelector(`li[data-jobid="${id}"] [data-selected="true"]`);
          const pane = document.querySelector('[class*="JobDetails_jobDescription"]');
          const head = document.querySelector('[class*="JobDetails_jobDetailsHeader"], [data-test="job-details-header"]');
          return {selected: !!sel, text: pane ? pane.innerText : '', head: head ? head.innerText.slice(0, 200) : ''};
        }, id).catch(() => ({selected: false, text: ''}));
        const tt = await w.title().catch(() => '');
        if (isBlocked(tt)) { blocked = `pane ${id}: ${tt}`; break; }
        if (r.selected && r.text.length > 200) {
          await store.evaluate(([id, r]) => { const c = window.__gd[id]; window.__gdd[id] = {title: c.title, company: c.company, location: c.location, date: '', source: 'pane', head: r.head,
            description: r.text.replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()}; }, [id, r]);
          needSet.delete(id); got++;
        }
        await sleep();
      }
      if (blocked || !needSet.size) break;
      const n = ids.length;
      if (n === prev) break;
      prev = n;
      const moreJobs = w.locator('button:has-text("Show more jobs")');
      if (!(await moreJobs.count()) || !(await moreJobs.first().isVisible().catch(() => false))) break;
      await moreJobs.first().scrollIntoViewIfNeeded().catch(() => {});
      await moreJobs.first().click().catch(() => {});
      await sleep();
      await w.waitForTimeout(1500);
    }
    if (!blocked && got < 70) { qi++; await store.evaluate(q => { window.__gpq = q; }, qi); }
  }
  const left = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.values(window.__gd).filter(c => R.test(c.title) && !window.__gdd[c.id]).length; }, ROLE.source);
  return {query: kws[qi] || 'finished', got, left, fetched: await store.evaluate(() => Object.keys(window.__gdd).length), blocked};
}
