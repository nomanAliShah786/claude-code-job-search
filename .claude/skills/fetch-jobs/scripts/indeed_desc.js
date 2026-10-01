async (page) => {
  // Resumable Indeed description fetcher. Reads window.__itodo, writes window.__idesc in the store tab.
  const store = page;
  const w = page.context().pages().find(p => p !== store && p.url().includes('indeed.com'));
  const todo = await store.evaluate(() => window.__itodo.filter(jk => !window.__idesc[jk]));
  const [DMIN, DMAX] = await store.evaluate(() => window.__delay || [5000, 10000]);
  let done = 0, blocked = null;
  for (const jk of todo.slice(0, 40)) {
    const r = await w.evaluate(async jk => {
      try {
        const res = await fetch(`/viewjob?jk=${jk}&viewtype=embedded&spa=1`, {credentials: 'include'});
        const ct = res.headers.get('content-type') || '';
        if (res.status !== 200 || !ct.includes('json')) return {err: `status ${res.status} ${ct}`};
        const j = await res.json();
        const m = j.body?.jobInfoWrapperModel?.jobInfoModel;
        const h = m?.jobInfoHeaderModel || {};
        const html = m?.sanitizedJobDescription || '';
        const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/gi, '\n').replace(/<li[^>]*>/gi, '\n- '), 'text/html');
        const text = (d.body.textContent || '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
        return {title: h.jobTitle, company: h.companyName, location: h.formattedLocation, description: text};
      } catch (e) { return {err: String(e).slice(0, 100)}; }
    }, jk).catch(e => ({err: String(e).slice(0, 100)}));
    if (r.err) { blocked = `${jk}: ${r.err}`; break; }
    await store.evaluate(([jk, r]) => { window.__idesc[jk] = r; }, [jk, r]);
    done++;
    await w.waitForTimeout(DMIN + Math.random() * (DMAX - DMIN));
  }
  const left = await store.evaluate(() => window.__itodo.filter(jk => !window.__idesc[jk]).length);
  return {done, left, blocked};
}
