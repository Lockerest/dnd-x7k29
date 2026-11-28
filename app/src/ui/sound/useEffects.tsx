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
import { BossIntroOverlay } from './BossIntro'
import type { BossIntro } from '../../state/enemyExtras'
import { themeKeyFor } from '../../logic/audio'
import { rankOf } from '../../logic/enemies'
import { useStore } from 'zustand'
import { createSoundEngine, type FxEvent, type SoundEngine } from './engine'
import { loadFxSettings, saveFxSettings, type FxSettings } from './settings'
import { playWave, waveCenter } from './wave'
import { useSoundTools } from './useSoundTools'
import { createRegionPlayer, type Track } from './region'

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
  /** The GM's theme version (meta/thv): themes reload when it changes. */
  themeVersion?: unknown
  /** Boss art by enemy id (when loaded). */
  bossArt?: Record<string, string>
  /** Makes a region music track (an <audio> element by default). */
  track?: (url: string) => Track
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
      return { on: s.sound, volume: s.volume, reverb: s.reverb, music: s.music }
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

  // Region music (the GM's pick, this screen only): quieter than the battle music,
  // silent with sound off, and stepping aside while a boss theme plays.
  const [region] = useState(() =>
    createRegionPlayer({
      make: o.track ?? ((u) => new Audio(u)),
      volume: () => {
        const s = settings.get()
        return s.sound ? s.volume * 0.6 : 0
      },
      every: (f, ms) => win.setInterval(f, ms),
      stop: (h) => win.clearInterval(h as number),
    }),
  )
  const [regionKey, setRegionKey] = useState<string | null>(null)
  useEffect(() => () => region.select(null, false), [region])
  const setRegion = (k: string | null) => {
    engine.unlock()
    region.select(k, !!engine.bgId())
    setRegionKey(region.key())
  }

  // The GM's clips (raw), decoded once audio may play.
  const clips = useRef<Record<string, string>>({})
  const [slots, setSlots] = useState<string[]>([])
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
        setSlots(Object.keys(clips.current))
        engine.clearSlots()
        if (engine.live()) void decodeClips()
      },
      () => {}, // keep the old clips; the next change tries again
    )
  }, [db, soundVersion, engine, decodeClips])

  // Boss themes: downloaded and decoded ahead of time for the bosses on the table,
  // so their intro can start the battle music at once (and again when the GM changes them).
  const loader = useMemo(() => (db ? createAudioLoader<AudioBuffer>(db, async (b) => (await engine.decode(b)) as AudioBuffer) : null), [db, engine])
  const enemies = useStore(store, (s) => s.tables.enemies)
  const bossKey = Object.entries(enemies)
    .filter(([, e]) => e && ((e.hp as number) > 0 || e.th) && (['m', 'u'].includes(rankOf(e)) || e.th))
    .map(([, e]) => `${e.name}|${e.th ?? ''}`)
    .join('\n')
  const prefetch = useCallback(async () => {
    if (!loader || !engine.live() || !bossKey) return
    const keys = await loader.themeKeys()
    const want = [...new Set(bossKey.split('\n').map((l) => themeKeyFor(l.split('|')[0], l.split('|')[1], keys)))].filter((k): k is string => !!k)
    await loader.prefetch(want)
  }, [loader, engine, bossKey])
  useEffect(() => {
    if (o.themeVersion == null) return
    loader?.reset()
  }, [loader, o.themeVersion])
  useEffect(() => void prefetch(), [prefetch, o.themeVersion])

  // Browsers only allow sound after a tap or key press.
  useEffect(() => {
    const go = () => {
      if (!settings.get().sound) return
      engine.unlock()
      void decodeClips()
      void prefetch()
    }
    const evs = ['pointerdown', 'keydown', 'touchend']
    evs.forEach((n) => win.document.addEventListener(n, go, { passive: true }))
    return () => evs.forEach((n) => win.document.removeEventListener(n, go))
  }, [engine, decodeClips, win, settings, prefetch])

  // Ability sounds: each is looked for once, from the table's copy or the audio host.
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
    (f: FxEvent, force = false) => {
      if (!(settings.get().scenes || force) || !f.a || !f.t) return
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

  // Boss intros: the art and name, with the boss's theme starting the battle music
  // (or its opening played once when battle music is off), else the boss sting.
  const [boss, setBoss] = useState<{ n: number; b: BossIntro; seconds: number; image: string | null; art: boolean } | null>(null)
  const playBoss = useCallback(
    (b: BossIntro) => {
      if (!settings.get().scenes) return
      const ready = loader ? loader.ready() : new Map<string, AudioBuffer>()
      const key = themeKeyFor(b.n, b.th, [...ready.keys()])
      const buf = key ? ready.get(key)! : null
      const seconds = buf ? Math.min(5, Math.max(3, buf.duration)) : 3.7
      const id = String(b.k).slice(2)
      const art = opts.current.bossArt?.[id]
      setBoss((x) => ({ n: (x?.n ?? 0) + 1, b, seconds, image: art ?? opts.current.picture(b.k), art: !!art }))
      if (!(buf && engine.bgStart(buf, id)) && !(buf && engine.playTheme(buf, seconds))) engine.boss()
      region.sync(!!engine.bgId())
    },
    [loader, engine, settings, region],
  )

  // The battle music stops when its boss falls or leaves the map, or when sound stops;
  // the region music follows (back in once no boss theme plays).
  useEffect(() => {
    const h = win.setInterval(() => {
      const id = engine.bgId()
      region.sync(!!id)
      if (!id) return
      if (!engine.live()) return engine.bgStop(0.3)
      if (id === 'pv') return
      const e = store.getState().tables.enemies[id]
      if (!e || !((e.hp as number) > 0) || e.mx == null) engine.bgStop(2)
    }, 1000)
    return () => win.clearInterval(h)
  }, [engine, store, win, region])

  // The store plays my own scenes, waves and boss intros here (and shares them).
  useEffect(() => {
    store.getState().setEffects({ scene: (f) => playScene(f as FxEvent), wave, boss: playBoss })
    return () => store.getState().setEffects(null)
  }, [store, playScene, wave, playBoss])

  /** A new entry from another screen: its scene or wave plays here too (if recent). */
  const remote = useCallback(
    (e: RollEntry, me: string, now: number) => {
      if (e.by === me) return
      const age = now - (e.ts ?? 0)
      if (e.fx && age < 15000) playScene(e.fx as FxEvent)
      if (e.wave && age < 20000) wave(e.wave as Wave)
      if (e.boss && age < 15000) playBoss(e.boss as BossIntro)
    },
    [playScene, wave, playBoss],
  )

  const setFx = (p: Partial<FxSettings>) => {
    settings.set(p)
    if (p.sound) engine.unlock()
    if (p.volume != null) engine.volumeTest()
    if (p.music === false) engine.bgStop(0.8)
    if (p.reverb != null) engine.setReverb(p.reverb)
    region.sync(!!engine.bgId())
  }

  const tools = useSoundTools({
    store,
    db,
    engine,
    loader,
    clipsRef: clips,
    slots,
    setSlots,
    decodeClips,
    forgetAbility: (slug) => {
      loader?.forgetSound(slug)
      if (slug == null) tried.current.clear()
      else tried.current.delete(slug)
    },
  })
  /** The test lab: a scene or the Golden Wave, only on this screen (even with scenes off). */
  const lab = {
    scene: (f: FxEvent) => playScene(f, true),
    wave: () => {
      const { shownMap, cols } = opts.current
      const m = store.getState().tables.maps[shownMap ?? ''] as { w?: number; h?: number } | undefined
      const rows = m?.w && m.h ? Math.floor(m.h / (m.w / cols)) : 0
      wave({ m: shownMap, x: m ? cols / 2 : 0, y: rows / 2 })
    },
    /** The Reverb slider (this device). */
    reverb: (v: number) => setFx({ reverb: v }),
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

  /** The GM's "Play sound" on a monster skill: its ability sound, if there is one. */
  const playSkillSound = async (name: string) => {
    engine.unlock()
    void decodeClips()
    await abilitySound({ l: name })
    return engine.playClip(`ab:${abilitySlug(name)}`)
  }

  const bossIntro = boss && <BossIntroOverlay key={boss.n} b={boss.b} image={boss.image} art={boss.art} seconds={boss.seconds} onDone={() => setBoss(null)} />

  return { fx, setFx, scene, bossIntro, remote, engine, playSkillSound, cinematicSounds: engine.cinematic, tools, lab, regionKey, setRegion }
}
