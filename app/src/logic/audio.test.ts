import { describe, expect, it } from 'vitest'
import { loudnessGain, themeKeyFor } from './audio'

const sine = (amp: number, n = 44100) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i / 9))

describe('loudnessGain', () => {
  it('boosts quiet sounds toward the target', () => {
    const g = loudnessGain([sine(0.05)])
    expect(g).toBeGreaterThan(4)
    expect(g).toBeLessThanOrEqual(5)
  })
  it('caps the boost at 5x', () => expect(loudnessGain([sine(0.001)])).toBe(5))
  it('never turns sounds down', () => expect(loudnessGain([sine(0.9)])).toBe(1))
  it('keeps the peak below clipping', () => {
    const a = new Float32Array(44100)
    a[0] = 0.5
    a[3] = 0.5
    expect(loudnessGain([a])).toBeCloseTo(1.9, 6)
  })
  it('silence and empty input stay at 1', () => {
    expect(loudnessGain([new Float32Array(100)])).toBe(1)
    expect(loudnessGain([])).toBe(1)
  })
  it('measures every channel', () => expect(loudnessGain([new Float32Array(100), sine(0.05, 100)])).toBeGreaterThan(1))
})

describe('themeKeyFor', () => {
  const loaded = ['aethelric', 'firstdefier', 'namelessking']
  it('a loaded sheet theme wins', () => expect(themeKeyFor('Aethelric (phase 2)', 'firstdefier', loaded)).toBe('firstdefier'))
  it('falls back to the name', () => {
    expect(themeKeyFor('Aethelric', undefined, loaded)).toBe('aethelric')
    expect(themeKeyFor('The Nameless King', 'notloaded', loaded)).toBe('namelessking')
    expect(themeKeyFor('King', undefined, loaded)).toBe('namelessking')
  })
  it('none for unknown or short names', () => {
    expect(themeKeyFor('Wolf', undefined, loaded)).toBeNull()
    expect(themeKeyFor('Ae', undefined, loaded)).toBeNull()
    expect(themeKeyFor(null, undefined, loaded)).toBeNull()
  })
  it('short theme keys never match by name', () => expect(themeKeyFor('Oxen', undefined, ['ox'])).toBeNull())
})
