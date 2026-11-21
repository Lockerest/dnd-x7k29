// The GM's sound tools under the test lab: clips for the sound slots, ability
// sounds and boss themes (upload, play, remove, import from the web), with the
// same limits and messages as the live page. Everything saved is heard by every
// screen; plays here are only on this screen.
import { useCallback, useState } from 'react'
import { dataUrlBytes, type AudioLoader } from '../../audio/loader'
import type { Db } from '../../db/client'
import { themeSlug } from '../../logic/soundTools'
import type { GameStore } from '../../state/store'
import { readFile } from '../images'
import type { SoundEngine } from './engine'
import { importAbilityFiles, importAbilitySounds, importBaseSounds, importThemes, type ImportDeps } from './importers'

export type SoundTools = {
  /** Slots with the GM's own clip. */
  slots: string[]
  /** Themes saved for this table: key → boss name. */
  themes: Record<string, string>
  /** Status lines of the base sound, theme and ability sound imports. */
  status: { bs: string; th: string; ab: string }
  /** Reads which themes are saved (when the lab opens). */
  refresh: () => Promise<void>
  previewSlot: (k: string) => void
  uploadSlot: (k: string, f: File) => Promise<void>
  removeSlot: (k: string) => Promise<void>
  importBase: () => Promise<void>
  importAbilities: () => Promise<void>
  importAbilityFiles: (fs: File[]) => Promise<void>
  removeAbilities: () => Promise<void>
  previewTheme: (k: string) => Promise<void>
  uploadTheme: (k: string, n: string, f: File) => Promise<void>
  removeTheme: (k: string) => Promise<void>
  importThemes: () => Promise<void>
}

export type SoundToolDeps = {
  store: GameStore
  db: Db | null
  engine: SoundEngine
  loader: AudioLoader<AudioBuffer> | null
  /** The GM's clips as data: URLs (kept in step with what is saved). */
  clipsRef: { current: Record<string, string> }
  slots: string[]
  setSlots: (s: string[]) => void
  decodeClips: () => Promise<void>
  /** Ability sounds to look for again. */
  forgetAbility: (slug?: string) => void
  fetch?: (url: string) => Promise<Response>
  dataUrl?: (b: Blob) => Promise<string>
  confirm?: (q: string) => boolean
}

const TOO_BIG_CLIP = 'That clip is too big (max about 450 KB). Trim it or lower its quality first.'
const TOO_BIG_THEME = 'That theme is too big (max about 700 KB). Trim it to 10 seconds or lower its quality.'
const NO_AUDIO = "Audio isn't available in this browser."
const NOT_AUDIO = "That file couldn't be read as audio."

export function useSoundTools(o: SoundToolDeps): SoundTools {
  const { store, db, engine, loader, clipsRef, slots, setSlots, decodeClips, forgetAbility } = o
  const f = o.fetch ?? ((u: string) => fetch(u))
  const dataUrl = o.dataUrl ?? ((b: Blob) => readFile(b, 'dataUrl'))
  const ask = o.confirm ?? ((q: string) => window.confirm(q))
  const [themes, setThemes] = useState<Record<string, string>>({})
  const [status, setStatus] = useState({ bs: '', th: '', ab: '' })
  const say = (k: keyof typeof status) => (text: string) => setStatus((s) => ({ ...s, [k]: text }))
  const notice = (t: string) => store.getState().notice(t)
  const dm = () => store.getState().dm
  const decode = async (u: string) => (await engine.decode(dataUrlBytes(u))) as AudioBuffer | null
  const setClip = (k: string, data: string | null, b: AudioBuffer | null) => {
    if (data) clipsRef.current = { ...clipsRef.current, [k]: data }
    else delete clipsRef.current[k]
    engine.setClip(k, b)
    setSlots(Object.keys(clipsRef.current))
  }
  const deps = (k: keyof typeof status): ImportDeps<AudioBuffer> => ({
    fetch: f,
    dataUrl,
    decode,
    audio: () => !!engine.unlock(),
    actions: store.getState(),
    status: say(k),
    onClip: (s, u, b) => setClip(s, u, b),
    onTheme: (key, n, _u, b) => {
      loader?.setTheme(key, b)
      setThemes((t) => ({ ...t, [key]: n }))
    },
    onAbility: (slug) => {
      engine.setClip(`ab:${slug}`, null)
      forgetAbility(slug)
    },
  })
  // A file picked on this device: checked for size and read as audio.
  const readAudio = async (file: File, max: number, big: string) => {
    if (!dm()) return null
    if (file.size > max) return void notice(big)
    const u = await dataUrl(file)
    if (!engine.unlock()) return void notice(NO_AUDIO)
    const b = await decode(u)
    if (!b) return void notice(NOT_AUDIO)
    return { u, b }
  }

  const refresh = useCallback(async () => {
    if (!db) return
    const keys = await db.keys('themes').catch(() => [] as string[])
    const names = await Promise.all(keys.map((k) => db.get<string>(`themes/${k}/n`).catch(() => null)))
    setThemes(Object.fromEntries(keys.map((k, i) => [k, names[i] || k])))
  }, [db])

  return {
    slots,
    themes,
    status,
    refresh,
    previewSlot: (k) => {
      void decodeClips()
      engine.preview(k)
    },
    uploadSlot: async (k, file) => {
      const a = await readAudio(file, 450000, TOO_BIG_CLIP)
      if (!a || !(await store.getState().saveClip(k, a.u))) return
      setClip(k, a.u, a.b)
      engine.playClip(k)
    },
    removeSlot: async (k) => {
      setClip(k, null, null)
      await store.getState().removeClip(k)
    },
    importBase: async () => void (await importBaseSounds(deps('bs'))),
    importAbilities: async () => void (await importAbilitySounds(deps('ab'))),
    importAbilityFiles: async (fs) => {
      if (!dm() || !fs.length) return
      await importAbilityFiles(
        deps('ab'),
        fs.map((x) => ({ name: x.name, blob: x })),
      )
    },
    removeAbilities: async () => {
      if (!ask('Remove every imported ability sound?')) return
      if (!(await store.getState().removeAbilitySounds())) return
      engine.clearAbilities()
      forgetAbility()
      say('ab')('Removed.')
    },
    previewTheme: async (k) => {
      engine.unlock()
      if (engine.bgId() === 'pv') return engine.bgStop(0.5)
      const b = loader ? await loader.theme(k) : null
      if (b) engine.bgStart(b, 'pv', true)
    },
    uploadTheme: async (k, n, file) => {
      const a = await readAudio(file, 700000, TOO_BIG_THEME)
      if (!a || !(await store.getState().saveTheme(k, n, a.u))) return
      loader?.setTheme(k, a.b)
      setThemes((t) => ({ ...t, [k]: n }))
      engine.playTheme(a.b, Math.min(10, Math.max(4, a.b.duration)))
    },
    removeTheme: async (k) => {
      loader?.setTheme(k, null)
      setThemes((t) => Object.fromEntries(Object.entries(t).filter(([x]) => x !== k)))
      await store.getState().removeTheme(k)
    },
    importThemes: async () => void (await importThemes(deps('th'))),
  }
}

/** The theme key for "Add another boss theme" (null when the name is too short). */
export function newThemeFor(name: string | null): { k: string; n: string } | null {
  const n = (name || '').trim().slice(0, 40)
  return themeSlug(n).length < 3 ? null : { k: themeSlug(n), n }
}
