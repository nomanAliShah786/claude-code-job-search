# Contributing

Thanks for helping. This project is plain text, so you don't need to be a programmer to contribute: most skills are step-by-step instructions written in English.

## Ways to help

- **Report a bug** or **suggest a skill** with the [issue templates](https://github.com/nomanAliShah786/claude-code-job-search/issues/new/choose).
- **Add or improve a skill.** Skills live in `.claude/skills/<name>/SKILL.md`. The easiest way to write one is to ask Claude Code: `Make a new skill that ...`. Then test it on a real job ad.
- **Add a job site or country** to `/fetch-jobs`: a collector script in `.claude/skills/fetch-jobs/scripts/` plus a line in its `SKILL.md`.
- **Improve the docs**, especially the beginner guide in the README.

## Before you open a pull request

1. **No personal data.** Never commit anything from `profile/`, `jobs/` (except `jobs/_template/`), `cv/variants/`, `research/`, your own `cv/master-template.tex` or `CLAUDE.local.md`. Use fictional examples, as in `docs/sample-cv.tex`.
2. **Keep the CV formatting rules** in `CLAUDE.md` intact. Fix overflow by cutting content, never by changing the template's spacing or fonts.
3. **Test it.** For CV changes, `cv/build.sh docs/sample-cv.tex` must pass. For a skill, run it once end to end and describe the result in the PR.
4. **Keep it small:** one change per pull request, with a short description of what and why.
5. **Respect job sites:** collectors keep random delays between requests and stop at captchas or sign-in walls. Never add code that bypasses them.

## Code style

Match the surrounding files: short functions, plain names, few comments. Skills are numbered steps in plain English.
