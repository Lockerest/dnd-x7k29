// How a change to a character or enemy is applied before it is saved: the same
// rules as the live page's upd() and updE().
import type { Character, Enemy } from '../logic/types'

export type CharacterWithLog = Character & { log?: string[] }

/**
 * A character change. Empty stamina exhausts (and stops climbing), leaving
 * exhaustion resets its countdown, and the message joins the last 10 log lines.
 * Returns what to save and the updated sheet.
 */
export function characterChange(c: CharacterWithLog, p: Record<string, unknown>, msg?: string): { patch: Record<string, unknown>; next: CharacterWithLog } {
  let q = p
  let m = msg
  if (q.exh === false) q = { ...q, exn: 0 }
  if (typeof q.st === 'number' && q.st <= 0 && !c.exh && q.exh !== true && q.exh !== false) {
    q = { ...q, st: 0, exh: true, mt: '', mon: null }
    m = (m ? m + ' - ' : '') + 'stamina empty: EXHAUSTED'
  }
  const log = (c.log || []).slice(-9)
  if (m) log.push(m)
  const patch = { ...q, log }
  return { patch, next: { ...c, ...patch } as CharacterWithLog }
}

/**
 * An enemy change. The first time an enemy is placed its home spot (hx, hy, hm)
 * is remembered, and heroes climbing it move with it.
 */
export function enemyChange(
  e0: Enemy | undefined,
  p: Record<string, unknown>,
  chars: Record<string, Character>,
  id: string,
  liveMapId: () => string | null | undefined,
): { patch: Record<string, unknown>; next: Enemy; riders: Record<string, { mx: unknown; my: unknown }> } {
  let q = p
  if (e0 && q.mx != null && e0.hx == null && q.hx == null) q = { ...q, hx: q.mx, hy: q.my, hm: q.mp || e0.mp || liveMapId() }
  const riders: Record<string, { mx: unknown; my: unknown }> = {}
  if (q.mx != null) for (const [i, c] of Object.entries(chars)) if (c.mon === id && c.mt) riders[i] = { mx: q.mx, my: q.my }
  return { patch: q, next: { ...(e0 || {}), ...q } as Enemy, riders }
}
