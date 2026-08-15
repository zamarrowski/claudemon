import { BAG_MODES } from '../../../src/constants.mjs'
import * as bagView from './bag.mjs'
import * as battleView from './battle.mjs'
import * as boxView from './box.mjs'
import * as daycareView from './daycare.mjs'
import * as dexView from './dex.mjs'
import * as gymView from './gym.mjs'
import * as gymsView from './gyms.mjs'
import * as homeView from './home.mjs'
import * as optionsView from './options.mjs'
import * as shopView from './shop.mjs'
import * as starterView from './starter.mjs'
import * as teamView from './team.mjs'
import * as tradeView from './trade.mjs'
import * as trainerView from './trainer.mjs'
import * as updateView from './update.mjs'

const VIEWS = {
  starter: starterView,
  home: homeView,
  battle: battleView,
  dex: dexView,
  team: teamView,
  bag: bagView,
  box: boxView,
  daycare: daycareView,
  shop: shopView,
  options: optionsView,
  update: updateView,
  gyms: gymsView,
  gym: gymView,
  trade: tradeView,
  trainer: trainerView,
}

export const activeView = (ctx) => {
  if (ctx.bagSelection !== null && BAG_MODES.has(ctx.mode)) return VIEWS.bag

  return VIEWS[ctx.mode]
}
