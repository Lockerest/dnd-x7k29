import { describe, expect, it } from 'vitest'
import { fileSlug, iconImportStatus, matchIcon } from './iconImport'

const board = {
  a: { n: 'Frost Lance', k: 'atk' },
  b: { n: 'Frost Lance (Golden)', k: 'atk' },
  c: { n: 'Heal', k: 'util' },
  gone: null,
} as never
const enemies = { w: { name: 'Wolf', sk: { s: { n: 'Frost Lance', d: '1d6', r: 1, t: 's' as const }, t: { n: 'Howl', d: '', r: 1, t: 'a' as const } } }, o: { name: 'Ogre' } }

describe('matching an icon file to abilities', () => {
  it('by name: board abilities (Golden too) and monster skills', () => {
    expect(matchIcon('Frost Lance.png', board, enemies)).toEqual({ board: ['a', 'b'], skill: 'frost_lance' })
    expect(matchIcon('frost-lance.webp', board, enemies)).toEqual({ board: ['a', 'b'], skill: 'frost_lance' })
    expect(matchIcon('HOWL.jpg', board, enemies)).toEqual({ board: [], skill: 'howl' })
    expect(matchIcon('heal.png', board, enemies)).toEqual({ board: ['c'], skill: null })
  })

  it('by board key, and nothing for other names', () => {
    expect(matchIcon('c.png', board, {})).toEqual({ board: ['c'], skill: null })
    expect(matchIcon('Fireball.png', board, enemies)).toEqual({ board: [], skill: null })
    expect(matchIcon('.png', board, enemies)).toEqual({ board: [], skill: null })
    expect(fileSlug('Frost__Lance (2).PNG')).toBe('frost_lance_2')
  })

  it('the status line', () => {
    expect(iconImportStatus(3, [], [])).toBe('3 imported')
    expect(iconImportStatus(1, ['a.png', 'b.png'], ['c.png'])).toBe("1 imported; no ability named a.png, b.png; couldn't read c.png")
  })
})
