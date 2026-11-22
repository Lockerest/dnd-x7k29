// The GM's test lab on the Dice card: play any attack scene or the Golden Wave
// on this screen only (no dice, no damage), then the sound tools: clips for the
// sound slots, ability sounds, reverb and boss themes. Same as the live page.
import { useEffect, useRef, useState } from 'react'
import { ABILITY_SOUNDS } from '../../data/audio'
import type { Board } from '../../logic/board'
import type { Sheet } from '../../logic/sheet'
import { defaultTestPick, TEST_KINDS, TEST_OUTCOMES, testAbilities, testOptions, testScene, themeRows, type TestPick } from '../../logic/soundTools'
import type { Enemy } from '../../logic/types'
import { SOUND_SLOTS, type FxEvent } from '../sound/engine'
import { newThemeFor, type SoundTools } from '../sound/useSoundTools'

export type TestLabProps = {
  chars: Record<string, Sheet>
  enemies: Record<string, Enemy>
  board: Board
  tools: SoundTools
  lab: { scene: (f: FxEvent) => void; wave: () => void }
  reverb: number
  onReverb: (v: number) => void
  ask?: (q: string) => string | null
}

const row = { minWidth: 210 }

export function TestLab({ chars, enemies, board, tools, lab, reverb, onReverb, ask = (q) => window.prompt(q) }: TestLabProps) {
  const [p, setP] = useState<TestPick>(defaultTestPick)
  const opts = testOptions(chars, enemies)
  const set = (q: Partial<TestPick>) => setP((x) => ({ ...x, ...q }))
  const slotFile = useRef<HTMLInputElement>(null)
  const themeFile = useRef<HTMLInputElement>(null)
  const abFiles = useRef<HTMLInputElement>(null)
  const [slotFor, setSlotFor] = useState<string | null>(null)
  const [themeFor, setThemeFor] = useState<{ k: string; n: string } | null>(null)
  const { refresh } = tools
  useEffect(() => void refresh(), [refresh])
  const pick = (el: HTMLInputElement) => {
    el.value = ''
    el.click()
  }
  const who = (label: string, v: string, k: 'a' | 't') => (
    <label className="sub">
      {label}{' '}
      <select aria-label={label} style={{ width: 'auto' }} value={v} onChange={(e) => set({ [k]: e.target.value })}>
        {opts.map(([key, t]) => (
          <option key={key} value={key}>
            {t}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <div aria-label="Test lab">
      <div className="row mini">
        {who('Attacker', p.a, 'a')}
        {who('Target', p.t, 't')}
        <label className="sub">
          Ability{' '}
          <select aria-label="Ability" style={{ width: 'auto' }} value={p.ab} onChange={(e) => set({ ab: e.target.value })}>
            <option value="">(generic attack)</option>
            {testAbilities(board).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="sub">
          Generic{' '}
          <select aria-label="Generic" style={{ width: 'auto' }} value={p.k} onChange={(e) => set({ k: e.target.value })}>
            {TEST_KINDS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row mini">
        {TEST_OUTCOMES.map(([v, t]) => (
          <button key={v} onClick={() => lab.scene(testScene(v, p, chars, enemies, board))}>
            {t}
          </button>
        ))}
        <button onClick={lab.wave}>Golden Wave</button>
      </div>
      <p className="note">Plays only on your screen: no dice, no damage.</p>

      <h3>Custom sounds</h3>
      <p className="note">Upload short royalty-free clips (about 450 KB max each). Slots without a clip use the built-in sound. Everyone hears your clips.</p>
      <input
        ref={slotFile}
        type="file"
        accept="audio/*"
        hidden
        aria-label="Sound clip file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f && slotFor) void tools.uploadSlot(slotFor, f)
        }}
      />
      {SOUND_SLOTS.map(([k, t]) => {
        const mine = tools.slots.includes(k)
        return (
          <div className="row mini" key={k} aria-label={`Slot: ${t}`}>
            <span className="sub" style={row}>
              {t}: {mine ? <b>custom</b> : 'built-in'}
            </span>
            <button onClick={() => tools.previewSlot(k)}>Play</button>
            <button
              onClick={() => {
                setSlotFor(k)
                pick(slotFile.current!)
              }}
            >
              Upload
            </button>
            {mine && <button onClick={() => void tools.removeSlot(k)}>Remove</button>}
          </div>
        )
      })}
      <div className="row mini">
        <button onClick={() => void tools.importBase()}>Import base attack sounds from web</button>
        <span className="sub">{tools.status.bs}</span>
      </div>

      <h3>Ability sounds</h3>
      <p className="note">
        One sound per ability ({Object.keys(ABILITY_SOUNDS).length} ready, every class and boss). It replaces the hit sound when that ability is used; Golden and Crimson versions share it.{' '}
        <b>Import from web</b> tries to fetch all of them in one go; if your browser blocks it, use <b>Import files</b> with the downloaded mp3s (named by their ID or by ability name).
      </p>
      <input ref={abFiles} type="file" accept="audio/*" multiple hidden aria-label="Ability sound files" onChange={(e) => void tools.importAbilityFiles([...(e.target.files ?? [])])} />
      <div className="row mini">
        <button onClick={() => void tools.importAbilities()}>Import from web</button>
        <button onClick={() => pick(abFiles.current!)}>Import files</button>
        <button onClick={() => void tools.removeAbilities()}>Remove all</button>
        <span className="sub">{tools.status.ab}</span>
      </div>
      <label className="sub">
        Reverb (this device) <input type="range" min={0} max={100} value={Math.round(reverb * 100)} style={{ width: 120 }} aria-label="Reverb" onChange={(e) => onReverb(+e.target.value / 100)} />
      </label>

      <h3>Boss themes</h3>
      <div className="row mini">
        <button onClick={() => void tools.importThemes()}>Import all boss themes from web</button>
        <span className="sub">{tools.status.th}</span>
      </div>
      <p className="note">Phase 2 themes (The First Defier, The Collector) are matched by picking them in that monster Theme box.</p>
      <p className="note">
        One short theme per boss (about 700 KB max). The intro plays the first 5 seconds, then the theme loops as battle music until that boss dies or swaps phase (the Battle music checkbox turns the
        loop off). A theme is matched to a monster by its name, or you can pick it in that monster&apos;s Theme box. Add halfway and optional bosses too.
      </p>
      <input
        ref={themeFile}
        type="file"
        accept="audio/*"
        hidden
        aria-label="Boss theme file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f && themeFor) void tools.uploadTheme(themeFor.k, themeFor.n, f)
        }}
      />
      {themeRows(tools.themes).map(([k, n]) => {
        const has = k in tools.themes
        return (
          <div className="row mini" key={k} aria-label={`Theme: ${n}`}>
            <span className="sub" style={row}>
              {n}: {has ? <b>theme loaded</b> : 'none'}
            </span>
            {has && <button onClick={() => void tools.previewTheme(k)}>Play</button>}
            <button
              onClick={() => {
                setThemeFor({ k, n })
                pick(themeFile.current!)
              }}
            >
              {has ? 'Replace' : 'Upload'}
            </button>
            {has && <button onClick={() => void tools.removeTheme(k)}>Remove</button>}
          </div>
        )
      })}
      <div className="row mini">
        <button
          onClick={() => {
            const t = newThemeFor(ask('Boss name for this theme (for example the halfway boss):'))
            if (!t) return
            setThemeFor(t)
            pick(themeFile.current!)
          }}
        >
          Add another boss theme
        </button>
      </div>
    </div>
  )
}
