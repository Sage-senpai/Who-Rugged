/* Suspect personas and their lines.
   In production these statements come from 0G Compute (agentSpeak), system
   prompted with each agent's hidden role. Here they are a local stand in so
   the loop plays end to end. Voice: terse, investigative, crypto-native.
   House rule honored: no em dashes anywhere. */
import type { RoleType } from '../lib/types'

export const PROFESSIONS = [
  'Doctor',
  'Lawyer',
  'Technician',
  'DevRel',
  'Community',
  'Auditor',
  'Validator',
] as const

export const HANDLES = [
  '0xMaya',
  'NodeRunner',
  'priya.eth',
  'Sasha_K',
  'glitch',
  'mevMike',
  'quietQ',
  'ledgerLou',
  'daoRen',
  'vbyKai',
] as const

export const STATEMENTS: Record<RoleType, readonly string[]> = {
  innocent: [
    'I was reconciling the multisig logs when it drained. Timestamps clear me.',
    'Ask the validator, we were both on the call until 2am.',
    "I don't even have signer access. Pull the permission set.",
    "My wallet's been cold all week. Check the chain.",
    'I just want my cut back. Catch whoever did this.',
    'I flagged the contract risk last sprint. Read the thread.',
  ],
  thief: [
    'It was the Technician. They had vault access all night.',
    "Why look at me? I'm the one who reported the drain.",
    "I'd never risk my reputation here. Not who I am.",
    "The timestamps are forged. Someone's framing me.",
    'I was asleep. Do I look like a thief to you?',
    "Follow the money, not my face. It doesn't lead here.",
  ],
  baiter: [
    "Don't pull my wallet history. Or do. Maybe I want you to.",
    "Arrest me. I dare you. My lawyer's on retainer.",
    'Sure, I was near the vault. Whatcha gonna do?',
    'Guilty until proven innocent, right? Take your shot.',
    'I love a good courtroom. Accuse me and find out.',
    'Cuff me, cop. The settlement buys a nice boat.',
  ],
}

/* Defense lines for the courtroom screen on a wrong bust. The accused is being
   paid, so the tone is smug, not pleading. No em dashes. */
export const DEFENSE: readonly string[] = [
  'No vault access, no motive, no case. Pay up.',
  'You staked a bond on a hunch. The bond is mine now.',
  'Wrongful arrest. The chain backs me, the cop does not.',
  'I told you to take your shot. You missed. Settle.',
  'Cuffs off, check signed. Better luck next case, officer.',
]

export const LAWYER_DEFENSE: readonly string[] = [
  'My counsel was on retainer before you reached for the cuffs. Damages, enhanced.',
  'You arrested a Lawyer. The settlement just doubled. Read it and weep.',
  'Procedure, precedent, payout. I wrote the brief last night. Pay the boosted figure.',
]

/* Privacy preserving "tells": derived from the noisy read, NOT the true role,
   so a probe never leaks the answer. Buckets by read strength. */
export const TELLS = {
  high: ['elevated deflection', 'story keeps shifting', 'spikes under pressure'],
  mid: ['some hesitation', 'inconsistent timeline', 'guarded answers'],
  low: ['alibi holds', 'reads steady', 'cooperative, low stress'],
} as const
