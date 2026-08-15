import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'
import {
  TRADE_CODE_PREFIX,
  TRADE_MESSAGES,
  TRADE_VERSION,
} from '../constants.mjs'
import { isReadableTrade } from '../trade.mjs'
import {
  transformRequestTrade,
  transformResponseTrade,
} from '../transformers.mjs'
import { TRADE_FILE } from './paths.mjs'

export const encodeTrade = (mon, trainer, id) => {
  const payload = transformRequestTrade({
    v: TRADE_VERSION,
    id,
    mon,
    from: { name: trainer.name, at: trainer.startedAt },
  })
  const body = deflateSync(JSON.stringify(payload)).toString('base64url')

  return `${TRADE_CODE_PREFIX}${body}`
}

const readTrade = (body) => {
  try {
    const trade = transformResponseTrade(
      JSON.parse(inflateSync(Buffer.from(body, 'base64url')).toString('utf8')),
    )

    if (!isReadableTrade(trade)) return null

    return trade
  } catch {
    return null
  }
}

export const decodeTrade = (text) => {
  const trimmed = text.trim()

  if (!trimmed.startsWith(TRADE_CODE_PREFIX)) {
    return { ok: false, reason: TRADE_MESSAGES.unreadable }
  }

  const trade = readTrade(trimmed.slice(TRADE_CODE_PREFIX.length))

  if (!trade) return { ok: false, reason: TRADE_MESSAGES.unreadable }
  if (trade.v > TRADE_VERSION) {
    return { ok: false, reason: TRADE_MESSAGES.fromNewer }
  }

  return { ok: true, trade }
}

export const writeTradeCode = (code, path = TRADE_FILE) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${code}\n`)

  return path
}
