/* Community theme registry. One entry per token community.
   The default theme preserves the base WHO RUGGED? aesthetic.
   Add new entries as community partnerships are confirmed. */

export interface CommunityTheme {
  id: string
  name: string
  tokenSymbol: string

  /** 10 handles to shuffle as suspects. */
  handles: string[]
  /** 7 profession labels. */
  professions: string[]
  statements: {
    innocent: string[]
    thief: string[]
    baiter: string[]
  }

  /** CSS custom property overrides. Unset fields fall back to the base token. */
  colors: {
    sky?: string
    gold?: string
    alarm?: string
    lime?: string
    void?: string
    panel?: string
  }

  landingTagline: string
  verdictCurrency: string
  eyebrow: string
}

export const DEFAULT_THEME: CommunityTheme = {
  id: 'default',
  name: 'WHO RUGGED?',
  tokenSymbol: '$GG',
  handles: ['0xMaya', 'NodeRunner', 'priya.eth', 'Sasha_K', 'glitch', 'mevMike', 'quietQ', 'ledgerLou', 'daoRen', 'vbyKai'],
  professions: ['Doctor', 'Lawyer', 'Technician', 'DevRel', 'Community', 'Auditor', 'Validator'],
  statements: {
    innocent: ['My wallet has been cold all week. Check the chain.', 'I was reconciling the multisig when it drained.'],
    thief: ["Why look at me? I reported the drain.", 'The timestamps are forged. Someone is framing me.'],
    baiter: ['Arrest me. I dare you. My lawyer is on retainer.', 'Guilty until proven innocent, right? Take your shot.'],
  },
  colors: {},
  landingTagline: 'One of them drained the vault.',
  verdictCurrency: '$GG',
  eyebrow: '0G NETWORK // CASE FILE',
}

export const COMMUNITIES: Record<string, CommunityTheme> = {
  default: DEFAULT_THEME,
  // Add community skins here as partnerships close.
  // Example shape:
  // pepe: {
  //   id: 'pepe',
  //   name: '$PEPE Community',
  //   tokenSymbol: '$PEPE',
  //   handles: ['PepeLord', 'RarePepe', ...],
  //   professions: ['Meme Artist', 'Liquidity Frog', ...],
  //   statements: { innocent: [...], thief: [...], baiter: [...] },
  //   colors: { sky: '#00c844', alarm: '#ff4500' },
  //   landingTagline: 'One frog drained the lily pad.',
  //   verdictCurrency: '$PEPE',
  //   eyebrow: '0G PEPE CUP // FROG SEASON',
  // },
}
