// Dice notation, name slugs (used to match sounds, icons and themes) and text trimming.
import { expect, test } from '../harness.ts'

test.describe('parseD(): dice notation to a list of dice', () => {
  test('expands each term', async ({ legacy }) => {
    expect(await legacy.run('parseD("2d6+1d8")')).toEqual([6, 6, 8])
  })
  test('a missing count means one die', async ({ legacy }) => {
    expect(await legacy.run('parseD("d20")')).toEqual([20])
  })
  test('ignores flat bonuses (they are added separately)', async ({ legacy }) => {
    expect(await legacy.run('parseD("2d6+3")')).toEqual([6, 6])
  })
  test('caps each term at 12 dice', async ({ legacy }) => {
    expect(await legacy.run('parseD("20d6").length')).toBe(12)
    expect(await legacy.run('parseD("20d6+20d4").length')).toBe(24)
  })
  test('returns no dice for empty or invalid text (utility skills use "0")', async ({ legacy }) => {
    expect(await legacy.run('[parseD(""),parseD(null),parseD("0"),parseD("none")]')).toEqual([[], [], [], []])
  })
  test('the heavy-attack notation doubles the dice', async ({ legacy }) => {
    expect(await legacy.run('parseD("1d8+1d8")')).toEqual([8, 8])
  })
})

test.describe('slugs', () => {
  test('slug() makes board keys', async ({ legacy }) => {
    expect(await legacy.run('[slug("Warden\'s Cut"),slug("  Power Strike!! "),slug("Hunter\'s Eye")]')).toEqual([
      'warden_s_cut',
      'power_strike',
      'hunter_s_eye',
    ])
  })
  test('abSlug() matches ability sounds, ignoring the (Golden) suffix', async ({ legacy }) => {
    expect(await legacy.run('[abSlug("Frostbite Cleave (Golden)"),abSlug("Frostbite Cleave"),abSlug("")]')).toEqual([
      'frostbite_cleave',
      'frostbite_cleave',
      '',
    ])
  })
  test('tslug() squashes names for theme matching', async ({ legacy }) => {
    expect(await legacy.run('[tslug("The Nameless King"),tslug("Izat\'al"),tslug(null)]')).toEqual(['thenamelessking', 'izatal', ''])
  })
})

test.describe('shortT(): one-line ability summaries', () => {
  test('keeps short text as it is', async ({ legacy }) => {
    expect(await legacy.run('shortT("  Heal 1d10.  ")')).toBe('Heal 1d10.')
  })
  test('cuts at the first sentence end after 20 characters', async ({ legacy }) => {
    expect(await legacy.run('shortT("A wide sweeping blow that hits everyone. Then more text follows here.")')).toBe(
      'A wide sweeping blow that hits everyone.',
    )
  })
  test('trims very long text without punctuation to 110 characters', async ({ legacy }) => {
    const out = await legacy.run<string>('shortT("x".repeat(200))')
    expect(out).toHaveLength(110)
    expect(out.endsWith('...')).toBe(true)
  })
  test('handles empty values', async ({ legacy }) => {
    expect(await legacy.run('shortT(undefined)')).toBe('')
  })
})
