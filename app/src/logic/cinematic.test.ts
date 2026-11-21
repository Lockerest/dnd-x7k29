import { describe, expect, it } from 'vitest'
import { AETHELRIC_75 } from '../data/cinematics'
import { cinematicSeconds, parseCinematic, unknownTags, videoUrl } from './cinematic'

describe('parseCinematic', () => {
  it('one beat per line with its tags', () => {
    const b = parseCinematic('[flash] The cave trembles\n\n  [big][shake] ENOUGH  ')
    expect(b.map((x) => [x.tags, x.text])).toEqual([
      [{ flash: 1 }, 'The cave trembles'],
      [{ big: 1, shake: 1 }, 'ENOUGH'],
    ])
  })
  it('tags are case-insensitive and can carry a number', () => expect(parseCinematic('[SHAKE][Wait=2.5] Hold')[0]!.tags).toEqual({ shake: 1, wait: 2.5 }))
  it('timing: text holds 2.3 s minimum, longer text longer, tag-only beats 1.2 s, [wait=N] N s', () => {
    const b = parseCinematic(`Hi\n${'x'.repeat(40)}\n[black]\n[wait=3] Hold`)
    expect(b.map((x) => x.duration)).toEqual([2300, 1100 + 40 * 55, 1200, 3000])
    expect(b.map((x) => x.at)).toEqual([0.6, 2300.6, 2300.6 + 3300, 2300.6 + 3300 + 1200])
  })
  it('[wait] without a number is 1 s, [wait=0] uses the normal timing', () => {
    expect(parseCinematic('[wait] A')[0]!.duration).toBe(1000)
    expect(parseCinematic('[wait=0] A')[0]!.duration).toBe(2300)
  })
  it('ignores empty scripts and cuts at 1200 characters', () => {
    expect(parseCinematic(undefined)).toEqual([])
    expect(parseCinematic('a'.repeat(5000))[0]!.text).toHaveLength(1200)
  })
})

describe('cinematicSeconds', () => {
  it('at least 6 s', () => {
    expect(cinematicSeconds([])).toBe(6)
    expect(cinematicSeconds(parseCinematic('Hi'))).toBe(6)
  })
  it('end of the last beat + 1.8 s', () => expect(cinematicSeconds(parseCinematic('[wait=12] Hold'))).toBeCloseTo(12.0006 + 1.8, 6))
})

describe('videoUrl', () => {
  it('a web address, trimmed; anything else is no video', () => {
    expect(videoUrl(' https://cdn.x.co/a.mp4 ')).toBe('https://cdn.x.co/a.mp4')
    expect(videoUrl('http://x.co/a')).toBe('http://x.co/a')
    for (const u of ['', null, undefined, 'javascript:alert(1)', 'https://x.co/a b', 'x.mp4']) expect(videoUrl(u)).toBeNull()
  })
})

describe('unknownTags', () => {
  it('finds typos once', () => expect(unknownTags('[glwo] a\n[glwo][flash] b\n[Wait=2] c')).toEqual(['glwo']))
  it('the Aethelric preset is clean', () => {
    expect(unknownTags(AETHELRIC_75)).toEqual([])
    expect(parseCinematic(AETHELRIC_75).length).toBeGreaterThan(5)
  })
})
