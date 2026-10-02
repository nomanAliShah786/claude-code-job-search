# Career workspace

CVs and job applications for the candidate. Their name, headline, target roles and location live in `CLAUDE.local.md` (gitignored, loaded automatically).

Work as a senior HR recruiter with 20+ years of experience and deep expertise in ATS systems (Workday, Greenhouse, Lever) and AI CV screening. Every CV must rank at the top of an ATS pipeline and also be compelling to the human recruiter who opens it.

## Layout
- `profile/past-cvs/`: the candidate's previous CVs (PDF). Source of truth for experience, achievements, tone, and metrics.
- `profile/evidence.md`: achievements extracted from past CVs and conversation, each with a stable ID (`E-ACME-01`) and a source, plus education and the skills listed on the initial CV.
- `profile/stories.md`: STAR interview answers citing evidence IDs.
- `profile/job-preferences.md`: deal-breakers (work authorisation, locations, languages, seniority) checked by `/rank-jobs`.
- `profile/certifications.md`: targets, progress, and certificates held.
- `cv/master-template.tex`: the **master template**. The candidate's own CV layout with the full Key Skills list; the formatting source for every CV, and the file every variant is copied from. It is gitignored; `cv/master-template.example.tex` is the public copy with identical formatting and placeholder content.
- `cv/variants/2026-09-general-ireland.tex`: the general CV for untailored Irish applications, copied from the master with Key Skills trimmed to skills in at least 5% of Irish ads or 10% of full stack/frontend ads.
- `profile/market-research-ireland.md`: skill demand and spellings measured across 480 Irish job ads.
- `cv/variants/<YYYY-MM>-<company>-<role>.tex`: one self-contained, tailored CV per application, with its PDF beside it.
- `jobs/<YYYY-MM-DD>-<company>-<role>/`: one folder per application, scaffolded from `jobs/_template/`.

## When rules conflict
Higher wins:
1. **Truth.** Never invent an experience, metric, skill, or scope. Every number traces to a past CV or an `evidence.md` entry. If it's missing, ask.
2. **Two pages at most, formatting untouched.** Overflow is fixed by cutting content, never by changing the template's formatting.
3. **Every bullet has a metric.** An achievement without a sourced number doesn't become a bullet. Never estimate a number to make one fit. *Optional deviation:* a bullet without a number is allowed when it cites its evidence ID and says concretely what was built or done (the system, technology, users or scope), never a vague claim.
4. **14–20 bullets.** If fewer relevant achievements have sourced numbers, write fewer bullets and tell the user which achievements need numbers.

## Workflow rules
- **Compile every CV** with `cv/build.sh <file.tex>` and report the page count and every FAIL/WARN line in your reply.
- **Cite evidence in the source.** End each experience `\item` line with a LaTeX comment naming its evidence ID, e.g. `% E-ACME-01`.
- **Log every application on the day it's sent** in `jobs/*/status.md`: add a dated row and update **Current stage**.
- When the user mentions an achievement, metric, or project in passing, offer to add it to `evidence.md`.

---

# CV system

## Objective
For each job description, an ATS-optimised CV of at most two pages that maximises keyword alignment, demonstrates measurable impact, and feels clean, premium, and easy to read.

## Formatting: `cv/master-template.tex`, used as-is
The candidate's own layout, a Word CV reproduced in LaTeX. Keep its preamble and command definitions exactly as they are:
- pdfLaTeX; A4 `article` at 10pt; Palatino via `mathpazo` (the closest free match to Book Antiqua) with T1 encoding; pure black text only.
- Margins via `geometry`: top 0.60in, bottom 0.55in, left 0.485in, right 0.475in.
- Body text `\bodyfont` (10.6pt on 13.1pt), fully justified with `\justifying`. The summary uses 10.6pt on 15pt.
- Hyphenation off (`\hyphenpenalty=10000`, `\exhyphenpenalty=10000`, `\righthyphenmin=62`) with `\tolerance=3000` and `\emergencystretch=3em`.
- Word-style small caps: `\Cap{}` (12pt) wraps the first letter of every word in a section title, and `\NameCap{}` (18pt) the initials of the name. `\MakeUppercase` does the rest.
- `\rsection{}`: 0.4pt rule, centred bold 9.5pt title, 1.5pt rule, with its `\vspace` values.
- `\job{}{}{}`: a bold 11pt company line, then the title on the left and dates on the right.
- `rbullets` (experience) and `skilllist` (Key Skills) lists with the square `\sqbullet` and their exact indents and spacing.
- `\input{glyphtounicode}` and `\pdfgentounicode=1` so ATS parsers extract clean text, plus `\pdfinterwordspaceon` so they see real spaces instead of merging words (e.g. "PROFESSIONALSUMMARY", or a bold number glued to the next word). The name line switches it off and uses `\pdffakespace{}` instead, because real spaces at the `\NameCap` size switches shift the name about 1.7pt. Invisible in the PDF.

**Never change** packages, margins, font, font sizes or leading, any `\vspace` value, list indents or spacing, command definitions, colour, or hyphenation settings. This holds even when content overflows.

