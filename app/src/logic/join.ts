// Joining a table: the same checks and messages as the live page's join buttons.
import type { Session } from '../state/session'

export type JoinKind = 'player' | 'table' | 'gm'
export const PIN_RE = /^[A-Za-z0-9]{6,30}$/

export const JOIN_ERRORS = {
  pin: 'Table PIN: 6 or more letters/numbers only.',
  noTable: 'No table with that PIN. Ask your GM to open it first.',
  gmShort: 'GM PIN needs 4+ characters.',
  gmWrong: 'Wrong GM PIN.',
} as const

/** SHA-256 of the GM PIN as hex (only the hash is stored in the table). */
export async function gmPinHash(gmPin: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(gmPin))
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export type JoinPlan = { error: string } | { session: Session; createTable?: { dm: string } }

/**
 * Decides how a join goes. meta is the table's meta record (null if the table
 * does not exist yet); saved is this device's last session (so a player keeps
 * their character); newId makes a fresh player id.
 */
export async function planJoin(
  kind: JoinKind,
  rawPin: string,
  gmPin: string,
  meta: { dm?: string } | null,
  saved: Partial<Session>,
  newId: () => string,
): Promise<JoinPlan> {
  const pin = rawPin.trim()
  if (!PIN_RE.test(pin)) return { error: JOIN_ERRORS.pin }
  if (kind !== 'gm') {
    if (!meta) return { error: JOIN_ERRORS.noTable }
    const role = kind === 'table' ? 'table' : 'player'
    const me = role === 'table' ? '' : (saved.pin === pin && saved.me) || newId()
    return { session: { pin, role, me } }
  }
  if (gmPin.length < 4) return { error: JOIN_ERRORS.gmShort }
  const h = await gmPinHash(gmPin)
  if (!meta) return { session: { pin, role: 'gm', me: 'gm' }, createTable: { dm: h } }
  if (meta.dm !== h) return { error: JOIN_ERRORS.gmWrong }
  return { session: { pin, role: 'gm', me: 'gm' } }
}

/** A new player id, like the live page's ("p" + 8 random letters/digits). */
export const newPlayerId = (rand: () => number = Math.random) => 'p' + rand().toString(36).slice(2, 10)
