// The ability board screens: the 9-class board, the GM's editor, players equipping
// and attuning, the reference table, and drawn icons. Same rules as the live page's
// vocBoard, boardHtml, refHtml, the learn/forget/attune buttons and autoIc.
import { CLASS_COLORS, GLYPH_RULES } from '../data/abilityIcons'
import { CHARGED, VOCATION_ROWS } from '../data/vocationBoard'
import { attunedSet, defaultBoard, equippedIds, slotsOf, type Board, type BoardEntry } from './board'
import { slug } from './text'
import type { Character } from './types'

/** The 9-class board: the old classes' level 1 abilities, then levels 1 to 10 with Golden versions. */
export function vocationBoard(): Board {
  const b: Board = {}
  const keep = ['fighter', 'archer', 'mage', 'thief']
  for (const [k, e] of Object.entries(defaultBoard())) if (keep.includes(e.v as string) && e.l === 1) b[k] = e
  for (const [v, n, l, c, k, d, r, a, bb, t, ic, g, hc, tg] of VOCATION_ROWS) {
    const key = `${v}_${slug(n)}`
    b[key] = { n, c, l, v, k, d, r, a, b: bb, t, ic }
    if (g)
      b[`${key}_g`] = {
        n: `${n} (Golden)`,
        c: Math.ceil(c * 3) / 2,
        l,
        v,
        k,
        d: k === 'atk' ? g : '',
        r,
        a,
        b: bb,
        t: `Golden form of ${n}. Needs ${n} equipped. ${tg || t} Costs ${hc}% of your max HP (never below 1).`,
        ic: '✨',
        hc,
        gb: key,
      }
  }
  for (const k of Object.keys(b)) if (CHARGED.some((n) => b[k]!.n === n || b[k]!.n === `${n} (Golden)`)) b[k]!.ch = 1
  return b
}

/** Board key by ability name (a later ability with the same name wins, like the page). */
export function keyByName(board: Board): Record<string, string> {
  const o: Record<string, string> = {}
  for (const [k, e] of Object.entries(board)) if (e && e.n) o[e.n] = k
  return o
}

/** The drawn icon for an ability: its shape, colour, and a gold frame for Golden ones. */
export function glyphOf(board: Board, key: string): { glyph: string; color: string; golden: boolean } {
  const e = board[key]!
  const base = e.gb && board[e.gb] ? board[e.gb]!.n : e.n
  let glyph = ''
  for (const [r, x] of GLYPH_RULES)
    if (r.test(base)) {
      glyph = x
      break
    }
  if (!glyph) glyph = e.k === 'heal' ? 'heal' : e.k === 'atk' ? 'slash' : 'star'
  const cl = String(e.v || 'any')
  const color = CLASS_COLORS[cl] || CLASS_COLORS[Object.keys(CLASS_COLORS).find((x) => cl.indexOf(x) >= 0) || ''] || '#c9b27a'
  return { glyph, color, golden: !!e.gb }
}

/** Slots in use: attuned Golden abilities whose base is equipped take none. */
export function usedSlots(c: Character & { at?: unknown; atn?: unknown }, equipped: Set<string>, board: Board): number {
  const a = new Set(attunedSet(c, board))
  return [...equipped].filter((k) => !(a.has(k) && board[k] && board[k].gb && equipped.has(board[k].gb!))).length
}

/** What a player may pick from: their class (and "any"), unlocked unless the GM shows all, no hidden Golden ones. */
export function availableAbilities(c: Character, board: Board, showAll: boolean, hideGolden: boolean): string[] {
  return Object.keys(board)
    .filter((k) => {
      const e = board[k]!
      return (e.v === 'any' || e.v === c.cls) && (showAll || (e.l || 1) <= (c.level || 1)) && !(hideGolden && e.gb)
    })
    .sort((a, b) => (board[a]!.l || 1) - (board[b]!.l || 1))
}

export type EquipResult = { patch: Record<string, unknown>; msg: string } | { error: string } | null

export const NOT_HERE = 'You can only change abilities next to an altar, a bonfire or at a guild.'
export const NOT_HERE_ATTUNE = 'You can only attune next to an altar, a bonfire or at a guild.'

/**
 * Equip ("learn") or unequip an ability. Players must be at an altar, bonfire or guild.
 * Unequipping an ability also unequips its Golden version. Null when nothing changes.
 */
export function equipChange(c: Character & { eq?: unknown; at?: unknown; atn?: unknown }, board: Board, key: string, learn: boolean, here: boolean, dm: boolean, hideGolden: boolean): EquipResult {
  if (learn && board[key] && (board[key].l || 1) > (c.level || 1)) return null
  if (!dm && !here) return { error: NOT_HERE }
  const cur = new Set(equippedIds(c, board, hideGolden))
  if (learn) {
    const gb = board[key] && board[key].gb
    if (gb && board[gb] && !cur.has(gb)) return { error: `Equip ${board[gb].n} first.` }
    cur.add(key)
    if (usedSlots(c, cur, board) > slotsOf(c)) return null
  } else {
    cur.delete(key)
    for (const k of [...cur]) if (board[k] && board[k].gb === key) cur.delete(k)
  }
  const eq: Record<string, true> = { _: true }
  for (const k of cur) eq[k] = true
  return { patch: { eq }, msg: `${learn ? 'Equipped ' : 'Unequipped '}${board[key] ? board[key].n : 'an ability'}` }
}