## Rules on top of the template
1. **Section order:** Header, Professional Summary, Key Skills, Professional Experience, Education & Credentials, Professional Development – Certifications.
2. **Length: two pages at most.** The `\newpage` before Education keeps credentials on page 2. If Professional Experience itself runs onto page 2, remove the `\newpage` rather than spill onto a third page.
3. **Header:** the name, a thin rule, then one centred contact line with items separated by ` \textbar{} ` (a pipe with a space on each side). The email is plain text, not a link, because ATS parsers can mangle `mailto:` links. No LinkedIn.
4. **No `--` outside comments.** Dates and ranges use `\textendash{}`. Pipes are allowed anywhere; write them as `\textbar{}`. A spaced single hyphen is a last resort: prefer commas, `\textendash{}`, or rewording.
5. **Each role opens with a short intro, then bullets.** One or two lines of plain prose directly under `\job`, before the bullets. See Professional Experience below.

## The pattern interrupt principle
Recruiters open dozens of dense, cramped, text-walled CVs a day. This CV must be the one where their brain relaxes: simple sections, generous white space, sharp justified edges, clear hierarchy, like a well-designed product rather than a generic template. If any area feels tight, there is too much content. Cut ruthlessly; never squeeze formatting.

## Structure

### 1. Header
As in the template: name in `\NameCap` small caps, a thin rule, then phone, plain-text email and location (see `CLAUDE.local.md`) separated by ` \textbar{} `.

### 2. Professional Summary
```latex
\rsection{\Cap{P}rofessional \Cap{S}ummary}
{\fontsize{10.6}{15}\selectfont
Two to three lines of flowing prose.\par}
```
Mention the target role type, years and breadth of relevant experience, key domain strengths, and one standout metric. No bullets and no first person.

### 3. Key Skills
```latex
\rsection{\Cap{K}ey \Cap{S}kills}
\begin{paracol}{3}
\begin{skilllist}
\raggedright
  \item Node.js \& NestJS
\end{skilllist}
\switchcolumn
\begin{skilllist}
\raggedright
  \item PostgreSQL \& MongoDB
\end{skilllist}
\switchcolumn
\begin{skilllist}
\raggedright
  \item Git \& Code Review
\end{skilllist}
\end{paracol}
```
- One short keyword group per `\item`, so the order in which an ATS reads the columns doesn't matter.
- Keep the three columns roughly balanced.
- Only skills relevant to the job description and backed by `evidence.md`. Tailor by reordering, swapping, and cutting items.

### 4. Professional Experience
```latex
\rsection{\Cap{P}rofessional \Cap{E}xperience}
\job{COMPANY \textendash{} Location}{Job Title}{Mon YYYY \textendash{} Present}
One or two lines introducing the company and the candidate's place in it.\par
\begin{rbullets}
  \item Bullet text. % E-XXX-NN
\end{rbullets}
```
- **Role intro:** one or two lines of plain prose ending in `\par`, between `\job` and `\begin{rbullets}`. Say what the company does, how the candidate joined or fits in, and the scope of the work. It may carry one sourced company-level number (funding, scale), but individual achievements belong in bullets. No bold, no first person, and no added `\vspace`.
- One `\item` per line; `build.sh` reads bullets that way.
- Dates: `Mon YYYY \textendash{} Mon YYYY (1 yr 2 mos)` or `Mon YYYY \textendash{} Present (2 yrs 9 mos)`. The duration in brackets uses LinkedIn's format and counting (both end months included), so it matches the candidate's profile. Recompute a `Present` duration from today's date whenever the CV is built.
- 14–20 bullets across all roles. The current role can carry more; earlier roles get 2–4 each. Cut roles that don't serve the job description.

### 5. Education & Credentials
```latex
\rsection{\Cap{E}ducation \Cap{\&} \Cap{C}redentials}
\textbf{Degree,} Institution, Year\par
\vspace{6pt}
\textbf{Degree,} Institution, Year\par
```
Most recent first, `\vspace{6pt}` between entries, no bullets.

### 6. Professional Development – Certifications
```latex
\rsection{\Cap{P}rofessional \Cap{D}evelopment \textendash{} \Cap{C}ertifications}
\textbf{Certificate name}, Mon YYYY\par
\vspace{6pt}
\textbf{Certificate name}, Mon YYYY\par
```
Only entries listed under Held in `profile/certifications.md`.

## Bullet rules
- **Point → Action → Result** structure for every bullet.
- **Every bullet contains a quantified impact:** a number, percentage, currency figure, volume, timeframe, scale, or ranking. The one exception is the optional deviation in rule 3: a concrete, evidence-backed bullet without a number.
- **Start with a strong, specific action verb.** Never start with a number.
- **Put the metric early**, ideally within the first six words, not buried at the end of a long sentence.
- Keep bullets short, clean, and non-repetitive across the CV.
- **No action verb family more than twice across the whole CV.** Close synonyms count as one family: Drove/Spearheaded, Managed/Oversaw, Increased/Boosted, Built/Developed/Engineered. Before finalising, scan every opening verb. The CV should read as 14–20 distinct achievements, not variations of one sentence.
- Strong metric shapes: "Automated X+ workflows…", "Reduced processing time by X%…", "Processed X records daily…", "Cut infrastructure cost by €X…". These are sentence shapes; the numbers still come from evidence.
- **Say automation or RPA, never "bot".** This covers the summary, role intros, bullets, Key Skills, and cover letters. Write "lender portal automation" or "RPA workflows", not "bot", and "automation detection", not "bot detection". `evidence.md` still says "bot" where it quotes repos and commits; reword it when carrying a claim into a CV.

