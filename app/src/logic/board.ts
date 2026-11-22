// The ability board (what each class can equip) and what a sheet's abilities are,
// as the live page works them out: defBoard, applyBoard, eqIds, ABS, parryMode.
import { COMMON_ABILITIES, DEFAULT_BOARD_EXTRAS, PARRY, type SheetAbility } from '../data/abilities'
import { CLASSES } from '../data/classes'
import { ABILITY_DAMAGE, ABILITY_HEAL } from '../data/rules'
import { slug } from './text'
import type { Character } from './types'

/**
 * One board ability. n name, c table cost, l minimum level, v vocation ("any" or a
 * class), k kind (atk, heal, util, check), d dice, r range, a auto-hit, b bonus,
 * t text, sd short text, ic icon, hc % of max HP it also costs, gb the ability a
 * Golden version needs, ch chained.
 */
export type BoardEntry = {
  n: string
  c?: number | string
  l?: number
  v?: string
  k?: string
  d?: string
  r?: number | string
  a?: number
  b?: string
  t?: string
  sd?: string
  ic?: string
  hc?: number | string
  gb?: string
  ch?: number
  [k: string]: unknown
}
export type Board = Record<string, BoardEntry>

/** The board a table uses before the GM saves one: three class abilities each, plus a few extras. */
export function defaultBoard(): Board {
  const b: Board = {}
  for (const [cls, v] of Object.entries(CLASSES))
    for (const a of v.abilities) {
      const n = a.name
      const e: BoardEntry = { n, c: a.cost, l: 1, v: cls, k: 'util', d: '', r: 0, a: 0, b: '', t: a.text }
      const dmg = ABILITY_DAMAGE[n]
      const heal = ABILITY_HEAL[n]
      if (dmg) Object.assign(e, { k: 'atk', d: dmg.dice, r: dmg.range, a: dmg.autoHit ? 1 : 0 })
      else if (heal) Object.assign(e, { k: 'heal', d: heal.dice, b: n === 'Second Wind' ? 'level' : 'int' })
      else if (n === 'Pilfer') Object.assign(e, { k: 'check', b: 'dex' })
      b[`${cls}_${slug(n)}`] = e
    }
  for (const [v, n, c, l, k, d, r, a, bb, t] of DEFAULT_BOARD_EXTRAS) b[`${v}_${slug(n)}`] = { n, c, l, v, k, d, r, a, b: bb, t }
  return b
}

/** The saved board, or the default one when the table has none. */
export const boardOrDefault = (b: Board | null | undefined): Board => (b && Object.keys(b).length ? b : defaultBoard())

/** What each ability name does, looked up by name (the live page's AD, HEAL, CHK and HC). */
export type BoardIndex = {
  attack: Record<string, { r: number; d: string; t: number }>
  heal: Record<string, { d: string; b: string }>
  check: Record<string, { b: string }>
  hpCost: Record<string, number>
}

export function boardIndex(board: Board): BoardIndex {
  const ix: BoardIndex = { attack: {}, heal: {}, check: {}, hpCost: {} }
  for (const e of Object.values(board)) {
    if (!e || !e.n) continue
    if (Number(e.hc) > 0) ix.hpCost[e.n] = Number(e.hc)
    if (e.k === 'atk') ix.attack[e.n] = { r: Number(e.r) || 1, d: e.d || '1d6', t: e.a ? 1 : 0 }
    else if (e.k === 'heal') ix.heal[e.n] = { d: e.d || '1d6', b: e.b || '' }
    else if (e.k === 'check') ix.check[e.n] = { b: e.b || 'dex' }
  }
  return ix
}

/** Words players don't see until the GM says so. "-" means none; missing means the default list. */
export const DEFAULT_SPOILERS = 'altar,altars,bonfire,bonfires,revive,revives,revived,revival,curse,cursed,golden,attune,attuned,attunement,attunements,crystal,crystals'

export function spoilerList(sp: string | null | undefined): string[] {
  const t = sp == null ? DEFAULT_SPOILERS : sp
  return t === '-'
    ? []
    : t
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
}

/** Golden abilities are hidden from players while "golden" is a spoiler. */
/** A text split into plain and hidden parts: each hidden word (whole words, any case) is its own part. */
export function spoilerParts(text: string, words: string[]): { t: string; hide: boolean }[] {
  if (!words.length || !text) return text ? [{ t: text, hide: false }] : []
  const re = new RegExp(
    `\\b(${[...words]
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})\\b`,
    'gi',
  )
  const out: { t: string; hide: boolean }[] = []
  let i = 0
  for (const m of text.matchAll(re)) {
    if (m.index > i) out.push({ t: text.slice(i, m.index), hide: false })
    out.push({ t: m[0], hide: true })
    i = m.index + m[0].length
  }
  if (i < text.length) out.push({ t: text.slice(i), hide: false })
  return out
}

export const goldenHidden = (dm: boolean, sp: string | null | undefined) => !dm && spoilerList(sp).includes('golden')

/** Ability slots: level + 2, at most 6. */
export const slotsOf = (c: Character) => Math.min(6, (c.level || 1) + 2)

/**
 * Equipped board keys: the chosen ones (eq), or else the first unlocked ones for
 * the class. A Golden version only counts with its base ability equipped.
 */
export function equippedIds(c: Character & { eq?: unknown }, board: Board, hideGolden: boolean): string[] {
  let L: string[]
  if (c.eq && typeof c.eq === 'object') L = Object.keys(c.eq).filter((k) => board[k])
  else
    L = Object.keys(board)
      .filter((k) => {
        const e = board[k]!
        return (e.v === 'any' || e.v === c.cls) && (e.l || 1) <= (c.level || 1)
      })
      .sort((a, b) => (board[a]!.l || 1) - (board[b]!.l || 1))
      .slice(0, slotsOf(c))
  const S = new Set(L)
  return L.filter((k) => (!board[k]!.gb || S.has(board[k]!.gb!)) && !(hideGolden && board[k]!.gb))
}

/** Golden abilities kept without their slot (attuned), up to the character's attunement count. */
export function attunedSet(c: Character & { at?: unknown; atn?: unknown }, board: Board): string[] {
  return Object.keys((c.at as object) || {})
    .filter((k) => board[k] && board[k].gb)
    .slice(0, Number(c.atn) || 0)
}

/** How a character may parry: "n" normal, "d" with disadvantage, "" not at all. */
export function parryMode(c: (Character & { pw?: string; shield?: unknown }) | null | undefined): '' | 'n' | 'd' {
  if (!c || c.pw === 'x') return ''
  if (c.shield) return 'n'
  if (c.pw === 'd') return 'd'
  if (c.pw === 'n') return 'n'
  return ['fighter', 'warrior', 'spearhand', 'thief', 'trickster'].includes(c.cls as string) ? 'n' : ''
}

/** The GM's parry setting, in the order the button cycles through. */
export const PARRY_SETTINGS = ['', 'n', 'd', 'x'] as const
export const PARRY_LABELS: Record<string, string> = { '': 'class default', n: 'normal', d: 'disadvantage', x: 'never' }

/** Everything on a sheet's ability list: Dodge Roll, Parry if allowed, then the equipped abilities. */
export function sheetAbilities(c: Character & { eq?: unknown; pw?: string; shield?: unknown }, board: Board, hideGolden: boolean): SheetAbility[] {
  const eq = equippedIds(c, board, hideGolden).map((k): SheetAbility => {
    const e = board[k]!
    return [e.n, Number(e.c) || 0, e.t || '', '']
  })
  return [...COMMON_ABILITIES, ...(parryMode(c) ? [PARRY] : []), ...eq]
}
