import { CARD_FILE } from '../src/node/paths.mjs'
import { revealFile } from '../src/node/reveal.mjs'
import { decodeTrade, encodeTrade, writeTradeCode } from '../src/node/trade.mjs'
import { createUpdateRun } from '../src/node/update.mjs'
import { writeCard } from '../src/node/card.mjs'
import {
  transformResponseConfig,
  transformResponseSave,
} from '../src/transformers.mjs'
import { isSaveShaped } from '../src/state.mjs'
import { newTradeId } from '../src/trade.mjs'
import { CLIENT_HEADER, HOST, SERVER_MESSAGES } from './constants.mjs'
import { readBody, sendEmpty, sendError, sendJson } from './respond.mjs'
import { sendFile } from './static.mjs'
import {
  transformRequestUpdateRun,
  transformResponseGift,
  transformResponseTradeText,
} from './transformers.mjs'

const clientOf = (request) => {
  const header = request.headers[CLIENT_HEADER]

  if (header) return header

  return new URL(request.url, `http://${HOST}`).searchParams.get('client')
}

export const createRoutes = ({
  game,
  hub,
  onQuit,
  makeUpdateRun = createUpdateRun,
}) => {
  let update = null

  const getBootstrap = (request, response) => {
    sendJson(response, game.snapshot())
  }

  const getEvents = (request, response) => {
    hub.subscribe(response, clientOf(request))
  }

  const putSave = async (request, response) => {
    const save = transformResponseSave(await readBody(request))

    if (!isSaveShaped(save)) {
      sendError(response, 400, SERVER_MESSAGES.badRequest)

      return
    }

    game.persist(save)
    hub.broadcast('save', save, clientOf(request))
    sendEmpty(response)
  }

  const putConfig = async (request, response) => {
    const patch = transformResponseConfig(await readBody(request))

    if (!patch) {
      sendError(response, 400, SERVER_MESSAGES.badRequest)

      return
    }

    const config = game.applyConfig(patch)

    hub.broadcast('config', config, clientOf(request))
    sendJson(response, config)
  }

  const deleteEncounter = (request, response) => {
    game.clearEncounter()
    hub.broadcast('encounter', null, clientOf(request))
    sendEmpty(response)
  }

  const postCard = (request, response) => {
    const save = game.currentSave()

    if (!save) {
      sendError(response, 409, SERVER_MESSAGES.noSave)

      return
    }

    const path = writeCard(save, CARD_FILE)

    revealFile(path)
    sendJson(response, { path })
  }

  const getCard = (request, response) => {
    const save = game.currentSave()

    if (!save) {
      sendError(response, 409, SERVER_MESSAGES.noSave)

      return
    }

    const path = writeCard(save, CARD_FILE)

    sendFile(response, { path, cacheControl: 'no-store' })
  }

  const postTradeCode = async (request, response) => {
    const gift = transformResponseGift(await readBody(request))

    if (!gift) {
      sendError(response, 400, SERVER_MESSAGES.badRequest)

      return
    }

    const code = encodeTrade(gift.mon, gift.trainer, newTradeId())

    sendJson(response, { code, path: writeTradeCode(code) })
  }

  const postTradeRead = async (request, response) => {
    const body = transformResponseTradeText(await readBody(request))

    if (!body) {
      sendError(response, 400, SERVER_MESSAGES.badRequest)

      return
    }

    sendJson(response, decodeTrade(body.text))
  }

  const handleUpdateChange = (run) => {
    hub.broadcast('update', transformRequestUpdateRun(run))
  }

  const postUpdate = (request, response) => {
    if (update?.state !== 'running') {
      update = makeUpdateRun({ onChange: handleUpdateChange })
    }

    sendJson(response, transformRequestUpdateRun(update))
  }

  const getUpdate = (request, response) => {
    sendJson(response, transformRequestUpdateRun(update))
  }

  const postQuit = (request, response) => {
    sendEmpty(response)
    onQuit()
  }

  return [
    { method: 'GET', path: '/api/bootstrap', handle: getBootstrap },
    { method: 'GET', path: '/api/events', handle: getEvents },
    { method: 'PUT', path: '/api/save', handle: putSave },
    { method: 'PUT', path: '/api/config', handle: putConfig },
    { method: 'DELETE', path: '/api/encounter', handle: deleteEncounter },
    { method: 'POST', path: '/api/card', handle: postCard },
    { method: 'GET', path: '/api/card.png', handle: getCard },
    { method: 'POST', path: '/api/trade/code', handle: postTradeCode },
    { method: 'POST', path: '/api/trade/read', handle: postTradeRead },
    { method: 'POST', path: '/api/update', handle: postUpdate },
    { method: 'GET', path: '/api/update', handle: getUpdate },
    { method: 'POST', path: '/api/quit', handle: postQuit },
  ]
}
