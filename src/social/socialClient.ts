/* Friends + presence client. Talks to the same worker as the lobby over HTTP.
   Env-gated through LOBBY_HTTP: with no worker configured these are no-ops and
   the social UI shows a "not configured" state. */
import { LOBBY_HTTP } from '../lobby/lobbyClient'

export const socialConfigured = !!LOBBY_HTTP

export interface Named { addr: string; name: string }
export interface FriendRec { friends: Named[]; incoming: Named[]; outgoing: string[] }

async function post<T>(path: string, body: object, fallback: T): Promise<T> {
  if (!LOBBY_HTTP) return fallback
  try {
    const res = await fetch(`${LOBBY_HTTP}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

export const listFriends = (address: string) =>
  post<FriendRec>('/friends/list', { address }, { friends: [], incoming: [], outgoing: [] })

export const requestFriend = (from: string, fromName: string, to: string) =>
  post<{ ok?: boolean }>('/friends/request', { from, fromName, to }, {})

export const respondFriend = (requester: string, responder: string, accept: boolean, responderName: string) =>
  post<{ ok?: boolean }>('/friends/respond', { requester, responder, accept, responderName }, {})

export const ping = (address: string, name: string) =>
  post<{ online: Named[] }>('/presence/ping', { address, name }, { online: [] })
