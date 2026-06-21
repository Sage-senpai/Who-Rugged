/* WHO RUGGED? lobby server.
   One LobbyRoom Durable Object per room code coordinates seats over a
   hibernatable WebSocket. Turn-based, so we keep it small: room state is a
   single persisted JSON blob, mirrored in memory, written before every
   broadcast (persist first, cache second). AI seats backfill empty slots so a
   table can always start. The game-over-socket round sync is the next slice;
   this layer owns the room. */
import { DurableObject } from 'cloudflare:workers'

export interface Env {
  LOBBY_ROOM: DurableObjectNamespace<LobbyRoom>
}

const MAX_SEATS = 6

type SeatKind = 'empty' | 'human' | 'ai'
interface Seat {
  index: number
  kind: SeatKind
  address?: string
  username?: string
  ready: boolean
}
interface RoomState {
  code: string
  hostAddress: string | null
  status: 'lobby' | 'started'
  seats: Seat[]
}

interface ClientMsg {
  type: 'join' | 'ready' | 'addAI' | 'removeAI' | 'leave' | 'start'
  address?: string
  username?: string
  index?: number
  ready?: boolean
}

function emptyRoom(code: string): RoomState {
  return {
    code,
    hostAddress: null,
    status: 'lobby',
    seats: Array.from({ length: MAX_SEATS }, (_, index) => ({ index, kind: 'empty', ready: false })),
  }
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
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 })
    }
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
      case 'join':
        this.join(ws, msg.address, msg.username)
        break
      case 'ready':
        this.setReady(msg.address, !!msg.ready)
        break
      case 'addAI':
        this.addAI()
        break
      case 'removeAI':
        this.removeAI(msg.index)
        break
      case 'leave':
        this.leave(msg.address)
        break
      case 'start':
        this.start(msg.address)
        break
      default:
        return
    }
    await this.persist()
    this.broadcast()
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // free the seat on disconnect while still in the lobby so rooms do not jam
    const att = ws.deserializeAttachment() as { address?: string } | null
    if (att?.address && this.room.status === 'lobby') {
      this.leave(att.address)
      await this.persist()
      this.broadcast()
    }
  }

  private join(ws: WebSocket, address?: string, username?: string): void {
    if (!address) return
    let seat = this.room.seats.find((s) => s.address === address)
    if (!seat) seat = this.room.seats.find((s) => s.kind === 'empty')
    if (!seat) return // room full
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
    if (seat) {
      seat.kind = 'ai'
      seat.username = 'AI Agent'
      seat.address = undefined
      seat.ready = true
    }
  }

  private removeAI(index: number | undefined): void {
    if (index === undefined) return
    const seat = this.room.seats[index]
    if (seat?.kind === 'ai') {
      seat.kind = 'empty'
      seat.username = undefined
      seat.ready = false
    }
  }

  private leave(address: string | undefined): void {
    const seat = this.room.seats.find((s) => s.address === address)
    if (!seat) return
    seat.kind = 'empty'
    seat.address = undefined
    seat.username = undefined
    seat.ready = false
    if (this.room.hostAddress === address) {
      this.room.hostAddress = this.room.seats.find((s) => s.kind === 'human')?.address ?? null
    }
  }

  private start(address: string | undefined): void {
    if (!address || address !== this.room.hostAddress) return
    for (const seat of this.room.seats) {
      if (seat.kind === 'empty') {
        seat.kind = 'ai'
        seat.username = 'AI Agent'
        seat.ready = true
      }
    }
    this.room.status = 'started'
  }

  private broadcast(): void {
    const payload = JSON.stringify({ type: 'state', room: this.room })
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        /* socket gone, ignore */
      }
    }
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put('room', this.room)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/room\/([A-Za-z0-9]{1,12})$/)
    if (!match) return new Response('not found', { status: 404 })
    const code = match[1].toUpperCase()
    const stub = env.LOBBY_ROOM.getByName(code)
    return stub.fetch(request)
  },
} satisfies ExportedHandler<Env>
