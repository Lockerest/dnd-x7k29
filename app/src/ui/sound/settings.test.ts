import { describe, expect, it } from 'vitest'
import { loadFxSettings, saveFxSettings } from './settings'

const mem = (o: Record<string, string> = {}) => {
  const m = new Map(Object.entries(o))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('scene and sound settings', () => {
  it('default to on at half volume; read the live page keys; clamp the sliders', () => {
    expect(loadFxSettings(mem())).toEqual({ scenes: true, s25: true, sound: true, volume: 0.5, reverb: 0.5, music: true })
    expect(loadFxSettings(mem({ sc: '0', s25: '0', sn: '0', sv: '3', rv: 'x', bgm: '0' }))).toEqual({ scenes: false, s25: false, sound: false, volume: 1, reverb: 0, music: false })
    expect(loadFxSettings(mem({ sv: '-1', rv: '0.25' }))).toMatchObject({ volume: 0, reverb: 0.25 })
  })

  it('save under the same keys', () => {
    const s = mem()
    saveFxSettings(s, { scenes: false, s25: true, sound: false, volume: 0.3, reverb: 0.7, music: false })
    expect(Object.fromEntries(s.m)).toEqual({ sc: '0', s25: '1', sn: '0', sv: '0.3', rv: '0.7', bgm: '0' })
  })
})
