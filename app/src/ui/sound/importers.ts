// The GM's sound imports: base attack sounds, boss themes and ability sounds from
// the audio host, and ability sound files picked on this device. Each is saved
// as it arrives, with a running status line, in the same order and with the same
// limits as the live page.
import { ABILITY_SOUNDS, BASE_SOUNDS, THEMES, themeUrl } from '../../data/audio'
import { abilityForFile, audioDataUrl, importStatus } from '../../logic/soundTools'
import type { SoundActions } from '../../state/soundActions'

type Got = { ok: boolean; status: number; blob: () => Promise<Blob> }

export type ImportDeps<B> = {
  fetch: (url: string) => Promise<Got>
  /** A blob as a data: URL. */
  dataUrl: (b: Blob) => Promise<string>
  /** Decodes a data: URL with this device's audio; null when there is no audio or it is not audio. */
  decode: (u: string) => Promise<B | null>
  /** True when this device can play audio right now. */
  audio: () => boolean
  actions: Pick<SoundActions, 'saveClip' | 'saveTheme' | 'saveAbilitySound' | 'stampSounds'>
  status: (text: string) => void
  /** Told about each clip, theme and ability sound that was saved. */
  onClip?: (slot: string, data: string, b: B) => void
  onTheme?: (key: string, name: string, data: string, b: B) => void
  onAbility?: (slug: string) => void
}

const download = async <B>(o: ImportDeps<B>, id: string) => {
  const r = await o.fetch(themeUrl(id))
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return audioDataUrl(await o.dataUrl(await r.blob()))
}

/** "Import base attack sounds from web": one clip per slot, then one stamp. */
export async function importBaseSounds<B>(o: ImportDeps<B>) {
  let ok = 0
  let bad = 0
  for (const [k, id] of Object.entries(BASE_SOUNDS)) {
    try {
      const u = await download(o, id)
      const b = await o.decode(u)
      if (!b) throw new Error('not audio')
      o.onClip?.(k, u, b)
      if (!(await o.actions.saveClip(k, u, false))) throw new Error('not saved')
      ok++
    } catch {
      bad++
    }
    o.status(importStatus(ok, bad))
  }
  await o.actions.stampSounds('snd')
  o.status(ok ? `${ok} imported` : 'Blocked by the browser. Use the Upload buttons.')
  return ok
}

/** "Import all boss themes from web": each tried twice, then one stamp. */
export async function importThemes<B>(o: ImportDeps<B>) {
  let ok = 0
  const bad: string[] = []
  for (const { key, name, id } of THEMES) {
    let why = ''
    let done = false
    for (let tr = 0; tr < 2 && !done; tr++) {
      try {
        const r = await o.fetch(themeUrl(id))
        if (!r.ok) {
          why = `HTTP ${r.status}`
          continue
        }
        const u = audioDataUrl(await o.dataUrl(await r.blob()))
        if (u.length > 5000000) {
          why = `too big (${Math.round(u.length / 1e5) / 10} MB)`
          break
        }
        const b = await o.decode(u)
        if (!b) throw new Error('not audio')
        if (!(await o.actions.saveTheme(key, name, u, false))) throw new Error('not saved')
        o.onTheme?.(key, name, u, b)
        done = true
      } catch (e) {
        why = String((e as Error)?.message || e).slice(0, 60)
      }
    }
    if (done) ok++
    else bad.push(`${name}: ${why}`)
    o.status(importStatus(ok, bad.length))
  }
  await o.actions.stampSounds('thv')
  o.status((ok ? `${ok} imported` : 'Nothing imported') + (bad.length ? `. Failed: ${bad.join('; ')}` : ''))
  return ok
}

/** Saves one ability sound (at most about 300 KB, and it must be audio). */
async function storeAbility<B>(o: ImportDeps<B>, slug: string, u: string) {
  if (!o.audio()) throw new Error('no audio')
  if (u.length > 300000) throw new Error('too big')
  if (!(await o.decode(u))) throw new Error('not audio')
  if (!(await o.actions.saveAbilitySound(slug, u))) throw new Error('not saved')
  o.onAbility?.(slug)
}

/** "Import from web" for ability sounds: four at a time; it gives up after six failures with none imported. */
export async function importAbilitySounds<B>(o: ImportDeps<B>) {
  const ents = Object.entries(ABILITY_SOUNDS)
  let ok = 0
  let bad = 0
  let i = 0
  const run = async () => {
    while (i < ents.length) {
      const [k, id] = ents[i++]!
      try {
        await storeAbility(o, k, await download(o, id))
        ok++
      } catch {
        bad++
        if (bad >= 6 && !ok) i = 1e9
      }
      o.status(importStatus(ok, bad))
    }
  }
  await Promise.all([run(), run(), run(), run()])
  o.status(ok ? importStatus(ok, bad) : 'Blocked by the browser. Use Import files instead.')
  return ok
}

/** "Import files" for ability sounds: each file matched by its id or ability name. */
export async function importAbilityFiles<B>(o: ImportDeps<B>, files: { name: string; blob: Blob }[]) {
  let ok = 0
  let bad = 0
  for (const f of files) {
    const key = abilityForFile(f.name)
    if (!key) {
      bad++
      continue
    }
    try {
      await storeAbility(o, key, await o.dataUrl(f.blob))
      ok++
    } catch {
      bad++
    }
    o.status(importStatus(ok, bad, 'unmatched/failed'))
  }
  o.status(importStatus(ok, bad, 'unmatched/failed'))
  return ok
}
