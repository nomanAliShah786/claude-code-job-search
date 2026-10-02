async (page) => {
  // Resumable IrishJobs.ie collector. Phase 1: search listings. Phase 2: job details (role titles only).
  const store = page;
  const w = page.context().pages().find(p => p.url().includes('irishjobs.ie'));
  const S = await store.evaluate(() => window.__search || {});
  const qs = (S.queries || ['software engineer', 'senior software engineer', 'full stack developer', 'full stack engineer', 'software developer', 'senior software developer']).map(q => q.toLowerCase().trim().replace(/\s+/g, '-'));
  const ROLE = S.titles ? new RegExp(S.titles.replace(/\\s| /g, '-'), 'i') : /software-(engineer|developer|development-engineer)|full-?stack|(^|-)sde(-|$)/i;
  await store.evaluate(() => { window.__ij = window.__ij || {}; window.__ijq = window.__ijq || 0; window.__ijp = window.__ijp || 1; window.__ijd = window.__ijd || {}; window.__ijlog = window.__ijlog || []; });
  const sleep = ms => w.waitForTimeout(ms);
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [1000, 3000]);
  let steps = 0, blocked = null;
  const log = async l => store.evaluate(l => window.__ijlog.push(l), l);

  // Phase 1
  let [qi, p] = await store.evaluate(() => [window.__ijq, window.__ijp]);
  while (qi < qs.length && steps < 40) {
    const q = qs[qi];
    const r = await w.evaluate(async url => { try { const r = await fetch(url); return {status: r.status, text: r.status === 200 ? await r.text() : ''}; } catch (e) { return {status: 0, text: String(e)}; } }, `/jobs/${q}?page=${p}`);
    if (r.status !== 200) { blocked = `listing ${q} p${p}: status ${r.status}`; break; }
    const links = [...new Set(r.text.match(/\/job\/[^"?#]+job\d+/g) || [])];
    await store.evaluate(([links, q]) => { for (const l of links) { const e = window.__ij[l]; if (!e) window.__ij[l] = [q]; else if (!e.includes(q)) e.push(q); } }, [links, q]);
    await log(`${q} p${p}: ${links.length} links`);
    steps++;
    if (!links.length) { qi++; p = 1; } else p++;
    await store.evaluate(([a, b]) => { window.__ijq = a; window.__ijp = b; }, [qi, p]);
    await sleep(DMIN + Math.random() * (DMAX - DMIN));
  }
  if (blocked || qi < qs.length) return {phase: 1, query: qs[qi], page: p, links: await store.evaluate(() => Object.keys(window.__ij).length), blocked};

  // Phase 2
  const todo = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.keys(window.__ij).filter(u => R.test(u.split('/')[2]) && !window.__ijd[u]); }, ROLE.source);
  await w.bringToFront();
  for (const u of todo.slice(0, 60)) {
    // Navigate visibly so the run can be watched in the browser.
    try { await w.goto('https://www.irishjobs.ie' + u, {waitUntil: 'domcontentloaded', timeout: 45000}); }
    catch (e) { blocked = `detail ${u}: goto ${String(e).slice(0, 80)}`; break; }
    const title = await w.title().catch(() => '');
    if (/access denied|just a moment|attention|verify/i.test(title)) { blocked = `detail ${u}: ${title}`; break; }
    const r = await w.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean).flat();
      const jp = ld.find(x => x['@type'] === 'JobPosting');
      if (!jp) return {missing: true};
      const d = new DOMParser().parseFromString((jp.description || '').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n').replace(/<li[^>]*>/gi, '\n- '), 'text/html');
      const loc = [].concat(jp.jobLocation || []).map(l => [l.address?.addressLocality, l.address?.addressRegion, l.address?.addressCountry].filter(Boolean).join(', ')).join(' / ');
      return {title: jp.title, company: jp.hiringOrganization?.name || '', location: loc, date: jp.datePosted,
              description: (d.body.textContent || '').replace(/[ \t\u00a0]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()};
    }).catch(e => ({err: String(e).slice(0, 100)}));
    if (r.err) { blocked = `detail ${u}: ${r.err}`; break; }
    await store.evaluate(([u, r]) => { window.__ijd[u] = r; }, [u, r]);
    steps++;
    await sleep(DMIN + Math.random() * (DMAX - DMIN));
  }
  const left = await store.evaluate(re => { const R = new RegExp(re, 'i'); return Object.keys(window.__ij).filter(u => R.test(u.split('/')[2]) && !window.__ijd[u]).length; }, ROLE.source);
  return {phase: 2, fetched: await store.evaluate(() => Object.keys(window.__ijd).length), left, blocked};
}
