// Job tracker: a local web page over jobs/*/status.md plus jobs/tracker.json.
// status.md stays the source of truth for stage, posting, CV and contact (the skills read it);
// tracker.json holds what status.md has no place for: labels, notes, outreach, follow-ups, starred/hidden ads.
// Fetched ads come from research/*/combined.jsonl, with fit scores from jobs/_ranking/scores.jsonl.
// Run: node tools/tracker/server.mjs   then open http://localhost:4321
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JOBS = path.join(ROOT, 'jobs');
const TRACKER = path.join(JOBS, 'tracker.json');
const SCORES = path.join(JOBS, '_ranking', 'scores.jsonl');
const RESEARCH = path.join(ROOT, 'research');
const PORT = Number(process.env.PORT) || 4321;
const STAGES = ['intake', 'drafted', 'applied', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn', 'no-response'];
const FIELDS = { stage: 'Current stage', posting: 'Posting', cv: 'CV variant', contact: 'Contact' };

const today = () => new Date().toLocaleDateString('en-CA');
const clean = (v) => (v || '').replace(/`/g, '').trim();
const oneLine = (v) => String(v ?? '').replace(/[\r\n|]+/g, ' ').trim();

function parseStatus(md) {
  const field = (label) => clean(md.match(new RegExp(`^- \\*\\*${label}:\\*\\*(.*)$`, 'm'))?.[1]);
  const title = clean(md.match(/^# Status:(.*)$/m)?.[1]);
  const cut = title.indexOf(', ');
  const history = [...md.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| ([^|]+?) \| (.*?) ?\|$/gm)]
    .map(([, date, stage, notes]) => ({ date, stage: stage.trim(), notes: notes.trim() }));
  const feedback = (md.split(/^## Feedback\s*$/m)[1] || '').trim();
  return {
    title,
    company: cut > 0 ? title.slice(0, cut) : title,
    role: cut > 0 ? title.slice(cut + 2) : '',
    ...Object.fromEntries(Object.entries(FIELDS).map(([k, label]) => [k, field(label)])),
    history,
    feedback: feedback.startsWith('<dated,') ? '' : feedback,
  };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

async function writeAtomic(file, text) {
  await fs.writeFile(file + '.tmp', text);
  await fs.rename(file + '.tmp', file);
}

async function slugs() {
  const entries = await fs.readdir(JOBS, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}-/.test(e.name)).map((e) => e.name);
}

async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  return text.split('\n').flatMap((line) => { try { return line.trim() ? [JSON.parse(line)] : []; } catch { return []; } });
}

async function scoresByUrlId() {
  const map = {};
  for (const s of await readJsonl(SCORES)) {
    const id = (s.url || '').match(/(\d{6,})/)?.[1];
    if (id) map[id] = { overall: s.overall, verdict: s.verdict, location: s.location, posted: s.date };
  }
  return map;
}

// Every fetched ad from research/*/combined.jsonl; a later run overrides an earlier copy of the same ad.
async function readAds() {
  const dirs = (await fs.readdir(RESEARCH, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const ads = new Map();
  for (const dir of dirs) {
    for (const ad of await readJsonl(path.join(RESEARCH, dir, 'combined.jsonl'))) {
      if (ad.id) ads.set(ad.id, { ...ad, run: dir });
    }
  }
  return ads;
}

function adUrl(ad) {
  if (ad.url) return ad.url;
  const [prefix, key] = [ad.id.slice(0, 3), ad.id.slice(3)];
  if (prefix === 'li-') return `https://www.linkedin.com/jobs/view/${key}`;
  if (prefix === 'in-') return `https://ie.indeed.com/viewjob?jk=${key}`;
  return '';
}

async function listAds() {
  const [ads, scores, tracker, names] = await Promise.all([readAds(), readJsonl(SCORES), readJson(TRACKER, {}), slugs()]);
  const scoreById = Object.fromEntries(scores.map((s) => [s.id, s]));
  const postings = await Promise.all(names.map(async (slug) => {
    const md = await fs.readFile(path.join(JOBS, slug, 'status.md'), 'utf8').catch(() => '');
    return [slug, parseStatus(md).posting];
  }));
  const trackedSlug = (id) => postings.find(([, posting]) => posting.includes(id.slice(3)))?.[0] || null;
  return [...ads.values()].map((ad) => {
    const s = scoreById[ad.id];
    return {
      id: ad.id, title: ad.title, company: ad.company, location: ad.location, date: ad.date || '', source: ad.source,
      alsoOn: Array.isArray(ad.also_on) ? ad.also_on : JSON.parse(ad.also_on || '[]'), group: ad.group || '', run: ad.run,
      url: adUrl(ad) || s?.url || '',
      score: s ? { overall: s.overall, verdict: s.verdict, scores: s.scores, gates: s.gates, gateNotes: s.gate_notes,
        strengths: s.strengths, gaps: s.gaps, ranked: s.ranked, skipped: s.skipped || '' } : null,
      tracked: trackedSlug(ad.id),
      mark: tracker.ads?.[ad.id] || {},
    };
  });
}

async function adDescription(id) {
  const ad = (await readAds()).get(id);
  if (!ad) throw Object.assign(new Error('Unknown ad'), { code: 404 });
  return ad.description || '';
}

async function markAd(id, mark) {
  const tracker = await readJson(TRACKER, { jobs: {} });
  tracker.ads ||= {};
  if (mark.starred || mark.hidden) tracker.ads[id] = { starred: !!mark.starred, hidden: !!mark.hidden };
  else delete tracker.ads[id];
  await writeAtomic(TRACKER, JSON.stringify(tracker, null, 2) + '\n');
}

async function trackAd(id) {
  const ads = await readAds();
  const ad = ads.get(id);
  if (!ad) throw Object.assign(new Error('Unknown ad'), { code: 404 });
  const score = (await readJsonl(SCORES)).find((s) => s.id === id);
  return createJob({
    company: ad.company, role: ad.title, posting: adUrl(ad) || score?.url || '', description: ad.description,
    note: `From the fetched ads (${ad.source}, posted ${ad.date || 'undated'}${score ? `, fit ${score.overall}` : ''})`,
  });
}

async function listJobs() {
  const [names, tracker, scores] = await Promise.all([slugs(), readJson(TRACKER, { jobs: {} }), scoresByUrlId()]);
  const jobs = [];
  for (const slug of names) {
    const md = await fs.readFile(path.join(JOBS, slug, 'status.md'), 'utf8').catch(() => null);
    if (md === null) continue;
    const status = parseStatus(md);
    const files = await fs.readdir(path.join(JOBS, slug));
    const urlId = status.posting.match(/(\d{6,})/)?.[1];
    jobs.push({
      slug,
      folderDate: slug.slice(0, 10),
      files,
      score: (urlId && scores[urlId]) || null,
      ...status,
      extra: tracker.jobs?.[slug] || {},
    });
  }
  return jobs;
}

async function assertSlug(slug) {
  if (!(await slugs()).includes(slug)) throw Object.assign(new Error('Unknown job'), { code: 404 });
}

// Update status.md fields; a stage change also appends a dated history row.
async function updateStatus(slug, { stage, date, note, posting, cv, contact }) {
  await assertSlug(slug);
  const file = path.join(JOBS, slug, 'status.md');
  let md = await fs.readFile(file, 'utf8');
  const setField = (label, value) => {
    md = md.replace(new RegExp(`^(- \\*\\*${label}:\\*\\*).*$`, 'm'), `$1 ${oneLine(value) || 'TODO'}`);
  };
  if (posting !== undefined) setField(FIELDS.posting, posting);
  if (cv !== undefined) setField(FIELDS.cv, cv);
  if (contact !== undefined) setField(FIELDS.contact, contact);
  if (stage !== undefined || note) {
    const current = parseStatus(md).stage;
    const newStage = stage ?? current;
    if (!STAGES.includes(newStage)) throw Object.assign(new Error('Unknown stage'), { code: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) date = today();
    setField(FIELDS.stage, newStage);
    const row = `| ${date} | ${newStage} | ${oneLine(note)} |`;
    const lines = md.split('\n');
    let last = -1;
    lines.forEach((l, i) => { if (/^\| \d{4}-\d{2}-\d{2} \|/.test(l) || /^\|---/.test(l)) last = i; });
    if (last < 0) throw Object.assign(new Error('No history table in status.md'), { code: 422 });
    lines.splice(last + 1, 0, row);
    md = lines.join('\n');
  }
  await writeAtomic(file, md);
}

async function saveExtra(slug, extra) {
  await assertSlug(slug);
  const tracker = await readJson(TRACKER, { jobs: {} });
  tracker.jobs ||= {};
  tracker.jobs[slug] = extra;
  await writeAtomic(TRACKER, JSON.stringify(tracker, null, 2) + '\n');
}

// Scaffold jobs/<date>-<company>-<role>/ from jobs/_template, like /job-intake does.
async function createJob({ company, role, posting, description, note }) {
  company = oneLine(company); role = oneLine(role);
  if (!company || !role) throw Object.assign(new Error('Company and role are required'), { code: 400 });
  const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${today()}-${kebab(company)}-${kebab(role)}`.slice(0, 80).replace(/-$/, '');
  const dir = path.join(JOBS, slug);
  await fs.mkdir(dir);
  const tpl = path.join(JOBS, '_template');
  for (const name of await fs.readdir(tpl)) {
    let text = await fs.readFile(path.join(tpl, name), 'utf8');
    text = text.replaceAll('<Company>', company).replaceAll('<Role>', role)
      .replace('<URL>', oneLine(posting) || 'TODO').replace('<URL, or "pasted">', oneLine(posting) || 'pasted')
      .replace('<cv/variants/...pdf>', 'TODO').replace('<recruiter or hiring manager>', 'TODO')
      .replace('Captured:** YYYY-MM-DD', `Captured:** ${today()}`)
      .replace('| YYYY-MM-DD | intake | |', `| ${today()} | intake | ${oneLine(note) || 'Added from the tracker'} |`);
    if (description) text = text.replace('<the full job description, unedited, so the analysis can quote it>', description.trim());
    await fs.writeFile(path.join(dir, name), text);
  }
  return slug;
}

async function body(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

const server = http.createServer(async (req, res) => {
  const send = (code, payload, type = 'application/json') => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(type === 'application/json' ? JSON.stringify(payload) : payload);
  };
  try {
    const url = new URL(req.url, 'http://localhost');
    const m = url.pathname.match(/^\/api\/jobs\/([^/]+)\/(status|extra)$/);
    const a = url.pathname.match(/^\/api\/ads\/([^/]+)(?:\/(mark|track))?$/);
    if (req.method === 'GET' && url.pathname === '/') {
      return send(200, await fs.readFile(new URL('./index.html', import.meta.url)), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/jobs') return send(200, { stages: STAGES, today: today(), jobs: await listJobs() });
    if (req.method === 'GET' && url.pathname === '/api/ads') return send(200, { ads: await listAds() });
    if (req.method === 'GET' && a && !a[2]) return send(200, { description: await adDescription(decodeURIComponent(a[1])) });
    if (req.method === 'PUT' && a?.[2] === 'mark') { await markAd(decodeURIComponent(a[1]), await body(req)); return send(200, { ok: true }); }
    if (req.method === 'POST' && a?.[2] === 'track') return send(201, { slug: await trackAd(decodeURIComponent(a[1])) });
    if (req.method === 'POST' && url.pathname === '/api/jobs') return send(201, { slug: await createJob(await body(req)) });
    if (req.method === 'POST' && m?.[2] === 'status') { await updateStatus(decodeURIComponent(m[1]), await body(req)); return send(200, { ok: true }); }
    if (req.method === 'PUT' && m?.[2] === 'extra') { await saveExtra(decodeURIComponent(m[1]), await body(req)); return send(200, { ok: true }); }
    send(404, { error: 'Not found' });
  } catch (err) {
    send(err.code === 'EEXIST' ? 409 : Number.isInteger(err.code) ? err.code : 500,
      { error: err.code === 'EEXIST' ? 'That job folder already exists' : err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Job tracker: http://localhost:${PORT}`));
