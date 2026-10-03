---
name: tailor-cv
description: Build an ATS-optimised CV (two pages at most) for one job application from the candidate's past CVs and profile/evidence.md, following the CV system in CLAUDE.md, then compile and check it. Use when the user wants a CV for a specific job.
argument-hint: <job folder slug, e.g. 2026-09-13-acme-senior-backend>
---

# Tailor CV

Job: $ARGUMENTS. If empty, use the most recently dated folder in `jobs/` (ignoring `_template`) and say which one you picked.

1. **Load context.** Read `jobs/<slug>/posting.md` and `analysis.md`. If `analysis.md` is still the unfilled template, do the /job-intake analysis first. Read `profile/evidence.md`, every PDF in `profile/past-cvs/`, and `cv/master-template.tex`. Re-read the CV system in `CLAUDE.md`.
2. **Resolve open questions.** If an answer to "Questions for me" would change the CV, ask before writing. Record new facts in `evidence.md` first.
3. **Select.** Rank achievements that have sourced numbers by relevance to the posting's must-haves. Pick 14–20 bullets (the current role can carry more; earlier roles get 2–4 each) and drop roles that don't serve this job. If fewer than 14 relevant achievements have numbers, use fewer and list the ones that need a number. Optional deviation (`CLAUDE.md` rule 3): a concrete bullet without a number that cites its evidence ID.
4. **Write the variant** at `cv/variants/<YYYY-MM>-<company>-<role>.tex` (the job slug minus the day) as a copy of `cv/master-template.tex`, changing content only:
   - Professional Summary: keep the originality of the master CV's summary. Its wording, voice, career story, and sentence order are the candidate's own, so edit it lightly: swap in the facts and keywords this posting needs, and never replace it with a newly written summary. Exactly 5 lines in the rendered PDF, with no visibly stretched word spacing, covering the target role type, years and breadth of experience, domain strengths, and one standout metric. No first person.
   - Key Skills: reorder, swap, and cut items so the posting's must-haves come first, keeping the rows balanced: all three columns hold the same number of items, with no item wrapping onto a second line (`CLAUDE.md`, Key Skills). At most 30 items in total (10 per column). Count the items per column before building.
   - Titles adjusted only within the job title rules, role name only.
   - Under each `\job`, a one- or two-line role intro (see Professional Experience in `CLAUDE.md`), then bullets, one `\item` per line, in Point → Action → Result form: action verb first, metric within the first six words, evidence ID comment at the end of the line.
   - The posting's keywords woven in only where evidence backs them. None of its sentences or bullets.
   - Bold per the bolding rules.
5. **Build** with `cv/build.sh cv/variants/<variant>.tex`. Fix every FAIL and WARN and rebuild until clean. Over two pages means cutting content (fewer bullets, sharper wording, dropping a less relevant role), never touching formatting.
6. **Self-review** against the final checklist in `CLAUDE.md`, especially what the script can't check: verb synonym families, copied JD phrasing, bold word counts, title realism, and whether any area feels tight.
7. **Record** a copy of the final `.tex` in `jobs/<slug>/` (same file name, recopied after every rebuild), the PDF path in the **CV variant** field of `jobs/<slug>/status.md`, set **Current stage** to `drafted`, and add a dated row. Don't mark it `applied`; that happens when the user sends it.
8. **Report:** PDF path, page count, any remaining WARN lines with the reason, must-haves covered and not covered, and any bullet the user should double-check.
