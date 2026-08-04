// Serves docs/ — the landing page — the way GitHub Pages will.
//
// The page is plain HTML with no build step, so opening the file in a browser mostly
// works. This exists for the places where it does not: a directory URL that should
// resolve to index.html, a path that starts at the site root rather than at your
// filesystem, and anything wanting a real origin. All three behave here as they will
// once Pages has it, so what you see is what gets published.
//
//   node tools/serve-site.mjs
//   node tools/serve-site.mjs --port 4000 --open

import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contains } from '../src/paths.mjs'
import { bold, dim, red } from '../src/ui/ansi.mjs'

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')

/** How many ports up from the one asked for to try before giving up. */
const PORT_ATTEMPTS = 10

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const args = process.argv.slice(2)
const wantsBrowser = args.includes('--open')

const portFlag = args.indexOf('--port')
const port = Number(portFlag >= 0 ? args[portFlag + 1] : (process.env.PORT ?? 8080))
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`${red('serve-site')} --port wants a number between 1 and 65535`)
  process.exit(1)
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  let target = decodeURIComponent(pathname)

  // normalize() collapses any ../ before it can climb out of docs/; the check after
  // it is what catches whatever normalize() leaves behind.
  let filePath = join(SITE_DIR, normalize(target))
  if (!contains(SITE_DIR, filePath)) {
    console.log(dim(`  403 ${target}`))
    return send(res, 403, 'Forbidden\n')
  }

  let info = await stat(filePath).catch(() => null)

  // A directory is a redirect and then an index, which is what Pages does — so a
  // link that only works without the trailing slash fails here too.
  if (info?.isDirectory()) {
    if (!target.endsWith('/')) {
      res.writeHead(301, { location: target + '/' })
      console.log(dim(`  301 ${target}`))
      return res.end()
    }
    filePath = join(filePath, 'index.html')
    target += 'index.html'
    info = await stat(filePath).catch(() => null)
  }

  if (!info?.isFile()) {
    console.log(dim(`  404 ${target}`))
    return send(res, 404, `Not found: ${target}\n`)
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': 'no-store',
  })
  console.log(dim(`  200 ${target}`))
  createReadStream(filePath).pipe(res)
})

function open(url) {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
  spawn(command, [url], { stdio: 'ignore', detached: true }).unref()
}

// Registered once rather than passed to listen(), which would leave the callback of
// every failed attempt attached and announce a port nothing is listening on.
server.on('listening', () => {
  const url = `http://localhost:${server.address().port}/`
  console.log(`${bold('claudemon')} landing at ${bold(url)}`)
  console.log(dim(`  serving ${SITE_DIR}`))
  console.log(dim('  ctrl-c to stop\n'))
  if (wantsBrowser) open(url)
})

function listen(attempt) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < PORT_ATTEMPTS - 1) {
      console.log(dim(`  ${port + attempt} is taken, trying ${port + attempt + 1}`))
      listen(attempt + 1)
      return
    }
    console.error(`${red('serve-site')} ${error.message}`)
    process.exit(1)
  })

  server.listen(port + attempt)
}

listen(0)
