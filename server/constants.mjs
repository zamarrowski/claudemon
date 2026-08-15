export const DEFAULT_PORT = 7626

export const HOST = '127.0.0.1'

export const POLL_MS = 2000

export const HEARTBEAT_MS = 5000

export const UPDATE_POLL_MS = 60_000

export const SSE_RETRY_MS = 2000

export const KEEPALIVE_MS = 20_000

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

export const INDEX_PATH = 'index.html'

export const NO_STORE = 'no-store'

export const NO_CACHE = 'no-cache'

export const NOT_MODIFIED = 304

export const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': NO_STORE,
  connection: 'keep-alive',
}

export const SPRITE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export const SERVER_MESSAGES = {
  notFound: 'not found',
  badRequest: 'bad request',
  tooLarge: 'that payload is too big',
  noSave: 'there is no save yet',
}
