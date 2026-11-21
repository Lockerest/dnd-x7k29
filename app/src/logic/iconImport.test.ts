import { describe, expect, it } from 'vitest'
import { CLASS_ICONS, GOLDEN_ICONS, SKILL_ICONS } from '../data/icons'
import { classIcon, fileSlug, iconImportStatus, matchIcon, webIcons } from './iconImport'

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

describe('the built-in icons from the web', () => {
  it('boss skills first, then class icons for the board abilities of that name', () => {
    expect(webIcons(board, { bite: 'b.jpg' }, { frost_lance: 'f.jpg', heal: 'h.jpg', fireball: 'x.jpg' })).toEqual([
      { file: 'b.jpg', skill: 'bite', board: [] },
      { file: 'f.jpg', skill: null, board: ['a', 'b'] },
      { file: 'h.jpg', skill: null, board: ['c'] },
    ])
  })

  it('every class ability has its icon, and the built-in lists are used by default', () => {
    expect(Object.keys(CLASS_ICONS)).toHaveLength(139)
    const all = webIcons({ s: { n: 'Spear Thrust', k: 'atk' }, g: { n: 'Spear Thrust (Golden)', k: 'atk' } } as never)
    expect(all).toHaveLength(Object.keys(SKILL_ICONS).length + 1)
    expect(all.at(-1)).toEqual({ file: CLASS_ICONS.spear_thrust, skill: null, board: ['s', 'g'] })
  })
})

describe('Golden pictures', () => {
  it('a Golden ability gets its gold picture when there is one, else the class picture', () => {
    const b = { m: { n: 'Meteor Fall', k: 'atk' }, mg: { n: 'Meteor Fall (Golden)', k: 'atk', gb: 'm' }, h: { n: 'Heal', k: 'heal' }, hg: { n: 'Heal (Golden)', gb: 'h' } } as never
    expect(webIcons(b, {}, { meteor_fall: 'm.jpg', heal: 'h.jpg' }, { meteor_fall: 'mg.jpg' })).toEqual([
      { file: 'm.jpg', skill: null, board: ['m'] },
      { file: 'mg.jpg', skill: null, board: ['mg'] },
      { file: 'h.jpg', skill: null, board: ['h', 'hg'] },
    ])
    expect(classIcon('Meteor Fall (Golden)', true)).toBe(GOLDEN_ICONS.meteor_fall)
    expect(classIcon('Meteor Fall', false)).toBe(CLASS_ICONS.meteor_fall)
    expect(classIcon('Brace (Golden)', true)).toBe(CLASS_ICONS.brace)
    expect(classIcon('Nothing', false)).toBeUndefined()
    expect(Object.keys(GOLDEN_ICONS).every((k) => CLASS_ICONS[k])).toBe(true)
  })
})