## Bolding rules (subtle and surgical)
Bolding guides the eye to the two or three things per section that prove the candidate is worth interviewing. It is seasoning, not the main course: in a 6-second glance, the bold words alone should tell a compelling impact story.
- **Bold with `\textbf{}`:** only standout metrics (`\textbf{40\%}`, `\textbf{€120K}`) and high-impact result phrases (`\textbf{2,500+ users}`). Job headings are already bold via `\job`.
- **Don't bold:** whole bullets, phrases longer than 3 words, or generic action verbs. If a bullet has two numbers, bold at most one.
- **Frequency:** roughly 30–40% of bullets contain any bold, 1–3 words per instance. Bullets with no bold are normal.
- **Squint test:** with eyes half-closed, the bold words alone should tell a story of measurable impact. If the CV looks spotty or heavy, pull back immediately.

## Tailoring and ATS
- The job description says what they want; the CV proves the candidate already delivers it through their own past achievements. **Never copy, paraphrase, or mirror JD bullets or phrasing.**
- **Do use the JD's keywords** (technologies, skills, domain terms) at natural density in the summary, bullets, and Key Skills, but only where the evidence backs them. A JD requirement the candidate doesn't meet is a gap for `analysis.md`, not a keyword.
- Source every bullet from the past CVs and `evidence.md`: extract the most relevant achievements and reposition them toward the JD.
- Include only high-signal, relevant experience.
- Section titles via `\rsection{}` only, in the fixed order. No tables, graphics, icons, or sidebars; the Key Skills block is the only multi-column area; black text only.

## Job titles
- A title may be adjusted slightly to match the JD (e.g. "Software Engineer" to "Full Stack Software Engineer"), as long as it stays realistic and would survive a reference check.
- The title is the role name only. Never append company type, industry, region, or any descriptor. Wrong: "Software Engineer, SaaS Startup". Right: "Software Engineer". The company has its own line in `\job`.

## Final checklist (before delivering any CV)
- [ ] `cv/build.sh` passes: compiles with pdflatex, two pages at most, no `--`, no rendered TODOs, no LaTeX warnings, no merged words in the extracted text.
- [ ] 14–20 bullets (or fewer, explained per the conflict rules), each with a sourced number and an evidence ID comment. Concrete bullets without a number are an optional deviation (rule 3).
- [ ] No bullet starts with a number; metrics appear early.
- [ ] No action verb family appears more than twice.
- [ ] Bold on roughly 30–40% of bullets, 1–3 words each.
- [ ] No JD bullets or phrasing copied; keywords only where evidence backs them.
- [ ] Titles are role names only; all dates use `\textendash{}`.
- [ ] Section order correct; each role has a one- or two-line intro, then bullets.
- [ ] Key Skills columns balanced, every item relevant and backed.
- [ ] No LinkedIn; email is plain text.
- [ ] Nothing feels tight when the PDF is viewed.

---

## Conventions
- Tailor per job in `cv/variants/`. `cv/master-template.tex` changes only when the general CV improves.
- Add a fact to `evidence.md` before relying on it. A number taken from a past CV counts as sourced; record it with the file name as its source.
- Placeholders are `TODO`. A CV with rendered TODOs isn't ready to send.
- Dates are ISO (`2026-09-13`). Slugs are lowercase kebab-case.
- Application stages: `intake` → `drafted` → `applied` → `screen` → `onsite` → `offer` | `rejected` | `withdrawn` | `no-response`.

## Skills
- `/fetch-jobs [--country] [--location] [--roles] [--sites] [--interval MIN-MAX]` collects the last 30 days of ads for any country from LinkedIn and Indeed (plus IrishJobs.ie, Jobs.ie and Glassdoor in Ireland) into `research/<date>-<country>-jobs/combined.jsonl` for `/rank-jobs`.
- `/job-intake <JD text or URL>` scaffolds `jobs/<slug>/` and writes the gap analysis.
- `/rank-jobs [ads file | URLs]` scores saved ads or new postings against the profile and returns a ranked shortlist for `/job-intake`.
- `/tailor-cv <job slug>` builds the tailored CV variant and runs the checklist.
- `/cover-letter <job slug>` drafts the cover letter, then a fresh reviewer agent critiques the CV and letter.
- `/ats-score [job slug] [CV]` scores a CV out of 100 against a job on six research-backed ATS factors, compares it with the master, and lists evidence-backed fixes.
- `/outcome [slug | followup | stale]` logs stages in `status.md` and drafts follow-up notes (never sends).
- `/interview <job slug>` builds a stage-specific prep pack and offers a mock interview.
- These four are adapted from ai-job-search (MIT); keep `THIRD_PARTY_NOTICES.md` with them.
