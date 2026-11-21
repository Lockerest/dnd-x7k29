// "Import icons" on the ability board: many pictures at once, each matched by
// its file name to the abilities it is for. A name like "Frost Lance.png" (or
// "frost_lance.webp") matches every board ability and every monster skill of
// that name, its Golden version included.
import { CLASS_ICONS, GOLDEN_ICONS, SKILL_ICONS } from '../data/icons'
import type { Board } from './board'
import { abilitySlug } from './text'
import type { Enemy } from './types'

export type IconMatch = {
  /** Board keys that get this picture. */
  board: string[]
  /** The monster skill picture it sets (by skill name), if a monster has that skill. */
  skill: string | null
}

/** A file name without its extension, as an ability name slug. */
export const fileSlug = (fileName: string) => abilitySlug(fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))

export function matchIcon(fileName: string, board: Board, enemies: Record<string, Enemy>): IconMatch {
  const s = fileSlug(fileName)
  if (!s) return { board: [], skill: null }
  const keys = Object.keys(board).filter((k) => board[k] && (abilitySlug(board[k]!.n) === s || k === s))
  const skill = Object.values(enemies).some((e) => Object.values(e?.sk || {}).some((q) => abilitySlug(q?.n) === s)) ? s : null
  return { board: keys, skill }
}

/** The status line after an import. */
export function iconImportStatus(done: number, unmatched: string[], failed: string[]): string {
  const parts = [`${done} imported`]
  if (unmatched.length) parts.push(`no ability named ${unmatched.join(', ')}`)
  if (failed.length) parts.push(`couldn't read ${failed.join(', ')}`)
  return parts.join('; ')
}

/** One picture "Import icons from web" downloads, and where it is saved. */
export type WebIcon = { file: string; skill: string | null; board: string[] }

/** The picture for a board ability: its Golden picture for a Golden ability that has one, else its class picture. */
export function classIcon(name: unknown, golden: boolean, classes = CLASS_ICONS, goldens = GOLDEN_ICONS): string | undefined {
  const s = abilitySlug(name)
  return (golden && goldens[s]) || classes[s]
}

/** The built-in pictures: every boss skill icon, then each class icon for the board abilities of that name (Golden ones get their gold picture). */
export function webIcons(board: Board, skills = SKILL_ICONS, classes = CLASS_ICONS, goldens = GOLDEN_ICONS): WebIcon[] {
  const out: WebIcon[] = Object.entries(skills).map(([slug, file]) => ({ file, skill: slug, board: [] }))
  const by = new Map<string, string[]>()
  for (const k of Object.keys(board)) {
    const e = board[k]
    const f = e && classIcon(e.n, !!e.gb, classes, goldens)
    if (f) by.set(f, [...(by.get(f) ?? []), k])
  }
  for (const [file, keys] of by) out.push({ file, skill: null, board: keys })
  return out
}
