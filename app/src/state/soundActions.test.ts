import { describe, expect, it } from 'vitest'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore } from './store'

function setup(role: 'gm' | 'player' = 'gm', db: ReturnType<typeof fakeDb>['db'] | null = null) {
  const f = fakeDb()
  const s = createGameStore(
    () => (db === null ? f.db : db),
    () => 77,
    () => 0.5,
  )
  s.getState().connect({ pin: 'p', role, me: role === 'gm' ? 'gm' : 'a' })
  return { s, f }
}

describe("the GM's sounds", () => {
  it('clips and themes: the audio, then the version stamp', async () => {
    const { s, f } = setup()
    expect(await s.getState().saveClip('slash', 'data:a')).toBe(true)
    await s.getState().saveClip('bash', 'data:b', false)
    await s.getState().removeClip('slash')
    await s.getState().saveTheme('arachne', 'Arachne', 'data:t')
    await s.getState().saveTheme('kernunos', 'Kernunos', 'data:k', false)
    await s.getState().removeTheme('arachne')
    await s.getState().stampSounds('thv')
    await s.getState().saveAbilitySound('firebolt', 'data:f')
    await s.getState().removeAbilitySounds()
    expect(f.writes).toEqual([
      ['PUT', 'sounds/slash', { data: 'data:a' }],
      ['PATCH', 'meta', { snd: 77 }],
      ['PUT', 'sounds/bash', { data: 'data:b' }],
      ['DELETE', 'sounds/slash', null],
      ['PATCH', 'meta', { snd: 77 }],
      ['PUT', 'themes/arachne', { n: 'Arachne', data: 'data:t' }],
      ['PATCH', 'meta', { thv: 77 }],
      ['PUT', 'themes/kernunos', { n: 'Kernunos', data: 'data:k' }],
      ['DELETE', 'themes/arachne', null],
      ['PATCH', 'meta', { thv: 77 }],
      ['PATCH', 'meta', { thv: 77 }],
      ['PUT', 'absnd/firebolt', { data: 'data:f' }],
      ['DELETE', 'absnd', null],
    ])
  })

  it('only the GM, and only with a database', async () => {
    const pl = setup('player')
    expect(await pl.s.getState().saveClip('slash', 'data:a')).toBe(false)
    expect(pl.f.writes).toEqual([])
    const s = createGameStore()
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    expect(await s.getState().saveClip('slash', 'data:a')).toBe(false)
  })

  it('a failed save shows the problem and says so', async () => {
    const f = fakeDb()
    f.db.put = async () => {
      throw new Error('offline')
    }
    const { s } = setup('gm', f.db)
    expect(await s.getState().saveAbilitySound('x', 'data:x')).toBe(false)
    expect(s.getState().error).toMatch(/offline/)
  })
})
