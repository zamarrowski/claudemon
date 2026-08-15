import { BODY_LIMIT_BYTES, NO_STORE, SERVER_MESSAGES } from './constants.mjs'

export const sendJson = (response, payload, status = 200) => {
  const body = JSON.stringify(payload)

  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': NO_STORE,
  })
  response.end(body)
}

export const sendEmpty = (response, status = 204) => {
  response.writeHead(status)
  response.end()
}

export const sendError = (response, status, message) => {
  sendJson(response, { error: message }, status)
}

export const sendNotFound = (response) => {
  sendError(response, 404, SERVER_MESSAGES.notFound)
}

const badRequest = (message) => {
  const error = new Error(message)

  error.status = 400

  return error
}

export const readBody = (request) => {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    const handleData = (chunk) => {
      size += chunk.length

      if (size > BODY_LIMIT_BYTES) {
        request.destroy()
        reject(badRequest(SERVER_MESSAGES.tooLarge))

        return
      }

      chunks.push(chunk)
    }

    const handleEnd = () => {
      if (chunks.length === 0) {
        resolve(null)

        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(badRequest(SERVER_MESSAGES.badRequest))
      }
    }

    request.on('data', handleData)
    request.on('end', handleEnd)
    request.on('error', reject)
  })
}
