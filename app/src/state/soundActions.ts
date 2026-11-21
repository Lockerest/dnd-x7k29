// Saving the GM's sounds: clips for the sound slots, boss themes and ability
// sounds. Each is stored on its own path; clips and themes also stamp the table's
// meta (snd, thv) so every screen reloads them. Same paths and stamps as the live
// page. Each returns whether the save went through (the importers count them).
import type { Db } from '../db/client'
import type { GameState } from './store'

export type SoundActions = {
  /** A clip for a sound slot (data: URL). */
  saveClip: (slot: string, data: string, stamp?: boolean) => Promise<boolean>
  removeClip: (slot: string) => Promise<boolean>
  /** A boss theme: its key, the boss name and the audio. */
  saveTheme: (key: string, name: string, data: string, stamp?: boolean) => Promise<boolean>
  removeTheme: (key: string) => Promise<boolean>
  /** Bumps meta/snd or meta/thv once after an import of many. */
  stampSounds: (which: 'snd' | 'thv') => Promise<boolean>
  /** An ability sound by ability slug (no stamp: each is looked for when first heard). */
  saveAbilitySound: (slug: string, data: string) => Promise<boolean>
  removeAbilitySounds: () => Promise<boolean>
}

type Get = () => GameState

export function soundActions(get: Get, db: () => Db | null, now: () => number): SoundActions {
  const run = async (f: (d: Db) => Promise<unknown>) => {
    const d = db()
    if (!d || !get().dm) return false
    try {
      await f(d)
      return true
    } catch (e) {
      get().setError(e)
      return false
    }
  }
  const stamp = (d: Db, which: 'snd' | 'thv') => d.patch('meta', { [which]: now() })
  return {
    saveClip: (slot, data, st = true) =>
      run(async (d) => {
        await d.put(`sounds/${slot}`, { data })
        if (st) await stamp(d, 'snd')
      }),
    removeClip: (slot) =>
      run(async (d) => {
        const st = now()
        await d.del(`sounds/${slot}`)
        await d.patch('meta', { snd: st })
      }),
    saveTheme: (key, n, data, st = true) =>
      run(async (d) => {
        await d.put(`themes/${key}`, { n, data })
        if (st) await stamp(d, 'thv')
      }),
    removeTheme: (key) =>
      run(async (d) => {
        const st = now()
        await d.del(`themes/${key}`)
        await d.patch('meta', { thv: st })
      }),
    stampSounds: (which) => run((d) => stamp(d, which)),
    saveAbilitySound: (slug, data) => run((d) => d.put(`absnd/${slug}`, { data })),
    removeAbilitySounds: () => run((d) => d.del('absnd')),
  }
}
