// The pure parts of the GM's test lab and sound tools: who can be picked in the
// lab, the scene a test button plays, the Boss themes rows, and how an imported
// ability sound file is matched to its ability. Same as the live page.
import { ABILITY_SOUNDS, BOSS_NAMES } from '../data/audio'
import type { Board } from './board'
import { effectKind, isHeavy } from './combat'
import type { Sheet } from './sheet'
import type { Enemy } from './types'

/** The lab's Generic box: [kind, label]. */
export const TEST_KINDS: [string, string][] = [
  ['slash', 'Slash'],
  ['heavy', 'Double slash (heavy)'],
  ['bash', 'Shield bash'],
  ['fire', 'Fireball'],
  ['ice', 'Frost'],
  ['bolt', 'Lightning'],
  ['arrow', 'Arrow'],
  ['poison', 'Poison'],
]

/** The lab's outcome buttons: [outcome, label]. */
export const TEST_OUTCOMES: [string, string][] = [
  ['hit', 'Hit'],
  ['crit', 'Critical hit'],
  ['miss', 'Miss'],
  ['dodge', 'Dodge'],
  ['parry', 'Parry'],
]

export type TestPick = { a: string; t: string; ab: string; k: string }
export const defaultTestPick = (): TestPick => ({ a: 't:Test Hero', t: 't:Test Dummy', ab: '', k: 'slash' })

/** Attacker and Target choices: the two dummies, then the heroes and the monsters. */
export function testOptions(chars: Record<string, Sheet>, enemies: Record<string, Enemy>): [string, string][] {
  return [
    ['t:Test Hero', 'Test Hero (dummy)'],
    ['t:Test Dummy', 'Test Dummy (dummy)'],
    ...Object.keys(chars).map((i): [string, string] => [`c:${i}`, `${chars[i]!.name} (player)`]),
    ...Object.keys(enemies).map((i): [string, string] => [`e:${i}`, `${enemies[i]!.name} (enemy)`]),
  ]
}

/** The Ability choices: the board's attacks, by name. */
export function testAbilities(board: Board): [string, string][] {
  return Object.entries(board)
    .filter(([, e]) => e && e.k === 'atk')
    .sort((a, b) => String(a[1].n).localeCompare(String(b[1].n)))
    .map(([k, e]) => [k, String(e.n)])
}

/** The scene a lab button plays (only on this screen). */
export function testScene(outcome: string, p: TestPick, chars: Record<string, Sheet>, enemies: Record<string, Enemy>, board: Board) {
  const crit = outcome === 'crit'
  const ob = (k: string) => (k[0] === 'c' ? chars[k.slice(2)] : k[0] === 'e' ? enemies[k.slice(2)] : null) ?? null
  const nm = (k: string) => (k.startsWith('t:') ? k.slice(2) : String(ob(k)?.name || '?'))
  const ab = p.ab ? board[p.ab] : undefined
  return {
    a: p.a,
    t: p.t,
    k: ab ? effectKind(ab.n, isHeavy(ob(p.a)), ab.r as number) : p.k,
    o: crit ? 'hit' : outcome,
    d: crit ? 240 : 120,
    c: crit,
    an: nm(p.a),
    tn: nm(p.t),
    l: ab ? String(ab.n) : 'Test',
    ha: isHeavy(ob(p.t)),
  }
}

/** A boss name as a theme key ("Nameless King" → "namelessking"). */
export const themeSlug = (n: unknown) =>
  String(n || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** The Boss themes rows: the main bosses, then any other theme the GM added. */
export function themeRows(loaded: Record<string, string>): [string, string][] {
  const rows: [string, string][] = BOSS_NAMES.map((n) => [themeSlug(n), n])
  for (const k of Object.keys(loaded)) if (!rows.some((r) => r[0] === k)) rows.push([k, loaded[k] || k])
  return rows
}

/** The ability an imported file is for: by its id, else by a name inside it. */
export function abilityForFile(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase()
  const sl = base.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const keys = Object.keys(ABILITY_SOUNDS)
  return keys.find((k) => k === sl) ?? keys.find((k) => base.includes(ABILITY_SOUNDS[k]!)) ?? null
}

/** Downloads come back as data: URLs; some hosts give no audio type, so it is set. */
export const audioDataUrl = (u: string) => (u.startsWith('data:audio') ? u : `data:audio/mpeg;base64,${u.split(',')[1]}`)

/** "3 imported, 1 failed" style status. */
export const importStatus = (ok: number, bad: number, what = 'failed') => `${ok} imported${bad ? `, ${bad} ${what}` : ''}`
