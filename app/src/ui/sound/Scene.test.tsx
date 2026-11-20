// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Board } from '../../logic/board'
import { SceneOverlay, type SceneProps } from './Scene'

afterEach(cleanup)

const board: Board = {
  a: { n: 'Fire Arrow', v: 'any', l: 1, c: 1, k: 'atk', d: '1d8', r: 6 },
  b: { n: 'Cleave', v: 'any', l: 1, c: 1, k: 'atk', d: '1d8', r: 1 },
  c: { n: 'Smite', v: 'any', l: 1, c: 1, k: 'atk', d: '1d8', r: 1, ic: '⚔' },
}
const show = (o: Partial<SceneProps> & { scene?: SceneProps['scene'] } = {}) => {
  const timers: [() => void, number][] = []
  const onDone = vi.fn()
  const r = render(
    <SceneOverlay
      scene={{ a: 'c:a', t: 'e:w', an: 'Lyra', tn: 'Wolf', d: 12, ...o.scene }}
      s25={o.s25 ?? false}
      board={board}
      abilityImages={o.abilityImages ?? {}}
      drawnIcons={o.drawnIcons ?? false}
      picture={o.picture ?? (() => null)}
      onDone={onDone}
      setTimer={(f, ms) => timers.push([f, ms])}
    />,
  )
  return { ...r, timers, onDone, scn: r.container.querySelector('.scn') as HTMLElement }
}

