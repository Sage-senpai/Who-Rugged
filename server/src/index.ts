/* WHO RUGGED? edge server.
   Two Durable Objects:
   - LobbyRoom: turn-based lobby seats over a hibernatable WebSocket.
   - CaseSeal:  holds the sealed roles for a solo case server-side and drives
                the AI suspects through 0G Compute. Roles never reach the client
                until reveal, which is the privacy mechanic and the commit-first
                fairness story (v1 trusted resolver; the TEE replaces this DO).

   0G Compute uses the OpenAI-compatible direct API (OG_COMPUTE_API_URL +
   OG_COMPUTE_API_KEY), so it runs in the Worker with a plain fetch. */
import { DurableObject } from 'cloudflare:workers'

export interface Env {
  LOBBY_ROOM: DurableObjectNamespace<LobbyRoom>
  CASE_SEAL: DurableObjectNamespace<CaseSeal>
  DIRECTORY: DurableObjectNamespace<Directory>
  OG_COMPUTE_API_URL?: string
  OG_COMPUTE_API_KEY?: string
  OG_COMPUTE_MODEL_ID?: string
}

interface RoomInfo { code: string; hostName: string; players: number; max: number; hasSpace: boolean; updatedAt: number }
interface Named { addr: string; name: string }
interface FriendRec { friends: Named[]; incoming: Named[]; outgoing: string[] }
interface Presence { name: string; lastSeen: number }
const emptyFriendRec = (): FriendRec => ({ friends: [], incoming: [], outgoing: [] })
const ONLINE_MS = 60_000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

// ───────────────────────── lobby ─────────────────────────
const MAX_SEATS = 6
type SeatKind = 'empty' | 'human' | 'ai'
interface Seat { index: number; kind: SeatKind; address?: string; username?: string; ready: boolean }
interface RoomState { code: string; hostAddress: string | null; status: 'lobby' | 'started'; seats: Seat[] }
interface ClientMsg { type: 'join' | 'ready' | 'addAI' | 'removeAI' | 'leave' | 'start'; address?: string; username?: string; index?: number; ready?: boolean }

function emptyRoom(code: string): RoomState {
  return { code, hostAddress: null, status: 'lobby', seats: Array.from({ length: MAX_SEATS }, (_, index) => ({ index, kind: 'empty', ready: false })) }
}

