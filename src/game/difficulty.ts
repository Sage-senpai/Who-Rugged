/* Difficulty tuning. One place so the engine, settings, and HUD agree.
   noise is the +/- jitter on a suspicion read. thief/baiter/innocent are the
   read centres: on Hardboiled the baiter reads almost exactly like the thief,
   which is what makes a wrong bust so tempting. */
import type { Difficulty } from '../lib/types'

export interface DifficultyConfig {
  id: Difficulty
  label: string
  blurb: string
  probes: number
  noise: number
  thief: number
  baiter: number
  innocent: number
  bondMul: number
  /** Hard per-case time limit in seconds. The clock pauses with the game. */
  timeLimit: number
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  rookie: {
    id: 'rookie',
    label: 'Rookie',
    blurb: 'Three scans, clearer reads, the bait stays obvious.',
    probes: 3,
    noise: 5,
    thief: 66,
    baiter: 50,
    innocent: 24,
    bondMul: 0.8,
    timeLimit: 120,
  },
  detective: {
    id: 'detective',
    label: 'Detective',
    blurb: 'Two scans, honest noise. The standard beat.',
    probes: 2,
    noise: 8,
    thief: 64,
    baiter: 58,
    innocent: 26,
    bondMul: 1,
    timeLimit: 90,
  },
  hardboiled: {
    id: 'hardboiled',
    label: 'Hardboiled',
    blurb: 'One scan, heavy noise, the bait reads like the thief.',
    probes: 1,
    noise: 12,
    thief: 62,
    baiter: 62,
    innocent: 30,
    bondMul: 1.3,
    timeLimit: 60,
  },
}

export const DIFFICULTIES: DifficultyConfig[] = [
  DIFFICULTY.rookie,
  DIFFICULTY.detective,
  DIFFICULTY.hardboiled,
]
