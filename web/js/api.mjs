import { CLIENT_HEADER } from '../../src/constants.mjs'
import { API, DATASET_URLS } from './constants.mjs'
import {
  transformResponseActivity,
  transformResponseBootstrap,
  transformResponseEncounter,
  transformResponseNotice,
  transformResponseTradeRead,
  transformResponseUpdateRun,
  transformRequestGift,
} from './transformers.mjs'

const clientId = Math.random().toString(36).slice(2)

const headers = {
  'content-type': 'application/json',
  [CLIENT_HEADER]: clientId,
}

const send = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`${method} ${url} — ${response.status}`)
  if (response.status === 204) return null

  return response.json()
}

export const fetchDataset = async () => {
  const [pokedex, moves, types, growth] = await Promise.all(
    DATASET_URLS.map(async (url) => (await fetch(url)).json()),
  )

  return { pokedex, moves, types, growth }
}

export const fetchBootstrap = async () => {
  return transformResponseBootstrap(await send('GET', API.bootstrap))
}

export const putSave = (save) => send('PUT', API.save, save)

export const putConfig = (patch) => send('PUT', API.config, patch)

export const dropEncounter = () => send('DELETE', API.encounter)

export const askForCard = () => send('POST', API.card)

export const askForTradeCode = async (mon, trainer) => {
  return send('POST', API.tradeCode, transformRequestGift(mon, trainer))
}

export const readTradeCode = async (text) => {
  return transformResponseTradeRead(await send('POST', API.tradeRead, { text }))
}

export const startUpdate = async () => {
  return transformResponseUpdateRun(await send('POST', API.update))
}

export const quitGame = () => send('POST', API.quit)

const READ_EVENT = {
  encounter: transformResponseEncounter,
  activity: transformResponseActivity,
  notice: transformResponseNotice,
  update: transformResponseUpdateRun,
}

const readEvent = (type, data) => {
  const read = READ_EVENT[type]

  if (!read) return data

  return read(data)
}

export const listenForEvents = (handlers) => {
  const source = new EventSource(`${API.events}?client=${clientId}`)

  for (const [type, handle] of Object.entries(handlers)) {
    source.addEventListener(type, (event) =>
      handle(readEvent(type, JSON.parse(event.data))),
    )
  }

  return () => source.close()
}
