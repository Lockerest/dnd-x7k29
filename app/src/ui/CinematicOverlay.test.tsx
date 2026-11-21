// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AETHELRIC_75 } from '../data/cinematics'
import { cinematicSeconds, parseCinematic } from '../logic/cinematic'
import { CinematicOverlay, MAX_VIDEO_MS } from './CinematicOverlay'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = (t: string, portrait: string | null = null, rand?: () => number) => {
  const onDone = vi.fn()
  render(<CinematicOverlay cin={{ t, n: 'Aethelric', k: 'e:a' }} portrait={portrait} onDone={onDone} rand={rand} />)
  const el = screen.getByRole('dialog', { name: 'Cinematic: Aethelric' })
  const q = (s: string) => el.querySelector(s) as HTMLElement
  const step = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
  return { el, q, step, onDone }
}

describe('<CinematicOverlay />', () => {
  it('plays the Aethelric scene beat by beat, then closes', () => {
    const { el, q, step, onDone } = play(AETHELRIC_75, 'data:image/png;base64,AAAA', () => 0.5)
    const beats = parseCinematic(AETHELRIC_75)
    expect(q('.ci')).toBeInTheDocument()
    expect(q('.ct')).not.toHaveClass('mid') // a portrait scene keeps the text at the bottom
    for (const b of beats) {
      act(() => void vi.advanceTimersToNextTimer())
      if (b.text) expect(q('.ct')).toHaveTextContent(b.text)
      if (b.tags.big) expect(q('.ct p')).toHaveClass('big')
    }
    expect(q('.ci')).toHaveClass('on', 'bk')
    expect(q('.cg')).toHaveClass('on')
    expect(q('.cc').querySelectorAll('path')).toHaveLength(9)
    expect(q('.cs').querySelectorAll('.rk')).toHaveLength(46)
    expect(q('.cd')).toHaveClass('on')
    expect(q('.cs').style.opacity).toBe('0')
    const D = cinematicSeconds(beats)
    step(D * 1000)
    expect(el).toHaveClass('out')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('plain text sits in the middle; flash, shake and slam restart their effects', () => {
    const { q, step } = play('[flash] One\n[shake] Two\n[slam] Three\n[black]\n[collapse] Four')
    expect(q('.ci')).toBeNull()
    expect(q('.ct')).toHaveClass('mid')
    step(1)
    expect(q('.cf')).toHaveClass('on')
    expect(q('.ct')).toHaveTextContent('One')
    step(2300)
    expect(q('.cs')).toHaveClass('sh')
    step(2300)
    expect(q('.ct')).toHaveTextContent('Three')
    step(2300)
    expect(q('.ct')).toBeEmptyDOMElement() // [black] with no text clears it
    step(1200)
    expect(q('.cs')).toHaveClass('sl')
  })

  it('a collapse with no text clears the line; [portrait] without a picture shows text in the middle', () => {
    const { q, step } = play('Before\n[collapse]', null)
    step(1)
    expect(q('.ct')).toHaveTextContent('Before')
    step(2300)
    expect(q('.ct')).toBeEmptyDOMElement()
    cleanup()
    const p = play('[portrait] Him', null)
    p.step(1)
    expect(p.q('.ci')).toBeNull()
    expect(p.q('.ct')).toHaveTextContent('Him')
  })

  it('escapes text and stops its timers when closed early', () => {
    const { q, step, onDone } = play('<b>bold</b> & "quotes"')
    step(1)
    expect(q('.ct p').innerHTML).toBe('&lt;b&gt;bold&lt;/b&gt; &amp; "quotes"')
    cleanup()
    act(() => void vi.runAllTimers())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('a [stagger] without a portrait still shakes; an effect-only beat keeps the text', () => {
    const { q, step } = play('[stagger] Hit\n[glow]')
    step(1)
    expect(q('.cs')).toHaveClass('sh')
    step(2300)
    expect(q('.cg')).toHaveClass('on')
    expect(q('.ct')).toHaveTextContent('Hit')
  })
})

describe('<CinematicOverlay /> sounds', () => {
  it('each effect beat plays its sound', () => {
    const sound = { thunk: vi.fn(), glow: vi.fn(), slam: vi.fn(), crack: vi.fn(), collapse: vi.fn() }
    render(<CinematicOverlay cin={{ t: '[stagger] A\n[glow] B\n[shake] C\n[slam] D\n[crack] E\n[collapse] F\n[flash] G', n: 'X', k: 'e:x' }} onDone={() => {}} sound={sound} />)
    act(() => void vi.advanceTimersByTime(30000))
    expect(sound.thunk).toHaveBeenCalledTimes(2)
    for (const f of [sound.glow, sound.slam, sound.crack, sound.collapse]) expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('a cutscene video instead of the script', () => {
  const setup = (o: { t?: string; volume?: number; play?: () => Promise<void> } = {}) => {
    const play = vi.fn(o.play ?? (() => Promise.resolve()))
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
    const onDone = vi.fn()
    render(<CinematicOverlay cin={{ t: o.t ?? '', n: 'Aethelric', k: 'e:a', v: 'https://x.co/v.mp4' }} onDone={onDone} volume={o.volume} />)
    const el = screen.getByRole('dialog', { name: 'Cinematic: Aethelric' })
    const v = () => screen.queryByLabelText('Cutscene video') as HTMLVideoElement | null
    const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)))
    return { el, v, play, onDone, flush }
  }

  it('plays it with sound, then fades out without the script', async () => {
    const { el, v, play, flush, onDone } = setup({ t: '[portrait] After the fall.', volume: 0.4 })
    await flush()
    expect(play).toHaveBeenCalledTimes(1)
    expect(v()).toHaveAttribute('src', 'https://x.co/v.mp4')
    expect(v()!.muted).toBe(false)
    expect(v()!.volume).toBeCloseTo(0.4)
    expect(el.querySelector('.ct')).toHaveTextContent('')
    act(() => void vi.advanceTimersByTime(5000))
    fireEvent.ended(v()!)
    expect(v()).toBeNull()
    expect(el.querySelector('.ci')).toBeNull()
    act(() => void vi.advanceTimersByTime(1600))
    expect(el.querySelector('.ct')).toHaveTextContent('')
    expect(onDone).toHaveBeenCalled()
  })

  it('with sound off it plays muted', async () => {
    const { v, onDone, flush } = setup({ volume: 0 })
    await flush()
    expect(v()!.muted).toBe(true)
    fireEvent.error(v()!)
    act(() => void vi.advanceTimersByTime(1600))
    expect(onDone).toHaveBeenCalled()
  })

  it('a browser that blocks sound gets it muted; one that blocks it all skips it', async () => {
    let n = 0
    const a = setup({ play: () => (n++ ? Promise.resolve() : Promise.reject(new Error('no sound'))) })
    await a.flush()
    expect(a.play).toHaveBeenCalledTimes(2)
    expect(a.v()!.muted).toBe(true)
    cleanup()
    const b = setup({ play: () => Promise.reject(new Error('blocked')) })
    await b.flush()
    expect(b.v()).toBeNull()
  })

  it('a click skips it, and a video that never ends gives way after a while', async () => {
    const a = setup()
    await a.flush()
    fireEvent.click(a.v()!)
    expect(a.v()).toBeNull()
    cleanup()
    const b = setup()
    await b.flush()
    act(() => void vi.advanceTimersByTime(MAX_VIDEO_MS))
    expect(b.v()).toBeNull()
  })
})
