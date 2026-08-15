import { createServer as createHttpServer } from 'node:http'
import { logError } from '../src/node/log.mjs'
import { DEFAULT_PORT, HOST } from './constants.mjs'
import { createEventHub } from './events.mjs'
import { createRoutes } from './routes.mjs'
import { sendError, sendNotFound } from './respond.mjs'
import { resolveAsset, sendFile } from './static.mjs'
import { createWatch } from './watch.mjs'

const matchRoute = (routes, method, pathname) => {
  return routes.find(
    (route) => route.method === method && route.path === pathname,
  )
}

export const createServer = ({ game, onQuit = () => {}, makeUpdateRun }) => {
  const hub = createEventHub()
  const watch = createWatch({ game, hub })
  const routes = createRoutes({ game, hub, onQuit, makeUpdateRun })

  const handleRequest = (request, response) => {
    const { pathname } = new URL(request.url, `http://${HOST}`)
    const route = matchRoute(routes, request.method, pathname)

    if (route) {
      Promise.resolve(route.handle(request, response)).catch((error) =>
        failRequest(response, error),
      )

      return
    }

    if (request.method !== 'GET') {
      sendNotFound(response)

      return
    }

    const asset = resolveAsset(pathname)

    if (!asset) {
      sendNotFound(response)

      return
    }

    sendFile(request, response, asset)
  }

  const failRequest = (response, error) => {
    if (!error.status) logError('server', error)

    if (response.headersSent) {
      response.end()

      return
    }

    sendError(response, error.status ?? 500, error.message)
  }

  const server = createHttpServer(handleRequest)

  const listen = (port) => {
    return new Promise((resolve, reject) => {
      const handleError = (error) => {
        if (error.code !== 'EADDRINUSE' || port === 0) {
          reject(error)

          return
        }

        server.off('error', handleError)
        listen(0).then(resolve, reject)
      }

      server.once('error', handleError)

      server.listen(port, HOST, () => {
        server.off('error', handleError)
        watch.start()
        resolve(`http://${HOST}:${server.address().port}`)
      })
    })
  }

  const close = () => {
    watch.stop()
    hub.close()
    server.close()
  }

  return { listen, close, hub, address: () => server.address() }
}

export const portFromEnv = (env = process.env) => {
  const port = Number.parseInt(env.CLAUDEMON_PORT, 10)

  if (!Number.isInteger(port) || port < 0 || port > 65_535) return DEFAULT_PORT

  return port
}
