import { KEEPALIVE_MS, SSE_RETRY_MS } from './constants.mjs'

const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-store',
  connection: 'keep-alive',
}

const frame = (type, payload) => {
  return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`
}

export const createEventHub = () => {
  const clients = new Set()

  const drop = (client) => clients.delete(client)

  const subscribe = (response, clientId) => {
    response.writeHead(200, SSE_HEADERS)
    response.write(`retry: ${SSE_RETRY_MS}\n\n`)

    const client = { response, clientId }

    clients.add(client)

    const keepalive = setInterval(
      () => response.write(': ping\n\n'),
      KEEPALIVE_MS,
    )

    const handleClose = () => {
      clearInterval(keepalive)
      drop(client)
    }

    response.on('close', handleClose)

    return client
  }

  const broadcast = (type, payload, exceptId = null) => {
    const body = frame(type, payload)
    let sent = 0

    for (const client of clients) {
      if (exceptId && client.clientId === exceptId) continue

      client.response.write(body)
      sent++
    }

    return sent
  }

  const close = () => {
    for (const client of clients) client.response.end()

    clients.clear()
  }

  return { subscribe, broadcast, close, size: () => clients.size }
}
