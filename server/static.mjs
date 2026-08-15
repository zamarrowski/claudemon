import { createReadStream, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import {
  BUNDLED_ASSETS_DIR,
  DATA_DIR,
  ENGINE_DIR,
  SPRITES_DIR,
  WEB_DIR,
  dataFile,
} from '../src/node/paths.mjs'
import {
  DEFAULT_MIME_TYPE,
  INDEX_PATH,
  MIME_TYPES,
  NOT_MODIFIED,
  NO_CACHE,
  SPRITE_CACHE_CONTROL,
} from './constants.mjs'

const ROOTS = [
  {
    prefix: '/sprites/',
    dir: SPRITES_DIR,
    cacheControl: SPRITE_CACHE_CONTROL,
  },
  {
    prefix: '/sounds/',
    dir: BUNDLED_ASSETS_DIR,
    cacheControl: SPRITE_CACHE_CONTROL,
  },
  {
    prefix: '/src/',
    dir: ENGINE_DIR,
    cacheControl: NO_CACHE,
    hidden: 'node/',
  },
  {
    prefix: '/data/',
    dir: DATA_DIR,
    cacheControl: NO_CACHE,
    lookUp: dataFile,
  },
]

const within = (root, relative) => {
  const target = resolve(join(root, relative))

  if (target !== root && !target.startsWith(`${root}${sep}`)) return null

  return target
}

const etagOf = (stats) => {
  const size = stats.size.toString(16)
  const modified = Math.trunc(stats.mtimeMs).toString(16)

  return `W/"${size}-${modified}"`
}

const fileAt = (path) => {
  try {
    const stats = statSync(path)

    if (!stats.isFile()) return null

    return { path, etag: etagOf(stats) }
  } catch {
    return null
  }
}

const fileIn = (root, relative) => {
  const target = within(root.dir, relative)

  if (!target) return null
  if (root.hidden && relative.startsWith(root.hidden)) return null
  if (root.lookUp) return fileAt(root.lookUp(relative))

  return fileAt(target)
}

const assetOf = (file, cacheControl) => {
  if (!file) return null

  return { path: file.path, etag: file.etag, cacheControl }
}

export const resolveAsset = (pathname) => {
  const root = ROOTS.find((entry) => pathname.startsWith(entry.prefix))

  if (root) {
    const relative = pathname.slice(root.prefix.length)

    return assetOf(fileIn(root, relative), root.cacheControl)
  }

  const page = { dir: WEB_DIR }
  const name = pathname === '/' ? INDEX_PATH : pathname.slice(1)

  return assetOf(fileIn(page, name), NO_CACHE)
}

export const contentTypeOf = (path) => {
  return MIME_TYPES[extname(path).toLowerCase()] ?? DEFAULT_MIME_TYPE
}

const matchesEtag = (header, etag) => {
  if (!header) return false

  return header.split(',').some((candidate) => candidate.trim() === etag)
}

export const sendFile = (request, response, { path, cacheControl, etag }) => {
  if (matchesEtag(request.headers['if-none-match'], etag)) {
    response.writeHead(NOT_MODIFIED, { 'cache-control': cacheControl, etag })
    response.end()

    return
  }

  response.writeHead(200, {
    'content-type': contentTypeOf(path),
    'cache-control': cacheControl,
    etag,
  })

  createReadStream(path).pipe(response)
}
