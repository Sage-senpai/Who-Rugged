/* Thin client for the lobby Durable Object. Env-gated: with no VITE_LOBBY_URL
   the lobby screen shows a "not configured" state and nothing here runs, so the
   app builds and ships without the server. */

export type SeatKind = 'empty' | 'human' | 'ai'
export interface Seat {
  index: number
  kind: SeatKind
  address?: string
  username?: string
  ready: boolean
}
export interface Room {
  code: string
  hostAddress: string | null
  status: 'lobby' | 'started'
  seats: Seat[]
}

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

const RAW = import.meta.env.VITE_LOBBY_URL as string | undefined
export const LOBBY_URL = RAW ? RAW.replace(/\/$/, '') : undefined
export const lobbyConfigured = !!LOBBY_URL

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function randomCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export class LobbyClient {
  private ws?: WebSocket
  constructor(
    private code: string,
    private onState: (r: Room) => void,
    private onStatus: (s: ConnStatus) => void,
  ) {}

  connect(): void {
    if (!LOBBY_URL) return
    this.onStatus('connecting')
    const ws = new WebSocket(`${LOBBY_URL}/room/${this.code}`)
    this.ws = ws
    ws.onopen = () => this.onStatus('open')
    ws.onclose = () => this.onStatus('closed')
    ws.onerror = () => this.onStatus('error')
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data as string)
        if (m.type === 'state') this.onState(m.room as Room)
      } catch {
        /* ignore malformed */
      }
    }
  }

  private send(o: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(o))
  }

  join(address: string, username: string): void {
    this.send({ type: 'join', address, username })
  }
  setReady(address: string, ready: boolean): void {
    this.send({ type: 'ready', address, ready })
  }
  addAI(): void {
    this.send({ type: 'addAI' })
  }
  removeAI(index: number): void {
    this.send({ type: 'removeAI', index })
  }
  start(address: string): void {
    this.send({ type: 'start', address })
  }
  leave(address: string): void {
    this.send({ type: 'leave', address })
  }
  close(): void {
    this.ws?.close()
    this.ws = undefined
  }
}
