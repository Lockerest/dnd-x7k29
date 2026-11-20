import { describe, expect, it } from 'vitest'
import { abilitySlug, parseDice, shortText, slug, tightSlug } from './text'

describe('parseDice', () => {
  it.each([
    ['2d6+1d8', [6, 6, 8]],
    ['d20', [20]],
    ['2d6+3', [6, 6]],
    ['1d8+1d8', [8, 8]],
    ['', []],
    ['0', []],
    ['none', []],
  ])('%s', (s, out) => expect(parseDice(s)).toEqual(out))
  it('caps each term at 12 dice', () => {
    expect(parseDice('20d6')).toHaveLength(12)
    expect(parseDice('20d6+20d4')).toHaveLength(24)
  })
  it('accepts non-strings', () => {
    expect(parseDice(null)).toEqual([])
    expect(parseDice(undefined)).toEqual([])
  })
  it('a zero count still means one die (like the live page)', () => expect(parseDice('0d6')).toEqual([6]))
})

describe('slugs', () => {
  it('slug', () => {
    expect(slug("Warden's Cut")).toBe('warden_s_cut')
    expect(slug('  Power Strike!! ')).toBe('power_strike')
    expect(slug(42)).toBe('42')
  })
  it('abilitySlug drops the (Golden) suffix', () => {
    expect(abilitySlug('Frostbite Cleave (Golden)')).toBe('frostbite_cleave')
    expect(abilitySlug('Frostbite Cleave (golden)')).toBe('frostbite_cleave')
    expect(abilitySlug('Golden Ward')).toBe('golden_ward')
    expect(abilitySlug(undefined)).toBe('')
  })
  it('tightSlug', () => {
    expect(tightSlug('The Nameless King')).toBe('thenamelessking')
    expect(tightSlug("Izat'al")).toBe('izatal')
    expect(tightSlug(null)).toBe('')
  })
})

describe('shortText', () => {
  it('keeps short text', () => expect(shortText('  Heal 1d10.  ')).toBe('Heal 1d10.'))
  it('cuts at the first sentence end after 20 characters', () =>
    expect(shortText('A wide sweeping blow that hits everyone. Then more.')).toBe('A wide sweeping blow that hits everyone.'))
  it('also cuts at a semicolon', () => expect(shortText('Plant your feet firmly in place; you resist staggers.')).toBe('Plant your feet firmly in place;'))
  it('trims long text without punctuation', () => {
    const out = shortText('x'.repeat(200))
    expect(out).toHaveLength(110)
    expect(out.endsWith('...')).toBe(true)
  })
  it('handles empty values', () => expect(shortText(undefined)).toBe(''))
})