describe('the attack scene', () => {
  it('a plain slash: caption, both figures (initials without pictures), the hit number; fades and ends on time', () => {
    const { scn, timers, onDone } = show()
    expect(screen.getByRole('img', { name: 'Lyra attacks Wolf' })).toBe(scn)
    expect(scn.className).toBe('scn')
    expect(scn.querySelector('.cap')).toHaveTextContent('Lyra ➜ Wolf')
    expect([...scn.querySelectorAll('.fig')].map((f) => [f.className, f.textContent])).toEqual([
      ['fig R tgt hit', 'WWolf'],
      ['fig L atk', 'LLyra'],
    ])
    expect(scn.querySelector('.fx.slash')!.innerHTML).toBe('<i></i>')
    expect(scn.querySelector('.dmg')).toHaveTextContent('-12')
    expect(scn.querySelector('.dmg')!.className).toBe('dmg hit')
    expect(timers.map((t) => t[1])).toEqual([2650, 3050])
    act(() => timers[0]![0]())
    expect(scn.className).toBe('scn out')
    timers[1]![0]()
    expect(onDone).toHaveBeenCalled()
  })

  it('pictures, heavy and bash hits, crits and zero damage', () => {
    const pics: Record<string, string> = { 'c:a': 'data:a' }
    expect(show({ picture: (k) => pics[k] ?? null }).scn.querySelector('.L img')).toHaveAttribute('src', 'data:a')
    cleanup()
    expect(show({ scene: { k: 'heavy' } }).scn.querySelector('.fx.slash')!.innerHTML).toBe('<i></i><u></u>')
    cleanup()
    const bash = show({ scene: { k: 'bash', c: true, d: 0 } }).scn
    expect(bash.querySelector('.fx.em')).toHaveTextContent('💥')
    expect(bash.querySelector('.dmg')).toHaveTextContent('CRIT! ✦')
    expect(bash.querySelector('.dmg')!.className).toBe('dmg hit crit')
    expect(bash.querySelector('.L')!.className).toBe('fig L atk')
    cleanup()
    const noName = show({ scene: { an: undefined, tn: undefined, d: undefined, o: 'hit' } }).scn
    expect(noName.querySelector('.cap')).toHaveTextContent('➜')
    expect(noName.querySelector('.L .em')).toHaveTextContent('?')
  })

  it('arrows (with their element), spells, parries, dodges and misses', () => {
    const arrow = show({ scene: { k: 'arrow', l: 'Fire Arrow' } }).scn
    expect(arrow.querySelector('.fx.arrow')).toHaveTextContent('➤')
    expect(arrow.querySelector('.fx.em')).toHaveTextContent('🔥')
    expect(arrow.querySelector('.L')!.className).toBe('fig L atk cast')
    expect(arrow.querySelector('.cap')).toHaveTextContent('Lyra ➜ Wolf · Fire Arrow')
    cleanup()
    expect(show({ scene: { k: 'arrow' } }).scn.querySelectorAll('.fx')).toHaveLength(1)
    cleanup()
    expect(show({ scene: { k: 'ice' } }).scn.querySelector('.fx.em')).toHaveTextContent('❄️')
    cleanup()
    expect(show({ scene: { k: 'weird' } }).scn.querySelector('.fx.em')).toHaveTextContent('💥')
    cleanup()
    const parry = show({ scene: { o: 'parry' } }).scn
    expect(parry.querySelector('.fx.em')).toHaveTextContent('🛡️')
    expect(parry.querySelector('.dmg')).toHaveTextContent('PARRIED')
    expect(parry.querySelector('.R')!.className).toBe('fig R tgt parry')
    cleanup()
    const dodge = show({ scene: { o: 'dodge' } }).scn
    expect(dodge.querySelector('.fx')).toBeNull()
    expect(dodge.querySelector('.dmg')).toHaveTextContent('DODGED')
    expect(dodge.querySelector('.R')!.className).toBe('fig R tgt dodge')
    cleanup()
    expect(show({ scene: { o: 'miss' } }).scn.querySelector('.dmg')).toHaveTextContent('MISS')
  })

  it("the ability's badge when it has an icon; the 2.5D camera adds the set, mist, glyph and flash", () => {
    expect(show({ scene: { l: 'Cleave' } }).scn.querySelector('.abadge')).toBeNull() // no icon to show
    cleanup()
    expect(show({ scene: { l: 'Smite' } }).scn.querySelector('.abadge')).toHaveTextContent('⚔Smite')
    cleanup()
    expect(show({ scene: { l: 'Cleave' }, abilityImages: { b: 'data:c' } }).scn.querySelector('.abadge img')).toHaveAttribute('src', 'data:c')
    cleanup()
    const s25 = show({ s25: true, drawnIcons: true, scene: { k: 'arrow', l: 'Fire Arrow' } }).scn
    expect(s25.className).toBe('scn s25')
    expect([...s25.querySelector('.cam')!.children].slice(0, 4).map((e) => e.className)).toEqual(['sky', 'far', 'mid', 'flr'])
    expect(s25.querySelector('.cam .mist')).not.toBeNull()
    expect(s25.querySelector('.abadge svg')).not.toBeNull()
    expect(s25.querySelector('.fxg')!.className).toBe('fxg fly')
    expect(s25.querySelector('.fxg svg')!.innerHTML).not.toBe('')
    expect(s25.querySelector('.stage > .vig')).not.toBeNull()
    expect(s25.querySelector('.stage > .flash')).not.toBeNull()
    cleanup()
    const melee = show({ s25: true, scene: { l: 'Cleave', o: 'dodge' } }).scn
    expect(melee.querySelector('.fxg')!.className).toBe('fxg pop')
    expect(melee.querySelector('.flash')).toBeNull()
    cleanup()
    expect(show({ s25: true, scene: { l: 'Cleave', o: 'parry' } }).scn.querySelector('.fxg')).toBeNull()
    cleanup()
    expect(show({ s25: true, scene: { l: 'Unknown' } }).scn.querySelector('.fxg')).toBeNull()
  })

  it('animations run a little slower, except the fade-out', () => {
    const anims = [{ animationName: 'lunge', playbackRate: 1 }, { animationName: 'scout', playbackRate: 1 }, { playbackRate: 1 }]
    const spy = vi.fn(() => anims)
    ;(HTMLElement.prototype as unknown as { getAnimations: unknown }).getAnimations = spy
    show()
    expect(anims.map((a) => a.playbackRate)).toEqual([1 / 1.4, 1, 1 / 1.4])
    delete (HTMLElement.prototype as unknown as { getAnimations?: unknown }).getAnimations
  })

  it('uses real timers by default', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<SceneOverlay scene={{ a: 'c:a', t: 'e:w' }} s25={false} board={{}} abilityImages={{}} drawnIcons={false} picture={() => null} onDone={onDone} />)
    act(() => void vi.advanceTimersByTime(3100))
    expect(onDone).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
