---
name: outcome
description: Record what happened to a job application (applied, screen, onsite, offer, rejected, withdrawn, no response) in jobs/<slug>/status.md, and draft follow-up or thank-you notes for the user to send. Use when the user says they sent an application, heard back, or wants to chase a quiet one.
argument-hint: "[slug or company] | followup [days | slug] | stale [days]"
---

<!-- Adapted from ai-job-search by Mads Lorentzen (MIT License). See THIRD_PARTY_NOTICES.md. -->

# Outcome

Input: $ARGUMENTS

**Stages** are the ones in `CLAUDE.md`. **Open:** `intake`, `drafted`, `applied`, `screen`, `onsite`, `offer`. **Final:** `rejected`, `withdrawn`, `no-response`, and `offer` once a row records it as accepted or declined. **Days quiet** count from the latest dated row in `status.md`. **Follow-ups sent** count rows whose note starts with "followed up".

1. **Parse the input.**
   - Nothing: read every `jobs/*/status.md` (ignoring `_template` and `_ranking`). List open applications in a numbered table: company, role, stage, last update, days quiet, follow-ups sent. Put `intake` and `drafted` under their own heading ("Not sent yet"), with no days quiet, because nobody owes a reply. Under the table, offer a follow-up draft if any sent application is 10+ days quiet with fewer than two follow-ups, and `/outcome stale` if any is 60+ days quiet. Ask which one to update.
   - A slug or company: match it against the `jobs/` folders. One match: proceed. Several: ask. None: collect company, role, date sent, and posting link, then scaffold the folder from `jobs/_template/` as /job-intake step 2–3 does.
   - `followup`, `followup <days>`, `followup <slug>`: go to step 3. `stale`, `stale <days>`: go to step 4.
2. **Record what happened.** Ask one or two open questions: what happened and when, any feedback (verbatim where the user remembers it), and anything they'd do differently. Then, in `status.md`:
   - Set **Current stage** and add a dated row with the stage and a short note. Never move a stage backwards unless the user says the earlier entry was wrong.
   - Moving to `applied`: date the row with the day it was actually sent. The CV variant and `cover-letter.md` in the folder are now the versions the employer holds. Tell the user a re-tailor needs a new variant file, not an edit.
   - Append feedback under `## Feedback`, dated and verbatim. Never rewrite earlier entries.
   - A new interview stage: offer `/interview <slug>` if it's upcoming, or a thank-you note (step 3's drafting rules, 2–3 sentences) if it has just happened.
   - An achievement, metric, or project the user mentions in passing: offer to add it to `profile/evidence.md`.
3. **Follow-up branch.**
   - **Candidates:** stage `applied`, `screen`, or `onsite`, quiet for at least the threshold (default 10 days), with fewer than two follow-ups. Show them as a table (company, role, days quiet, follow-ups sent, contact) and draft only for the ones the user picks.
   - **Draft** 60–120 words:
     - Address the contact from `status.md`, otherwise the hiring team.
     - One sentence restating interest in the specific role.
     - One concrete reminder of value, taken only from the CV variant and cover letter that were sent. No new claims.
     - One polite question about the timeline.
     - Email gets a subject line; a LinkedIn message is shorter, with none. Same style bans as the cover letter: no `--`, no clichés, no "just checking in".
   - **Log only after the user confirms it's sent:** add a dated row "followed up (<channel>)" and save the note as `jobs/<slug>/followup-<YYYY-MM-DD>.md`. If they don't send it, log nothing.
   - **Two at most.** After two silent follow-ups, don't offer a third. Say how long it has been since the last contact and let the user decide whether to record `no-response`.
4. **Stale sweep.** List applications at `applied`, `screen`, or `onsite` that have been quiet for at least the threshold (default 60 days): company, role, date sent, days quiet, follow-ups sent, proposed stage `no-response`. Ask: all, select (by number), or skip. **Write nothing until the user answers.** For each confirmed one, set **Current stage** to `no-response` and add a dated row: "no response after N days quiet".
5. **Confirm** per folder: the stage change, the rows added, and any note files saved.

Draft only: this skill never sends, emails, or submits anything.
