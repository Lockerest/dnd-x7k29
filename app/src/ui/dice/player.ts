// Shows rolls on screen, like the live page: real 3D dice from the dice library
// when it loads (up to four boxes, so several rolls can fly at once), tumbling
// CSS dice otherwise, then the result cards for two seconds.
import { DICE_LIB } from '../../data/dice'
import { libNotation, skinConfig, swatchOf, type Die } from '../../logic/dice'

type LibRoll = { sets?: { type: string; rolls: { value: number }[] }[] }
export type DiceBox = { initialize(): Promise<unknown>; updateConfig(c: object): Promise<unknown>; roll(n: string): Promise<LibRoll>; clearDice(): void }
export type DiceLib = new (selector: string, options: object) => DiceBox

export type DiceJob = {
  ds: number[]
  /** The results; my own d4s are filled in from where the 3D dice land. */
  res: Die[]
  m: number
  sk: string
  /** "Lyra rolls" above someone else's result. */
  who: string | null
  remote: boolean
  /** Runs once the dice land, before the result shows. */
  onLand?: () => void
}

export type DiceEnv = {
  doc: Document
  width: () => number
  height: () => number
  reducedMotion: () => boolean
  setTimeout: (f: () => void, ms: number) => number
  clearTimeout: (h: number) => void
  frame: (f: (t: number) => void) => void
  now: () => number
  random: () => number
  /** The library, once loaded. */
  lib: () => DiceLib | null
}

export type DicePlayer = {
  /** Shows a roll; resolves once it is gone. */
  play: (job: DiceJob) => Promise<void>
  /** Starts two dice boxes (call once the library has loaded). */
  init: () => void
  /** True when a 3D box is ready, so my d4s will be read from the dice. */
  physics: () => boolean
}

type Inst = { ready: boolean; busy: boolean; bad: boolean; el: HTMLElement; box?: DiceBox; rolling?: Promise<unknown> }

/**
 * At most this many rolls on screen or waiting. Rolls past that (someone hammering
 * the dice buttons) skip the show: their result is still saved and in the log.
 */
