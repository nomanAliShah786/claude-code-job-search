# Third-party notices

This project includes work adapted from the open-source project below. Its licence requires the copyright notice and permission notice to accompany any copy or substantial portion, so both are reproduced in full.

## ai-job-search

- **Source:** https://github.com/MadsLorentzen/ai-job-search, commit `120f476` (2026-09-21)
- **Licence:** MIT
- **Adapted into this project (2026-09-23):**

| This project | Adapted from | What changed |
|---|---|---|
| `.claude/skills/rank-jobs/SKILL.md` | `.claude/commands/rank.md`, `.claude/skills/job-application-assistant/04-job-evaluation.md` | Scores saved Irish ads or pasted postings against `profile/evidence.md` instead of scraper state; no behavioural dimension; results kept in `jobs/_ranking/` |
| `.claude/skills/cover-letter/SKILL.md` | `.claude/commands/apply.md` (Steps 2–4), `03-writing-style.md`, `06-cover-letter-templates.md` | Cover letter only, in Markdown; the reviewer agent critiques the existing CV variant and letter; this project's CV and evidence rules apply |
| `.claude/skills/outcome/SKILL.md` | `.claude/commands/outcome.md` | Records stages in `jobs/<slug>/status.md` instead of a CSV tracker and archive folder |
| `.claude/skills/interview/SKILL.md` | `.claude/commands/interview.md`, `07-interview-prep.md` | Reads the job folder, `profile/stories.md` and `profile/evidence.md` |

Nothing else from ai-job-search is included. In particular, the cover-letter LaTeX class, its bundled fonts, the job-portal tools, and the mascot artwork are not used. This project is independent and is not affiliated with or endorsed by the author of ai-job-search.

```
MIT License

Copyright (c) 2026 Mads Lorentzen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
