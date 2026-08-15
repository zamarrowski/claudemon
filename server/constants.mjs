export const DEFAULT_PORT = 7626

export const HOST = '127.0.0.1'

export const POLL_MS = 2000

export const HEARTBEAT_MS = 5000

export const UPDATE_POLL_MS = 60_000

export const SSE_RETRY_MS = 2000

export const KEEPALIVE_MS = 20_000

export const CLIENT_HEADER = 'x-claudemon-client'

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

export const DEFAULT_MIME_TYPE = 'application/octet-stream'

export const BODY_LIMIT_BYTES = 4_000_000

export const STATIC_ROOTS = [
  { prefix: '/sprites/', root: 'sprites' },
  { prefix: '/data/', root: 'data' },
  { prefix: '/sounds/', root: 'assets' },
]

export const NO_STORE = 'no-store'

export const SPRITE_CACHE_CONTROL = 'public, max-age=86400'

export const SERVER_MESSAGES = {
  notFound: 'not found',
  badRequest: 'bad request',
  tooLarge: 'that payload is too big',
  noSave: 'there is no save yet',
}
