import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { SHIM_APP_PATTERN, SHIM_MARKER } from './constants.mjs'
import { HOME, PLUGIN_CACHE } from './paths.mjs'
import { APP_ROOT, isPluginCopy } from './version.mjs'

export const LAUNCHERS = [
  {
    path: join(homedir(), '.local', 'bin', 'claudemon'),
    target: 'bin/claudemon',
  },
  {
    path: join(HOME, 'statusline.sh'),
    target: 'scripts/run.sh',
    args: 'statusline.mjs',
  },
]

export const shimSource = ({ target, args, root, cache = PLUGIN_CACHE }) => {
  const argSuffix = args ? ` ${args}` : ''

  return `#!/bin/sh
# ${SHIM_MARKER} — rerun it rather than editing this.
#
# Resolves where claudemon lives, then hands over. See src/shim.mjs.

app="${root}"
[ -d "$app" ] || app=$(ls -td "${cache}"/*/ 2>/dev/null | head -1)

if [ -z "$app" ] || [ ! -d "$app" ]; then
  echo "claudemon: cannot find its files. Reinstall with /claudemon-setup" >&2
  exit 1
fi

exec "$app/${target}"${argSuffix} "$@"
`
}

export const writeLauncher = ({
  path,
  target,
  args,
  root,
  cache = PLUGIN_CACHE,
}) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, shimSource({ target, args, root, cache }))
  chmodSync(path, 0o755)
}

export const pointsElsewhere = (source, root, cache = PLUGIN_CACHE) => {
  if (!source.includes(SHIM_MARKER)) return false

  const named = source.match(SHIM_APP_PATTERN)?.[1]

  if (named == null) return true
  if (!isPluginCopy(named, cache)) return false

  return named !== root
}

export const relinkLaunchers = ({
  root = APP_ROOT,
  cache = PLUGIN_CACHE,
  launchers = LAUNCHERS,
} = {}) => {
  const rewritten = []

  for (const launcher of launchers) {
    let source

    try {
      source = readFileSync(launcher.path, 'utf8')
    } catch {
      continue
    }

    if (!pointsElsewhere(source, root, cache)) continue

    writeLauncher({
      path: launcher.path,
      target: launcher.target,
      args: launcher.args,
      root,
      cache,
    })
    rewritten.push(launcher.path)
  }

  return rewritten
}