/** Attune an equipped Golden ability so it stops using a slot. */
export function attuneChange(
  c: Character & { eq?: unknown; at?: Record<string, unknown> | null; atn?: unknown },
  board: Board,
  key: string,
  here: boolean,
  dm: boolean,
  hideGolden: boolean,
): EquipResult {
  if (!board[key] || !board[key].gb) return null
  if (!dm && !here) return { error: NOT_HERE_ATTUNE }
  const a0 = attunedSet(c, board)
  if (a0.length >= (Number(c.atn) || 0) || a0.includes(key) || !equippedIds(c, board, hideGolden).includes(key)) return null
  return { patch: { at: { ...(c.at || {}), [key]: 1 } }, msg: `Attuned to ${board[key].n}` }
}

/** One row of a player's board: what it says and which buttons it has. */
export function equipRow(c: Character & { eq?: unknown; at?: unknown; atn?: unknown }, board: Board, key: string, equipped: Set<string>, here: boolean) {
  const e = board[key]!
  const on = equipped.has(key)
  const at = attunedSet(c, board)
  const info = e.k === 'atk' ? `Damage ${e.d || ''}, range ${e.r || 1}${e.a ? ', auto-hit' : ''}` : e.k === 'heal' ? `Heals ${e.d || ''}` : e.k === 'check' ? 'd20 check' : ''
  const notes = [e.t || '', info, (e.l || 1) > (c.level || 1) ? `unlocks at level ${e.l}` : '', e.gb && board[e.gb] && !equipped.has(e.gb) && !on ? `needs ${board[e.gb].n} equipped` : '']
  const text =
    notes[0] +
    notes
      .slice(1)
      .map((x) => (x ? ` · ${x}` : ''))
      .join('')
  const attune: 'attuned' | 'button' | null = !e.gb || !on ? null : at.includes(key) ? 'attuned' : here && at.length < (Number(c.atn) || 0) ? 'button' : null
  const canToggle = here && (e.l || 1) <= (c.level || 1) && (on || ((at.includes(key) || usedSlots(c, equipped, board) < slotsOf(c)) && (!e.gb || equipped.has(e.gb))))
  return { on, text, attune, canToggle }
}

/** The GM's list order: by vocation, then level. */
export const editorOrder = (board: Board) => Object.keys(board).sort((a, b) => (board[a]!.v || '').localeCompare(board[b]!.v || '') || (board[a]!.l || 1) - (board[b]!.l || 1))

/** A typed or picked value in the GM's editor, as saved. Names are unique. */
export function boardFieldValue(board: Board, id: string, f: string, raw: string | boolean): string | number {
  let v: string | number = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw
  if (['c', 'l', 'r', 'hc'].includes(f)) v = Number(v) || 0
  if (f === 'n') {
    v = String(v).trim().slice(0, 30) || 'Ability'
    const name = v
    if (Object.keys(board).some((k) => k !== id && board[k]!.n === name)) v += ' 2'
  }
  return v
}

/** "Add ability" starts from this. */
export const NEW_ABILITY: BoardEntry = { n: 'New ability', c: 2, l: 1, v: 'any', k: 'atk', d: '2d6', r: 1, a: 0, b: '', t: '' }

/** One line of the reference table. golden is the Golden version's numbers, when shown. */
export type ReferenceRow = { key: string; level: number; name: string; cost: number; effect: string; golden: { name: string; dice: string; cost: number | string; hc: number | string } | null }

/** The reference table for a class: base abilities up to a level, with their Golden versions. */
export function referenceRows(board: Board, cls: string, maxLevel: number, hideGolden: boolean): ReferenceRow[] {
  return Object.keys(board)
    .filter((k) => {
      const e = board[k]!
      return !e.gb && (e.v === cls || e.v === 'any') && (e.l || 1) <= maxLevel
    })
    .sort((a, b) => (board[a]!.l || 1) - (board[b]!.l || 1) || (Number(board[a]!.c) || 0) - (Number(board[b]!.c) || 0))
    .map((k) => {
      const e = board[k]!
      const g = hideGolden ? undefined : Object.values(board).find((x) => x.gb === k)
      let effect = e.t || ''
      if (e.k === 'atk' && e.d && !(e.t || '').includes(e.d)) effect = `${e.d} damage. ${effect}`
      if (e.ch && !/charge/i.test(e.t || '')) effect += ' Takes a round to charge.'
      if (e.hc && !g) effect += ` Costs ${e.hc}% max HP.`
      return { key: k, level: e.l || 1, name: e.n, cost: Number(e.c) || 0, effect, golden: g ? { name: g.n, dice: g.d || '', cost: g.c as number, hc: g.hc || 10 } : null }
    })
}