export const MAX_SHOWN = 4
/** Rolls with more physical dice than this (a d100 is two) tumble as CSS dice instead of 3D ones. */
export const MAX_3D_DICE = 12
const physicalDice = (ds: number[]) => ds.length + ds.filter((d) => d === 100).length
type Queued = { job: DiceJob; done: () => void }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function createDicePlayer(env: DiceEnv): DicePlayer {
  const { doc } = env
  const pool: Inst[] = []
  let libBad = false
  const queue: Queued[] = []
  let active = 0
  const lib = () => (libBad ? null : env.lib())
  const libReady = () => !!lib() && pool.some((x) => x.ready && !x.bad) && !env.reducedMotion()

  const newInst = () => {
    const L = lib()
    if (!L || pool.length >= 4) return
    const n = pool.length
    const el = doc.createElement('div')
    el.className = 'dicebox'
    el.id = `dicebox${n}`
    el.style.zIndex = String(48 + n)
    doc.body.appendChild(el)
    const inst: Inst = { ready: false, busy: false, bad: false, el }
    pool.push(inst)
    const bad = () => {
      inst.bad = true
      libBad = pool.every((x) => x.bad)
      pump()
    }
    try {
      const sc = Math.round(Math.max(80, Math.min(150, Math.min(env.width(), env.height()) / 3.6)))
      inst.box = new L(`#dicebox${n}`, {
        assetPath: `${DICE_LIB}public/`,
        sounds: false,
        shadows: true,
        baseScale: sc,
        gravity_multiplier: 1200,
        strength: 2,
        theme_colorset: 'white',
        theme_material: 'plastic',
        theme_surface: 'green-felt',
      })
      inst.box.initialize().then(() => {
        inst.ready = true
        pump()
      }, bad)
    } catch {
      bad()
    }
  }

  function pump() {
    while (queue.length) {
      if (!libReady()) {
        start(queue.shift()!, null)
        continue
      }
      if (physicalDice(queue[0]!.job.ds) > MAX_3D_DICE) {
        start(queue.shift()!, null)
        continue
      }
      const inst = pool.find((x) => x.ready && !x.busy && !x.bad)
      if (inst) {
        start(queue.shift()!, inst)
        continue
      }
      if (!pool.some((x) => !x.ready && !x.bad) && pool.length < 4) newInst()
      break
    }
  }

  const start = (q: Queued, inst: Inst | null) => {
    if (inst) inst.busy = true
    active++
    show(q.job, inst, () => {
      active--
      q.done()
      // A box still busy with a roll that ran late is used again only once it has finished.
      if (inst?.rolling) {
        // (Given up on after 20 more seconds, so a box that never answers is not lost for good.)
        void Promise.race([inst.rolling, new Promise((r) => env.setTimeout(() => r(null), 20000))]).then(free, free)
      } else if (inst) inst.busy = false
      pump()
      function free() {
        try {
          inst!.box!.clearDice()
        } catch {
          // The box may already be gone.
        }
        inst!.busy = false
        pump()
      }
    })
  }

  /** The tumbling CSS dice, for when the library is missing. */
  const cssRoll = (ov: HTMLElement, ds: number[], res: Die[], after: () => void) => {
    const W = env.width()
    const H = env.height()
    const S = 84
    const r = env.random
    const rnd = () => (r() < 0.5 ? -1 : 1) * (7 + r() * 8)
    const dice = ds.map((d) => {
      const el = doc.createElement('div')
      el.className = 'd3'
      el.innerHTML = [1, 2, 3, 4, 5, 6].map((f) => `<i class="f${f}">?</i>`).join('')
      ov.appendChild(el)
      return { el, d, x: r() * (W - S), y: r() * (H - S), vx: rnd(), vy: rnd(), rx: r() * 360, ry: r() * 360, rz: 0, wx: 6 + r() * 10, wy: 6 + r() * 10 }
    })
    const land = () => {
      dice.forEach((o, i) => {
        o.el.classList.add('land')
        o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
        o.el.querySelector('.f1')!.textContent = String(res[i]!.r)
      })
      env.setTimeout(after, 1000)
    }
    const t0 = env.now()
    let tl = 0
    const step = (t: number) => {
      if (t - t0 > 1500) return land()
      for (const o of dice) {
        o.x += o.vx
        o.y += o.vy
        if (o.x < 0 || o.x > W - S) o.vx = -o.vx
        if (o.y < 0 || o.y > H - S) o.vy = -o.vy
        o.x = Math.max(0, Math.min(W - S, o.x))
        o.y = Math.max(0, Math.min(H - S, o.y))
        o.rx += o.wx
        o.ry += o.wy
        o.rz += 3
        o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0) rotateX(${o.rx}deg) rotateY(${o.ry}deg) rotateZ(${o.rz}deg)`
      }
      if (t - tl > 90) {
        for (const o of dice) o.el.querySelectorAll('i').forEach((i) => (i.textContent = String(1 + Math.floor(r() * o.d))))
        tl = t
      }
      env.frame(step)
    }
    if (env.reducedMotion()) after()
    else env.frame(step)
  }

  const show = (job: DiceJob, inst: Inst | null, finish: () => void) => {
    const { ds, res, m, sk, who, remote, onLand } = job
    const ov = doc.createElement('div')
    ov.className = `dov sk-${sk}`
    ov.dataset.sk = sk
    if (swatchOf(sk).startsWith('#')) ov.style.setProperty('--tile', swatchOf(sk))
    doc.body.appendChild(ov)
    let shown = false
    // Runs once, two seconds after the result shows.
    const end = () => {
      env.clearTimeout(guard)
      try {
        inst?.box!.clearDice()
      } catch {
        // The box may already be gone.
      }
      ov.remove()
      finish()
    }
    const reveal = () => {
      shown = true
      const sum = res.reduce((a, b) => a + b.r, 0)
      const off = [0, 170, -170, 340][doc.querySelectorAll('.dres').length] || 0
      const parts = res.map((x) => x.r).join(' + ')
      const tail = m ? (m > 0 ? ` + ${m}` : ` - ${Math.abs(m)}`) : ''
      ov.innerHTML =
        `<div class="dres" style="top:calc(50% + ${off}px)">${who ? `<div class="dw">${esc(who)} rolls</div>` : ''}` +
        `<div class="dl">${res.map((x) => `<div class="dc"><small>d${x.d}</small>${x.r}</div>`).join('')}</div>` +
        `${m || res.length > 1 ? `<div class="dt">${parts}${tail} = ${sum + m}</div>` : ''}</div>`
      env.setTimeout(end, 2000)
    }
    const landed = () => {
      if (shown) return
      try {
        onLand?.()
      } catch {
        // Saving the roll must not stop the show.
      }
      reveal()
    }
    const guard = env.setTimeout(landed, 14000)
    if (!inst) return cssRoll(ov, ds, res, landed)
    const box = inst.box!
    void (async () => {
      try {
        await box.updateConfig(skinConfig(sk))
        const note = libNotation(ds, res, remote)
        if (note) {
          const rolling = box.roll(note)
          inst.rolling = rolling
          const out = await Promise.race([rolling, new Promise<never>((_, j) => env.setTimeout(() => j(new Error('slow')), 10000))])
          inst.rolling = undefined
          if (!remote) {
            const d4 = (out.sets || []).filter((x) => x.type === 'd4').flatMap((x) => x.rolls.map((y) => y.value))
            let k = 0
            for (const x of res) if (x.d === 4 && d4[k] != null) x.r = d4[k++]!
          }
          await new Promise<void>((r) => env.setTimeout(r, 1000))
        } else await new Promise<void>((r) => env.setTimeout(r, 1500))
        landed()
      } catch {
        cssRoll(ov, ds, res, landed)
      }
    })()
  }

  return {
    play: (job) =>
      new Promise<void>((done) => {
        if (active + queue.length >= MAX_SHOWN) {
          try {
            job.onLand?.()
          } catch {
            // Saving the roll must not stop the next one.
          }
          return done()
        }
        queue.push({ job, done })
        pump()
      }),
    init: () => {
      if (!lib()) return
      newInst()
      newInst()
    },
    physics: () => pool.some((x) => x.ready),
  }
}

/** Loads the dice library's script once; resolves with it, or null when it cannot load. */
export function loadDiceLib(doc: Document, win: Record<string, unknown>): Promise<DiceLib | null> {
  const have = () => (win['dice-box-threejs'] as DiceLib | undefined) ?? null
  if (have()) return Promise.resolve(have())
  return new Promise((resolve) => {
    const s = doc.createElement('script')
    s.src = `${DICE_LIB}dist/dice-box-threejs.umd.js`
    s.onload = () => resolve(have())
    s.onerror = () => resolve(null)
    doc.head.appendChild(s)
  })
}

/** The player for this browser window. */
export function browserDicePlayer(win: Window, lib: () => DiceLib | null): DicePlayer {
  return createDicePlayer({
    doc: win.document,
    width: () => win.innerWidth,
    height: () => win.innerHeight,
    reducedMotion: () => win.matchMedia('(prefers-reduced-motion:reduce)').matches,
    setTimeout: (f, ms) => win.setTimeout(f, ms),
    clearTimeout: (h) => win.clearTimeout(h),
    frame: (f) => void win.requestAnimationFrame(f),
    now: () => win.performance.now(),
    random: Math.random,
    lib,
  })
}

/** This window's player; the 3D library loads in the background and is used once ready. */
export function defaultDicePlayer(win: Window): DicePlayer {
  let lib: DiceLib | null = null
  const player = browserDicePlayer(win, () => lib)
  void loadDiceLib(win.document, win as unknown as Record<string, unknown>).then((l) => {
    lib = l
    player.init()
  })
  return player
}
