---
description: Finish installing claudemon — the command, the status line and the sprites
allowed-tools: Bash
---

Finish installing claudemon by running its installer. Everything it needs is already
on disk: the plugin was copied here when it was installed, so this downloads only the
sprites.

Run exactly this:

```bash
node "$CLAUDE_PLUGIN_ROOT/tools/install.mjs"
```

If `$CLAUDE_PLUGIN_ROOT` turns out to be empty, find the installed copy instead —
`ls -td ~/.claude/plugins/cache/claudemon/claudemon/*/ | head -1` — and run
`tools/install.mjs` from there.

The installer is idempotent and prints a `✔`, `•` or `✘` per step. Report back
briefly:

- If every step passed: tell them to **restart Claude Code** so the hooks and the
  status line load, then run `claudemon`, which serves the game locally and opens it
  in their browser.
- If any step did not: say which one and what the installer suggested for it. The
  usual one is `~/.local/bin` not being on their `PATH`, and the installer prints the
  line to add.

Do not try to fix a failing step by inventing your own commands, and do not run the
game — it holds the terminal open while it serves. Only relay what the installer
said.
