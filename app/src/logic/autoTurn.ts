// A monster's turn played by the computer (the GM's "Auto turn" button): it
// picks the nearest hero, walks into reach if it can, then attacks with a skill
// (half the time, when one reaches), a heavy attack or a light one. Same choices
// as the live page.
import { approvedIds } from './characters'
import { gap, type Placed } from './combat'
import type { Sheet } from './sheet'
import { enemyReach, occupant, onMap, type Grid } from './table'
import type { Enemy } from './types'

export type AutoTurn =
  | { kind: 'stunned' }
  | { kind: 'nobody' }
  | {
      kind: 'act'
      target: string
      targetName: string
      /** Where it walks first (when it moves). */
      move: { mx: number; my: number } | null
      /** The attack, when the target is in reach after moving. */
      attack: { k: string; i?: string } | null
    }

export function autoTurn(id: string, chars: Record<string, Sheet>, enemies: Record<string, Enemy>, g: Grid, rand: () => number): AutoTurn {
  const e = enemies[id]!
  if (e.stun) return { kind: 'stunned' }
  const A: Placed = { e: true, o: e }
  const z = e.sz || 1
  const rng = Math.max(1, Number(e.er) || 1)
  const tg = approvedIds(chars)
    .map((i) => ({ e: false, id: i, key: `c:${i}`, o: chars[i]! }))
    .filter((t) => (t.o.hp as number) > 0 && t.o.mx != null && onMap(t.o, g.id) && onMap(e, g.id) && !t.o.mt)
  if (!tg.length) return { kind: 'nobody' }
  const t = tg.reduce((a, b) => (gap(A, a) <= gap(A, b) ? a : b))
  let pos = { mx: e.mx as number, my: e.my as number }
  let move: { mx: number; my: number } | null = null
  if (gap(A, t) > rng) {
    const d = enemyReach(e, g)
    const free = (a: number, b: number) => {
      for (let i = 0; i < z; i++)
        for (let j = 0; j < z; j++) {
          const o = occupant(chars, enemies, g.id, a + i, b + j)
          if (o && o !== `e:${id}`) return false
        }
      return true
    }
    const tx = t.o.mx as number
    const ty = t.o.my as number
    let best: { a: number; b: number; sc: number } | null = null
    for (const k of Object.keys(d)) {
      const [a, b] = k.split(',').map(Number) as [number, number]
      if (!free(a, b)) continue
      const q = Math.max(1, tx - (a + z - 1), a - tx, ty - (b + z - 1), b - ty)
      const inR = q <= rng
      const sc = (inR ? (rng > 1 ? -q : 0) : 1000 + q * 10) + d[k]! * 0.01
      if (!best || sc < best.sc) best = { a, b, sc }
    }
    if (best && (best.a !== e.mx || best.b !== e.my)) pos = move = { mx: best.a, my: best.b }
  }
  const A2: Placed = { e: true, o: { ...e, ...pos } }
  if (gap(A2, t) > rng) return { kind: 'act', target: t.key, targetName: String(t.o.name), move, attack: null }
  const sk = Object.entries(e.sk || {}).filter(([, q]) => (q.t === 'a' ? tg.some((tt) => gap(A2, tt) <= Math.max(1, +q.r || 2)) : gap(A2, t) <= (+q.r || 1)))
  let attack: { k: string; i?: string } = { k: 'l' }
  if (sk.length && rand() < 0.5) attack = { k: 'sk', i: sk[Math.floor(rand() * sk.length)]![0] }
  else if (rand() < 0.3) attack = { k: 'h' }
  return { kind: 'act', target: t.key, targetName: String(t.o.name), move, attack }
}
