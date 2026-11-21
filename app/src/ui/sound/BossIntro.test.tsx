// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BossIntroOverlay } from './BossIntro'

afterEach(cleanup)

describe('the boss intro', () => {
  it('art, title and name; fades out 0.6 s before the end', () => {
    const timers: [() => void, number][] = []
    const onDone = vi.fn()
    render(<BossIntroOverlay b={{ k: 'e:a', n: 'Aethelric', t: 'The First Defier', th: '' }} image="data:art" art seconds={4} onDone={onDone} setTimer={(f, ms) => timers.push([f, ms])} />)
    const el = screen.getByRole('img', { name: 'Boss: Aethelric' })
    expect(el.querySelector('img')).toHaveClass('bimg', 'art')
    expect(el.querySelector('.btx')).toHaveTextContent('The First DefierAethelric')
    expect(timers.map((t) => t[1])).toEqual([3400, 4000])
    act(() => timers[0]![0]())
    expect(el).toHaveClass('bos', 'out')
    timers[1]![0]()
    expect(onDone).toHaveBeenCalled()
  })

  it('a token picture, or the initial; no title line without a title; real timers by default', () => {
    render(<BossIntroOverlay b={{ k: 'e:a', n: 'ogre', t: '', th: '' }} image="data:t" art={false} seconds={3} onDone={() => {}} />)
    expect(screen.getByRole('img', { name: 'Boss: ogre' }).querySelector('img')).not.toHaveClass('art')
    cleanup()
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<BossIntroOverlay b={{ k: 'e:a', n: 'ogre', t: '', th: '' }} image={null} art={false} seconds={3} onDone={onDone} />)
    const el = screen.getByRole('img', { name: 'Boss: ogre' })
    expect(el.querySelector('.bimg.em')).toHaveTextContent('O')
    expect(el.querySelector('small')).toBeNull()
    act(() => void vi.advanceTimersByTime(3000))
    expect(onDone).toHaveBeenCalled()
    vi.useRealTimers()
    cleanup()
    render(<BossIntroOverlay b={{ k: 'e:a', n: '', t: '', th: '' }} image={null} art={false} seconds={3} onDone={() => {}} />)
    expect(document.querySelector('.bimg.em')).toHaveTextContent('?')
  })
})
