import { NEW_CLASSES } from '../../src/data/classes.ts'
// Since the cutover the app is where new content goes (bosses, skill sets, themes,
// ability sounds). The parity checks compare what the backup page already had:
// those entries must stay as they were, and new ones are left out of the comparison.

/** The entries of `mine` that the backup page also has. */
export const kept = <T>(mine: Record<string, T>, theirs: object): Record<string, T> => Object.fromEntries(Object.entries(mine).filter(([k]) => k in theirs))

/** The items of `mine` whose key the backup page also has, in the app's order. */
export const keptList = <T>(mine: T[], theirs: unknown[], key: (x: T) => unknown, theirKey: (x: never) => unknown = key as never) => {
  const have = new Set(theirs.map((x) => theirKey(x as never)))
  return mine.filter((x) => have.has(key(x)))
}

/**
 * Entries the GM chose to change since the cutover (they no longer match the backup):
 * - chain_pull: a new Chain Pull sound (a heavy throw, then a strong pull).
 * - Kernunos: phase 3 (rooted): also has all his phase 2 moves after the rooted ones.
 */
export const CHANGED = { abilitySounds: ['chain_pull'], skillSets: ['Kernunos: phase 3 (rooted)'] }

/** `theirs` without the given keys. */
export const without = <T>(theirs: Record<string, T>, keys: string[]): Record<string, T> => Object.fromEntries(Object.entries(theirs).filter(([k]) => !keys.includes(k)))

/** The class board as the backup page has it: without the classes added since (Hexblade, Duelist). */
export const oldClasses = <T extends { v?: unknown }>(b: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(b).filter(([, e]) => !NEW_CLASSES.includes(e.v as string)))

/**
 * Rule changed since the cutover (1.18.0): using an ability marks the hero (ua) so the
 * next turn regains no stamina. The backup page never wrote that flag; this drops it
 * from the app's writes so the rest of each write is still compared.
 */
export const noRestFlag = <T extends unknown[]>(writes: T[]): T[] =>
  writes.map((w) => w.map((x) => (x && typeof x === 'object' && !Array.isArray(x) && 'ua' in x ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'ua')) : x)) as T)
