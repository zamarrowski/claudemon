<!-- Read CONTRIBUTING.md and CLAUDE.md before opening this. -->

## What this does

<!-- A summary of the change, and why it is worth making. If it fixes an issue,
say "Closes #123". -->

## How to see it

<!-- The steps to reach the change: which screen, which keys, which state.
For anything visual, paste a screenshot of the browser tab. -->

## Checklist

- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run format:check` passes
- [ ] `npm run coverage` passes, and thresholds in `vitest.config.mjs` were raised
      if coverage went up (never lowered)
- [ ] New modules have tests, and the tests follow the conventions in CLAUDE.md
- [ ] Version bumped in `.claude-plugin/plugin.json` — patch / minor / major
- [ ] Commit subjects are `area: lowercase phrase`, one line, no trailing period
- [ ] No new runtime dependencies, no hand-edited `data/`, no comments

## Anything else

<!-- Trade-offs, things you were unsure about, follow-ups you deliberately left
out. Delete if there is nothing. -->
