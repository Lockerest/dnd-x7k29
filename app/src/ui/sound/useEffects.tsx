// Attack scenes, the Golden Wave and sound for the game screen: this device's
// settings, the GM's clips (loaded when they change), ability sounds (loaded the
// first time each is heard), and the scenes from every screen, one after another.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createAudioLoader, dataUrlBytes } from '../../audio/loader'
import type { Db } from '../../db/client'
import type { Board } from '../../logic/board'
import type { RollEntry } from '../../logic/dice'
import { abilitySlug } from '../../logic/text'
import type { GameStore } from '../../state/store'
import { SceneOverlay } from './Scene'
import { createSoundEngine, type FxEvent, type SoundEngine } from './engine'
import { loadFxSettings, saveFxSettings, type FxSettings } from './settings'
import { playWave, waveCenter } from './wave'

type Wave = { m?: string | null; x: number; y: number }

export type EffectsOptions = {
  store: GameStore
  db: Db | null
  storage: Pick<Storage, 'getItem' | 'setItem'>
  /** The GM's clip version (meta/snd): clips reload when it changes. */
  soundVersion: unknown
  board: Board
  abilityImages: Record<string, string>
  drawnIcons: boolean
  picture: (key: string) => string | null
  /** The map shown here and its columns, for where the wave starts. */
  shownMap: string | null
  cols: number
  /** The sound engine (one for this window by default). */
  engine?: SoundEngine
  /** The window to draw the wave on and listen for the first tap. */
  win?: Window
  /** At most this many scenes waiting behind the one playing (the live page's 4). */
  maxWaiting?: number
}

/** The settings, kept outside React so the sound engine can read them any time. */
function fxStore(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  let v = loadFxSettings(storage)
  const subs = new Set<() => void>()
  return {
    get: () => v,
    set: (p: Partial<FxSettings>) => {
      v = { ...v, ...p }
      saveFxSettings(storage, p)
      subs.forEach((f) => f())
    },
    subscribe: (f: () => void) => {
      subs.add(f)
      return () => void subs.delete(f)
    },
  }
}

const browserEngine = (settings: () => FxSettings) =>
  createSoundEngine({
    AudioContext: (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as (new () => AudioContext) | undefined,
    random: Math.random,
    settings: () => {
      const s = settings()
      return { on: s.sound, volume: s.volume, reverb: s.reverb }
    },
  })

export function useEffectsPlayer(o: EffectsOptions) {
  const { store, db, storage, soundVersion, maxWaiting = 4 } = o
  const win = o.win ?? window
  // This device's settings: read by the sound engine whenever a sound plays.
  const [settings] = useState(() => fxStore(storage))
  const fx = useSyncExternalStore(settings.subscribe, settings.get)
  const [engine] = useState(() => o.engine ?? browserEngine(settings.get))
  const opts = useRef(o)
  useEffect(() => {
    opts.current = o
  })

  // The GM's clips (raw), decoded once audio may play.
  const clips = useRef<Record<string, string>>({})
  const decodeClips = useCallback(async () => {
    for (const [k, data] of Object.entries(clips.current)) {
      if (engine.hasClip(k)) continue
      const b = await engine.decode(dataUrlBytes(data))
      if (b) engine.setClip(k, b)
    }
  }, [engine])
  useEffect(() => {
    if (!db || soundVersion == null) return
    db.get<Record<string, { data?: string }>>('sounds').then(
      (d) => {
        clips.current = Object.fromEntries(Object.entries(d || {}).flatMap(([k, v]) => (v?.data ? [[k, v.data]] : [])))
        engine.clearSlots()
        if (engine.live()) void decodeClips()
      },
      () => {}, // keep the old clips; the next change tries again
    )
  }, [db, soundVersion, engine, decodeClips])

  // Browsers only allow sound after a tap or key press.
  useEffect(() => {
    const go = () => {
      if (!settings.get().sound) return
      engine.unlock()
      void decodeClips()
    }
    const evs = ['pointerdown', 'keydown', 'touchend']
    evs.forEach((n) => win.document.addEventListener(n, go, { passive: true }))
    return () => evs.forEach((n) => win.document.removeEventListener(n, go))
  }, [engine, decodeClips, win, settings])

  // Ability sounds: each is looked for once, from the table's copy or the audio host.
  const loader = useMemo(() => (db ? createAudioLoader<AudioBuffer>(db, async (b) => (await engine.decode(b)) as AudioBuffer) : null), [db, engine])
  const tried = useRef(new Set<string>())
  const abilitySound = useCallback(
    (f: FxEvent): Promise<unknown> => {
      const k = abilitySlug(f.l)
      if (!loader || !k || k === 'test' || tried.current.has(k)) return Promise.resolve()
      tried.current.add(k)
      if (!engine.unlock()) return Promise.resolve()
      return Promise.race([loader.abilitySound(k).then((b) => b && engine.setClip(`ab:${k}`, b)), new Promise((r) => setTimeout(r, 700))])
    },
    [loader, engine],
  )

  // Scenes, one at a time.
  const [scenes, setScenes] = useState<{ id: number; f: FxEvent }[]>([])
  const nextId = useRef(0)
  const playScene = useCallback(
    (f: FxEvent) => {
      if (!settings.get().scenes || !f.a || !f.t) return
      setScenes((q) => (q.length - 1 < maxWaiting ? [...q, { id: ++nextId.current, f }] : q))
    },
    [maxWaiting, settings],
  )
  const current = scenes[0]
  useEffect(() => {
    if (!current) return
    void abilitySound(current.f).then(() => engine.sfx(current.f))
  }, [current, abilitySound, engine])

  const wave = useCallback(
    (w: Wave) => {
      engine.wave()
      const { shownMap, cols } = opts.current
      const el = win.document.querySelector('[aria-label^="Map:"]')
      const r = el ? el.getBoundingClientRect() : null
      playWave({
        doc: win.document,
        width: win.innerWidth,
        height: win.innerHeight,
        dpr: Math.min(2, win.devicePixelRatio || 1),
        center: waveCenter(w, shownMap, r, cols, win.innerWidth, win.innerHeight),
        random: Math.random,
        frame: (fn) => void win.requestAnimationFrame(fn),
        now: () => win.performance.now(),
        setTimeout: (fn, ms) => void win.setTimeout(fn, ms),
      })
    },
    [engine, win],
  )

  // The store plays my own scenes and waves here (and shares them).
  useEffect(() => {
    store.getState().setEffects({ scene: (f) => playScene(f as FxEvent), wave })
    return () => store.getState().setEffects(null)
  }, [store, playScene, wave])

  /** A new entry from another screen: its scene or wave plays here too (if recent). */
  const remote = useCallback(
    (e: RollEntry, me: string, now: number) => {
      if (e.by === me) return
      const age = now - (e.ts ?? 0)
      if (e.fx && age < 15000) playScene(e.fx as FxEvent)
      if (e.wave && age < 20000) wave(e.wave as Wave)
    },
    [playScene, wave],
  )

  const setFx = (p: Partial<FxSettings>) => {
    settings.set(p)
    if (p.sound) engine.unlock()
    if (p.volume != null) engine.volumeTest()
  }

  const scene = current && (
    <SceneOverlay
      key={current.id}
      scene={current.f}
      s25={fx.s25}
      board={o.board}
      abilityImages={o.abilityImages}
      drawnIcons={o.drawnIcons}
      picture={o.picture}
      onDone={() => setScenes((q) => q.slice(1))}
    />
  )

  return { fx, setFx, scene, remote, engine, cinematicSounds: engine.cinematic }
}
