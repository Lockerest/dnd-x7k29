import { describe, expect, it } from 'vitest'
import { ABILITY_SOUNDS } from '../data/audio'
import { abilityForFile, audioDataUrl, defaultTestPick, importStatus, testAbilities, testOptions, testScene, themeRows, themeSlug } from './soundTools'

const chars = { a: { name: 'Lyra', cls: 'fighter' }, b: { name: 'Bo', cls: 'mage', ha: true } }
const enemies = { w: { name: 'Wolf' }, o: { name: '' } }
const board = { x: { n: 'Firebolt', k: 'atk', r: 0 }, y: { n: 'Aimed', k: 'atk', r: 4 }, z: { n: 'Heal', k: 'util' }, q: { n: 'Cleave', k: 'atk' } }

describe('the test lab', () => {
  it('offers the dummies, then heroes and monsters', () => {
    expect(testOptions(chars, enemies)).toEqual([
      ['t:Test Hero', 'Test Hero (dummy)'],
      ['t:Test Dummy', 'Test Dummy (dummy)'],
      ['c:a', 'Lyra (player)'],
      ['c:b', 'Bo (player)'],
      ['e:w', 'Wolf (enemy)'],
      ['e:o', ' (enemy)'],
    ])
  })

  it('offers the board attacks by name', () => {
    expect(testAbilities({ ...board, n: null } as never)).toEqual([
      ['y', 'Aimed'],
      ['q', 'Cleave'],
      ['x', 'Firebolt'],
    ])
  })

  it('a generic test between the dummies', () => {
    expect(testScene('hit', defaultTestPick(), chars, enemies, board)).toEqual({
      a: 't:Test Hero',
      t: 't:Test Dummy',
      k: 'slash',
      o: 'hit',
      d: 120,
      c: false,
      an: 'Test Hero',
      tn: 'Test Dummy',
      l: 'Test',
      ha: false,
    })
  })

  it('a critical hit with an ability between real sheets', () => {
    expect(testScene('crit', { a: 'c:a', t: 'c:b', ab: 'q', k: 'ice' }, chars, enemies, board)).toEqual({
      a: 'c:a',
      t: 'c:b',
      k: 'heavy',
      o: 'hit',
      d: 240,
      c: true,
      an: 'Lyra',
      tn: 'Bo',
      l: 'Cleave',
      ha: true,
    })
    expect(testScene('miss', { a: 'e:w', t: 'e:o', ab: 'y', k: 'ice' }, chars, enemies, board)).toMatchObject({ k: 'arrow', o: 'miss', an: 'Wolf', tn: '?', ha: false })
    expect(testScene('dodge', { a: 'e:gone', t: 'c:gone', ab: 'gone', k: 'ice' }, chars, enemies, board)).toMatchObject({ k: 'ice', an: '?', tn: '?', l: 'Test' })
    expect(testScene('parry', { a: 't:Test Hero', t: 'x:?', ab: 'x', k: 'ice' }, chars, enemies, board)).toMatchObject({ k: 'fire', tn: '?' })
  })
})

describe('boss themes', () => {
  it('slugs a boss name', () => {
    expect(themeSlug("Odi'ram")).toBe('odiram')
    expect(themeSlug('Nameless King')).toBe('namelessking')
    expect(themeSlug(undefined)).toBe('')
  })

  it('lists the main bosses, then the other saved themes', () => {
    expect(themeRows({ aethelric: 'Aethelric', firstdefier: 'Aethelric, phase 2', x: '' }).map((r) => r.join('='))).toEqual([
      'aethelric=Aethelric',
      'arachne=Arachne',
      'kernunos=Kernunos',
      'namelessking=Nameless King',
      "odiram=Odi'ram",
      'xibalba=Xibalba',
      "izatal=Izat'al",
      'firstdefier=Aethelric, phase 2',
      'x=x',
    ])
  })
})

describe('imported sounds', () => {
  it('matches a file by ability id or by the host id in its name', () => {
    expect(abilityForFile('Thorn Whip.mp3')).toBe('thorn_whip')
    expect(abilityForFile(`download-${ABILITY_SOUNDS.firebolt}.mp3`)).toBe('firebolt')
    expect(abilityForFile('nothing.wav')).toBeNull()
  })

  it('gives untyped downloads an audio type', () => {
    expect(audioDataUrl('data:audio/wav;base64,AA')).toBe('data:audio/wav;base64,AA')
    expect(audioDataUrl('data:application/octet-stream;base64,AA')).toBe('data:audio/mpeg;base64,AA')
  })

  it('status lines', () => {
    expect(importStatus(3, 0)).toBe('3 imported')
    expect(importStatus(3, 2)).toBe('3 imported, 2 failed')
    expect(importStatus(0, 1, 'unmatched/failed')).toBe('0 imported, 1 unmatched/failed')
  })
})