export class LobbyRoom extends DurableObject<Env> {
  private room: RoomState
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.room = emptyRoom('')
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<RoomState>('room')
      if (saved) this.room = saved
    })
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 })
    const code = new URL(request.url).pathname.split('/').pop()?.toUpperCase() ?? ''
    if (!this.room.code && code) {
      this.room.code = code
      await this.persist()
    }
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server)
    server.send(JSON.stringify({ type: 'state', room: this.room }))
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return
    let msg: ClientMsg
    try {
      msg = JSON.parse(raw) as ClientMsg
    } catch {
      return
    }
    switch (msg.type) {
      case 'join': this.join(ws, msg.address, msg.username); break
      case 'ready': this.setReady(msg.address, !!msg.ready); break
      case 'addAI': this.addAI(); break
      case 'removeAI': this.removeAI(msg.index); break
      case 'leave': this.leave(msg.address); break
      case 'start': this.start(msg.address); break
      default: return
    }
    await this.persist()
    this.broadcast()
    await this.syncDirectory()
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as { address?: string } | null
    if (att?.address && this.room.status === 'lobby') {
      this.leave(att.address)
      await this.persist()
      this.broadcast()
      await this.syncDirectory()
    }
  }

  // announce the room to the public directory so people can browse and join it
  private async syncDirectory(): Promise<void> {
    const humans = this.room.seats.filter((s) => s.kind === 'human')
    const dir = this.env.DIRECTORY.getByName('global')
    if (this.room.status !== 'lobby' || humans.length === 0) {
      await dir.remove(this.room.code)
      return
    }
    const host = this.room.seats.find((s) => s.address === this.room.hostAddress)
    await dir.upsert({
      code: this.room.code,
      hostName: host?.username || 'Host',
      players: humans.length,
      max: MAX_SEATS,
      hasSpace: this.room.seats.some((s) => s.kind === 'empty'),
      updatedAt: Date.now(),
    })
  }

  private join(ws: WebSocket, address?: string, username?: string): void {
    if (!address) return
    let seat = this.room.seats.find((s) => s.address === address)
    if (!seat) seat = this.room.seats.find((s) => s.kind === 'empty')
    if (!seat) return
    seat.kind = 'human'
    seat.address = address
    seat.username = username ?? ''
    if (!this.room.hostAddress) this.room.hostAddress = address
    ws.serializeAttachment({ address })
  }
  private setReady(address: string | undefined, ready: boolean): void {
    const seat = this.room.seats.find((s) => s.address === address)
    if (seat) seat.ready = ready
  }
  private addAI(): void {
    const seat = this.room.seats.find((s) => s.kind === 'empty')
    if (seat) { seat.kind = 'ai'; seat.username = 'AI Agent'; seat.address = undefined; seat.ready = true }
  }
  private removeAI(index: number | undefined): void {
    if (index === undefined) return
    const seat = this.room.seats[index]
    if (seat?.kind === 'ai') { seat.kind = 'empty'; seat.username = undefined; seat.ready = false }
  }
  private leave(address: string | undefined): void {
    const seat = this.room.seats.find((s) => s.address === address)
    if (!seat) return
    seat.kind = 'empty'; seat.address = undefined; seat.username = undefined; seat.ready = false
    if (this.room.hostAddress === address) this.room.hostAddress = this.room.seats.find((s) => s.kind === 'human')?.address ?? null
  }
  private start(address: string | undefined): void {
    if (!address || address !== this.room.hostAddress) return
    for (const seat of this.room.seats) if (seat.kind === 'empty') { seat.kind = 'ai'; seat.username = 'AI Agent'; seat.ready = true }
    this.room.status = 'started'
  }
  private broadcast(): void {
    const payload = JSON.stringify({ type: 'state', room: this.room })
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload) } catch { /* gone */ }
    }
  }
  private async persist(): Promise<void> {
    await this.ctx.storage.put('room', this.room)
  }
}

// ───────────────────────── sealed case (0G Compute) ─────────────────────────
type Role = 'innocent' | 'thief' | 'baiter'
type Difficulty = 'rookie' | 'detective' | 'hardboiled'

const DIFF: Record<Difficulty, { probes: number; noise: number; thief: number; baiter: number; innocent: number; bondMul: number }> = {
  rookie: { probes: 3, noise: 5, thief: 66, baiter: 50, innocent: 24, bondMul: 0.8 },
  detective: { probes: 2, noise: 8, thief: 64, baiter: 58, innocent: 26, bondMul: 1 },
  hardboiled: { probes: 1, noise: 12, thief: 62, baiter: 62, innocent: 30, bondMul: 1.3 },
}
const PROFESSIONS = ['Doctor', 'Lawyer', 'Technician', 'DevRel', 'Community', 'Auditor', 'Validator']
const HANDLES = ['0xMaya', 'NodeRunner', 'priya.eth', 'Sasha_K', 'glitch', 'mevMike', 'quietQ', 'ledgerLou', 'daoRen', 'vbyKai']
const FALLBACK: Record<Role, string[]> = {
  innocent: ['My wallet has been cold all week. Check the chain.', 'I was reconciling the multisig when it drained. Timestamps clear me.'],
  thief: ["Why look at me? I reported the drain.", 'The timestamps are forged. Someone is framing me.'],
  baiter: ['Arrest me. I dare you. My lawyer is on retainer.', 'Guilty until proven innocent, right? Take your shot.'],
}

