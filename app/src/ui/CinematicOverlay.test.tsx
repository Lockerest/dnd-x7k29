// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AETHELRIC_75 } from '../data/cinematics'
import { cinematicSeconds, parseCinematic } from '../logic/cinematic'
import { CinematicOverlay } from './CinematicOverlay'

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
