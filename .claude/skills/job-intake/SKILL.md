---
name: job-intake
description: Scaffold a job application folder from a pasted job description or URL and write a gap analysis against profile/evidence.md. Use when the user pastes a job posting or asks whether a role is a fit.
argument-hint: <job description text or URL>
---

# Job intake

Input: $ARGUMENTS

1. **Get the posting.** If the input is a URL, fetch it. If the fetch fails or the text looks truncated, ask the user to paste it. If there's no input, ask for the posting. Don't analyse a partial job description.
2. **Name the folder** `jobs/<today, YYYY-MM-DD>-<company>-<role>/` in lowercase kebab-case, with the role shortened to its core (`senior-backend`, not `senior-backend-software-engineer-ii-payments`). If a folder for the same company and role already exists, stop and ask whether to update it.
3. **Scaffold** by copying `jobs/_template/`. Fill `posting.md` with the metadata and the job description verbatim. In `status.md`, fill the header and set the first row to today's date with stage `intake`.
4. **Analyse** into `analysis.md`. Read `profile/evidence.md` and the PDFs in `profile/past-cvs/` first.
   - Split requirements into must-have and nice-to-have, quoted in the posting's own words.
   - Map each to evidence IDs. `strong`: a `verified` entry matches directly. `partial`: adjacent evidence, or a matching entry still marked `needs-detail`. `gap`: nothing.
   - Keywords to include: terms only (technologies, skills, domain words), never the posting's sentences, and only where the evidence backs them.
   - For each gap, give an honest adjacent framing or write "leave out". Never suggest wording that implies experience the evidence doesn't show.
   - Flag dealbreakers: location or office requirement, work authorisation or employment permit sponsorship, years of experience, clearance. Check them against `profile/job-preferences.md`.
   - Under "Questions for me", list experience the user plausibly has that `evidence.md` doesn't record. Answers to these grow the evidence bank.
   - If the posting names a certification, check `profile/certifications.md` and note it in the targets table's "Why" column.
5. **Report** in chat: the verdict, top 3 matches, top 3 gaps, the questions, and the next step (`/tailor-cv <slug>`). Don't draft the CV or cover letter here.