const rnd = () => Math.random()
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const shuffle = <T,>(a: T[]): T[] => a.map((v) => [rnd(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('')

function extractJSON(text: string): unknown {
  const fenced = text.replace(/```json|```/g, '')
  const start = fenced.search(/[[{]/)
  if (start < 0) return null
  const end = Math.max(fenced.lastIndexOf(']'), fenced.lastIndexOf('}'))
  if (end < start) return null
  try {
    return JSON.parse(fenced.slice(start, end + 1))
  } catch {
    return null
  }
}

interface SealedSuspect { id: string; handle: string; profession: string; role: Role; isThief: boolean; statement: string; attestation: string }
interface SealedCase { caseId: string; difficulty: Difficulty; pool: number; stolen: number; bond: number; probesAllowed: number; probesUsed: number; sealAttestation: string; suspects: SealedSuspect[] }

export class CaseSeal extends DurableObject<Env> {
  private c: SealedCase | null = null
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.c = (await ctx.storage.get<SealedCase>('case')) ?? null
    })
  }

  private async compute(messages: { role: string; content: string }[]): Promise<{ content: string; resKey: string; provider: string }> {
    const url = this.env.OG_COMPUTE_API_URL
    const key = this.env.OG_COMPUTE_API_KEY
    const model = this.env.OG_COMPUTE_MODEL_ID ?? 'qwen3.6-plus'
    if (!url || !key) throw new Error('compute-not-configured')
    const res = await fetch(`${url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: 400, temperature: 0.9 }),
    })
    if (!res.ok) throw new Error(`compute ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    return {
      content: data.choices[0]?.message?.content ?? '',
      resKey: res.headers.get('zg-res-key') ?? res.headers.get('ZG-Res-Key') ?? '0x' + hex(40),
      provider: res.headers.get('provider') ?? res.headers.get('Provider') ?? '0g-compute',
    }
  }

  async newCase(caseId: string, difficulty: Difficulty): Promise<Omit<SealedCase, 'suspects'> & { suspects: Omit<SealedSuspect, 'role' | 'isThief'>[] }> {
    const cfg = DIFF[difficulty]
    const jobs = shuffle([...PROFESSIONS]).slice(0, 5)
    const handles = shuffle([...HANDLES]).slice(0, 5)
    const thiefIdx = Math.floor(rnd() * 5)
    let baiterIdx: number
    do { baiterIdx = Math.floor(rnd() * 5) } while (baiterIdx === thiefIdx)

    const suspects: SealedSuspect[] = jobs.map((profession, i) => {
      const role: Role = i === thiefIdx ? 'thief' : i === baiterIdx ? 'baiter' : 'innocent'
      return { id: `${caseId}_${i}`, handle: handles[i], profession, role, isThief: i === thiefIdx, statement: pick(FALLBACK[role]), attestation: '0x' + hex(40) }
    })

    // one Compute call generates all five in-character lines from the sealed roles
    let sealAttestation = '0x' + hex(40)
    try {
      const roster = suspects.map((s) => ({ id: s.id, handle: s.handle, profession: s.profession, role: s.role }))
      const { content, resKey } = await this.compute([
        { role: 'system', content: 'You write terse, crypto-native dialogue for a social-deduction game. No emoji, no em dashes, no surrounding quotes.' },
        {
          role: 'user',
          content:
            'Five suspects sit at a table; a shared vault was drained overnight. Here are their secret roles:\n' +
            JSON.stringify(roster) +
            '\nFor each suspect write ONE opening line under 25 words. thief: lie, deflect, or accuse others, never confess. baiter: act guilty on purpose to provoke a wrongful arrest. innocent: give a plausible alibi. Return ONLY a JSON array of {"id","statement"}.',
        },
      ])
      const parsed = extractJSON(content) as { id: string; statement: string }[] | null
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          const s = suspects.find((x) => x.id === p.id)
          if (s && typeof p.statement === 'string' && p.statement.trim()) s.statement = p.statement.trim().replace(/^["']|["']$/g, '')
        }
      }
      sealAttestation = resKey
    } catch {
      // keep fallback statements; case still plays, just without live dialogue
    }

    this.c = {
      caseId,
      difficulty,
      pool: 900 + Math.floor(rnd() * 5) * 50,
      stolen: 250 + Math.floor(rnd() * 5) * 50,
      bond: Math.round((150 + Math.floor(rnd() * 3) * 50) * cfg.bondMul),
      probesAllowed: cfg.probes,
      probesUsed: 0,
      sealAttestation,
      suspects,
    }
    await this.ctx.storage.put('case', this.c)

    return {
      caseId,
      difficulty,
      pool: this.c.pool,
      stolen: this.c.stolen,
      bond: this.c.bond,
      probesAllowed: this.c.probesAllowed,
      probesUsed: 0,
      sealAttestation,
      suspects: suspects.map(({ id, handle, profession, statement, attestation }) => ({ id, handle, profession, statement, attestation })),
    }
  }

  async probe(suspectId: string): Promise<{ read: number; tell: string; attestation: string; probesUsed: number } | { error: string }> {
    if (!this.c) return { error: 'no-case' }
    if (this.c.probesUsed >= this.c.probesAllowed) return { error: 'no-probes' }
    const s = this.c.suspects.find((x) => x.id === suspectId)
    if (!s) return { error: 'unknown-suspect' }

    const cfg = DIFF[this.c.difficulty]
    const centre = s.role === 'thief' ? cfg.thief : s.role === 'baiter' ? cfg.baiter : cfg.innocent
    let read = clamp(Math.round(centre + (rnd() * 2 - 1) * cfg.noise), 5, 95)
    let tell = read >= 60 ? 'elevated deflection' : read >= 38 ? 'some hesitation' : 'alibi holds'
    let attestation = '0x' + hex(40)

    try {
      const { content, resKey } = await this.compute([
        { role: 'system', content: 'You are a privacy-preserving suspicion meter. Never name or reveal the role.' },
        {
          role: 'user',
          content:
            `Suspect ${s.handle} (${s.profession}) has the secret role "${s.role}". Output ONLY JSON {"score": <integer 0-100, noisy, not a dead giveaway>, "tell": "<3 to 5 word behavioral note that does not name the role>"}.`,
        },
      ])
      const parsed = extractJSON(content) as { score?: number; tell?: string } | null
      if (parsed && typeof parsed.score === 'number') read = clamp(Math.round(parsed.score), 5, 95)
      if (parsed && typeof parsed.tell === 'string' && parsed.tell.trim()) tell = parsed.tell.trim()
      attestation = resKey
    } catch {
      // fall back to the local noisy read
    }

    this.c.probesUsed += 1
    s.attestation = attestation
    await this.ctx.storage.put('case', this.c)
    return { read, tell, attestation, probesUsed: this.c.probesUsed }
  }

  async reveal(): Promise<{ reveal: { suspectId: string; isThief: boolean; attestation: string }[]; sealAttestation: string; roles: { id: string; role: Role; profession: string; handle: string; isThief: boolean }[] } | { error: string }> {
    if (!this.c) return { error: 'no-case' }
    return {
      reveal: this.c.suspects.map((s) => ({ suspectId: s.id, isThief: s.isThief, attestation: s.attestation })),
      sealAttestation: this.c.sealAttestation,
      roles: this.c.suspects.map((s) => ({ id: s.id, role: s.role, profession: s.profession, handle: s.handle, isThief: s.isThief })),
    }
  }
}

// ───────────────────────── room directory ─────────────────────────
export class Directory extends DurableObject<Env> {
  async upsert(info: RoomInfo): Promise<void> {
    const rooms = await this.rooms()
    rooms[info.code] = info
    await this.ctx.storage.put('rooms', rooms)
  }
  async remove(code: string): Promise<void> {
    const rooms = await this.rooms()
    if (rooms[code]) {
      delete rooms[code]
      await this.ctx.storage.put('rooms', rooms)
    }
  }
  async list(): Promise<RoomInfo[]> {
    const rooms = await this.rooms()
    const now = Date.now()
    return Object.values(rooms)
      .filter((r) => r.hasSpace && now - r.updatedAt < 600_000)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30)
  }
  private async rooms(): Promise<Record<string, RoomInfo>> {
    return (await this.ctx.storage.get<Record<string, RoomInfo>>('rooms')) ?? {}
  }

  // ── friends ──
  async friendRequest(from: string, fromName: string, to: string): Promise<void> {
    if (!from || !to || from === to) return
    const g = await this.graph()
    const t = (g[to] ??= emptyFriendRec())
    const s = (g[from] ??= emptyFriendRec())
    if (t.friends.some((x) => x.addr === from)) return // already friends
    if (!t.incoming.some((x) => x.addr === from)) t.incoming.push({ addr: from, name: fromName })
    if (!s.outgoing.includes(to)) s.outgoing.push(to)
    await this.ctx.storage.put('friends', g)
  }
  async friendRespond(requester: string, responder: string, accept: boolean, responderName: string): Promise<void> {
    const g = await this.graph()
    const me = (g[responder] ??= emptyFriendRec())
    const them = (g[requester] ??= emptyFriendRec())
    const reqEntry = me.incoming.find((x) => x.addr === requester)
    me.incoming = me.incoming.filter((x) => x.addr !== requester)
    them.outgoing = them.outgoing.filter((a) => a !== responder)
    if (accept && reqEntry) {
      if (!me.friends.some((x) => x.addr === requester)) me.friends.push({ addr: requester, name: reqEntry.name })
      if (!them.friends.some((x) => x.addr === responder)) them.friends.push({ addr: responder, name: responderName })
    }
    await this.ctx.storage.put('friends', g)
  }
  async friendList(address: string): Promise<FriendRec> {
    const g = await this.graph()
    return g[address] ?? emptyFriendRec()
  }
  private async graph(): Promise<Record<string, FriendRec>> {
    return (await this.ctx.storage.get<Record<string, FriendRec>>('friends')) ?? {}
  }

  // ── presence ──
  async ping(address: string, name: string): Promise<Named[]> {
    if (address) {
      const p = await this.presenceMap()
      p[address] = { name, lastSeen: Date.now() }
      await this.ctx.storage.put('presence', p)
    }
    return this.online()
  }
  async online(): Promise<Named[]> {
    const p = await this.presenceMap()
    const now = Date.now()
    return Object.entries(p)
      .filter(([, v]) => now - v.lastSeen < ONLINE_MS)
      .map(([addr, v]) => ({ addr, name: v.name }))
      .slice(0, 50)
  }
  private async presenceMap(): Promise<Record<string, Presence>> {
    return (await this.ctx.storage.get<Record<string, Presence>>('presence')) ?? {}
  }
}

// ───────────────────────── worker entry ─────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    // public room directory
    if (url.pathname === '/rooms' && request.method === 'GET') {
      return json(await env.DIRECTORY.getByName('global').list())
    }

    // friends + presence (single global social hub for v1)
    if ((url.pathname.startsWith('/friends/') || url.pathname.startsWith('/presence/')) && request.method === 'POST') {
      let b: { from?: string; fromName?: string; to?: string; requester?: string; responder?: string; responderName?: string; accept?: boolean; address?: string; name?: string }
      try {
        b = (await request.json()) as typeof b
      } catch {
        return json({ error: 'bad-json' }, 400)
      }
      const dir = env.DIRECTORY.getByName('global')
      switch (url.pathname) {
        case '/friends/request':
          await dir.friendRequest(b.from ?? '', b.fromName ?? '', b.to ?? '')
          return json({ ok: true })
        case '/friends/respond':
          await dir.friendRespond(b.requester ?? '', b.responder ?? '', !!b.accept, b.responderName ?? '')
          return json({ ok: true })
        case '/friends/list':
          return json(await dir.friendList(b.address ?? ''))
        case '/presence/ping':
          return json({ online: await dir.ping(b.address ?? '', b.name ?? '') })
        default:
          return json({ error: 'not-found' }, 404)
      }
    }

    // lobby websocket
    const room = url.pathname.match(/^\/room\/([A-Za-z0-9]{1,12})$/)
    if (room) return env.LOBBY_ROOM.getByName(room[1].toUpperCase()).fetch(request)

    // sealed case (0G Compute)
    if (url.pathname.startsWith('/case/') && request.method === 'POST') {
      let body: { caseId?: string; difficulty?: Difficulty; suspectId?: string }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return json({ error: 'bad-json' }, 400)
      }
      if (!body.caseId) return json({ error: 'missing-caseId' }, 400)
      const stub = env.CASE_SEAL.getByName(body.caseId)
      try {
        if (url.pathname === '/case/new') return json(await stub.newCase(body.caseId, body.difficulty ?? 'detective'))
        if (url.pathname === '/case/probe') return json(await stub.probe(body.suspectId ?? ''))
        if (url.pathname === '/case/resolve') return json(await stub.reveal())
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'compute-failed' }, 502)
      }
      return json({ error: 'not-found' }, 404)
    }

    return new Response('not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
