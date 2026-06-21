/* Picks the engine for the solo game and stays resilient: if 0G Compute is
   configured but the server is unreachable, opening a case falls back to the
   local mock so the game never dead-ends. Mid-case calls stay on whichever
   engine sealed the case (the server holds those roles), so a failure there
   surfaces normally rather than silently swapping a different answer. */
import type { GameEngine } from '../lib/types'
import { mockEngine } from './mockEngine'
import { computeEngine, computeConfigured } from './computeEngine'

export const aiConfigured = computeConfigured

let activeMode: 'compute' | 'local' = computeConfigured ? 'compute' : 'local'
export const getAiMode = (): 'compute' | 'local' => activeMode

const resilient: GameEngine = {
  async openCase(caseNo, difficulty) {
    try {
      const c = await computeEngine.openCase(caseNo, difficulty)
      activeMode = 'compute'
      return c
    } catch {
      activeMode = 'local'
      return mockEngine.openCase(caseNo, difficulty)
    }
  },
  probe: (c, id) => (activeMode === 'compute' ? computeEngine : mockEngine).probe(c, id),
  resolve: (c, a, p) => (activeMode === 'compute' ? computeEngine : mockEngine).resolve(c, a, p),
  resolveTimeout: (c, p) => (activeMode === 'compute' ? computeEngine : mockEngine).resolveTimeout(c, p),
}

export const gameEngine: GameEngine = computeConfigured ? resilient : mockEngine
