// The map drawing is compared with the live page's own drawing in
// e2e/parity/table.parity.spec.ts; these tests check each part is drawn when it should be.
import { describe, expect, it } from 'vitest'
import type { MapData } from '../../logic/geometry'
import type { Sheet } from '../../logic/sheet'
import { grid } from '../../logic/table'
import type { Enemy } from '../../logic/types'
import { esc, mapSvg, type MapPicture } from './mapSvg'

const M: MapData = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const pic = (o: Partial<MapPicture> & { map?: MapData } = {}): string => {
  const { map = M, ...rest } = o
  return mapSvg({ g: grid({ m: map }, 'm')!, image: 'data:map', chars: {}, enemies: {}, dm: false, selected: null, combat: false, icons: {}, markers: {}, now: 10_000, ...rest })
}
const count = (s: string, part: string) => s.split(part).length - 1

it('escapes like the live page', () => {
  expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  expect(esc(null)).toBe('')
})

describe('the map', () => {
  it('picture, hatch pattern, and the grid (unless turned off)', () => {
    const s = pic()
    expect(s).toContain('<image href="data:map" width="500" height="400"/>')
    expect(s).toContain('M0 0V400')
    expect(pic({ map: { ...M, grid: false } })).not.toContain('M0 0V400')
  })

  it('danger zones: pulsing squares in their colour (an odd colour falls back to gold)', () => {
    const s = pic({ map: { ...M, dz: { a: { x: 1, y: 2, s: 2, c: '#ff6a1a' }, b: { x: 0, y: 0, s: 1, c: 'red;x' } } } as MapData })
    expect(count(s, 'class="dz"')).toBe(2)
    expect(s).toContain('x="50" y="100" width="100" height="100" style="fill:#ff6a1a')
    expect(s).toContain('fill:#f5c542')
    expect(pic()).not.toContain('class="dz"')
  })

  it('walls, wall edges, and doors (square or line, open or closed)', () => {
    const s = pic({
      map: { ...M, walls: ['1,1'], ew: ['h,2,2', 'v,3,3'], dr: { a: { c: '4,4' }, b: { c: '5,5', o: 1 }, c: { a: [1, 1], b: [2, 1] }, d: { a: [1, 2], b: [2, 2], o: 1 } } as MapData['dr'] },
    })
    expect(s).toContain('<rect x="50" y="50" width="50" height="50" style="fill:url(#hatch)')
    expect(s).toContain('M100 100H150M150 150V200')
    expect(s).toContain('fill:#e8c26a') // closed door handle
    expect(s).toContain('stroke-dasharray:6 6') // open doors
    expect(s).toContain('M50 50L100 50') // line door
    expect(pic()).not.toContain('stroke-linecap:round')
  })

  it('altars, bonfires and guilds, or the custom pictures', () => {
    const map = { ...M, al: ['1,1'], bf: { a: '2,2' }, gd: ['3,3'] }
    const s = pic({ map })
    expect(s).toContain('fill:#ffd866')
    expect(s).toContain('🔥')
    expect(s).toContain('🍺')
    const c = pic({ map, markers: { al: 'data:al', bf: 'data:bf', gd: 'data:gd' } })
    expect(count(c, '<image href="data:')).toBe(4)
    expect(c).not.toContain('🔥')
  })

  it('pins (hidden from players in the fog), the entry flag for the GM, and the fog', () => {
    const map = { ...M, pn: { a: { x: 1.5, y: 1.5, l: 'Gate <b>' }, b: { x: 5.5, y: 5.5 } }, en: [2.5, 2.5], fog: 1, fg: '1'.repeat(30) }
    const pl = pic({ map })
    expect(pl).toContain('Gate &lt;b&gt;')
    expect(count(pl, '📍')).toBe(1)
    expect(pl).not.toContain('🚩')
    expect(pl).toContain('fill-opacity:1"')
    const gm = pic({ map, dm: true })
    expect(count(gm, '📍')).toBe(2)
    expect(gm).toContain('🚩')
    expect(gm).toContain('fill-opacity:0.55')
  })
})

describe('tokens', () => {
  const chars: Record<string, Sheet> = {
    a: { name: 'Lyra', hp: 10, mx: 1, my: 1, iv: 1 },
    b: { name: '', hp: 10, mx: 2, my: 2, exh: true },
    c: { name: 'Dead hero with a long name', hp: 0, mx: 3, my: 3 },
    d: { name: 'Rider', hp: 10, mx: 6, my: 6, mt: 'climb', mon: 'w', iv: 1 },
    e: { name: 'Rider two', hp: 10, mt: 'climb', mon: 'w' },
    f: { name: 'Waiting', hp: 10, mx: 0, my: 0, ap: false },
    g: { name: 'Elsewhere', hp: 10, mx: 0, my: 1, mp: 'n' },
    h: { name: 'Unplaced', hp: 10 },
  }
  const enemies: Record<string, Enemy> = {
    w: { name: 'Wolf', hp: 10, mx: 6, my: 6, sz: 2, stun: true, ht: 9000, hv: 25 },
    x: { name: 'Imp', hp: 10, mx: 1, my: 1, hd: 'c:a', iv: 1 },
    y: { name: 'Bones', hp: 0, mx: 8, my: 1, sz: 2 },
    z: { name: 'Hidden', hp: 10, mx: 9, my: 7 },
    q: { hp: 10, mx: 4, my: 6, ht: 9000 },
  }
  it('heroes, monsters, tombstones, pictures, effects, riders and hits', () => {
    const s = pic({ chars, enemies, icons: { a: 'data:a', d: 'data:d', x: 'data:x' }, dm: true })
    expect(s).toContain('clip-path="url(#cpa)"')
    expect(s).toContain('clip-path="url(#cpx)"') // carried monster drawn first
    expect(s).toContain('>?</text>') // no name
    expect(s).toContain('Dead hero with') // tombstone label, cut to 14 letters
    expect(s).not.toContain('Dead hero with a')
    expect(count(s, '✝')).toBe(2)
    expect(count(s, '★')).toBe(3) // stunned wolf
    expect(count(s, '▼')).toBe(3) // exhausted hero
    expect(s).toContain('clip-path="url(#rbd)"') // rider with a picture
    expect(s).toContain('>R</text>') // rider without one
    expect(s).toContain('-25<animate') // hit number
    expect(s).toContain('>-<animate') // hit without a number
    expect(s).not.toContain('Waiting')
    expect(s).not.toContain('>E</text>')
  })

  it('players do not see monsters hidden in the fog; old hits do not flash', () => {
    const fog = { ...M, fog: 1 }
    const s = pic({ map: fog, chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 } }, enemies, now: 99_999 })
    expect(s).not.toContain('>H</text>')
    expect(s).not.toContain('<animate attributeName="opacity" values=".65;0"')
    expect(pic({ map: fog, chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 } }, enemies, dm: true })).toContain('>H</text>')
  })

  it('the selected token is ringed white', () => {
    expect(pic({ chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 } }, selected: 'c:a' })).toContain('stroke:#fff;stroke-width:5"')
    expect(pic({ chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 } } })).toContain('stroke:#000;stroke-width:5"')
  })
})

describe('reach squares', () => {
  const hero = { name: 'Lyra', hp: 5, mx: 0, my: 0, st: 15, spd: 2 } as Sheet
  it("a hero's squares: green, or amber in combat when it would exhaust them", () => {
    const calm = pic({ chars: { a: hero }, selected: 'c:a' })
    expect(count(calm, 'fill:var(--st);fill-opacity:.35')).toBe(8)
    const fight = pic({ chars: { a: hero }, selected: 'c:a', combat: true })
    expect(count(fight, 'fill:var(--st);fill-opacity:.35')).toBe(3)
    expect(count(fight, 'fill:var(--ac);fill-opacity:.35')).toBe(5)
    expect(count(pic({ chars: { a: { ...hero, exh: true } }, selected: 'c:a', combat: true }), 'fill:var(--ac);fill-opacity:.35')).toBe(0)
  })
  it("a monster's squares are red; nothing for unplaced or unknown units", () => {
    expect(count(pic({ enemies: { w: { name: 'W', hp: 3, mx: 0, my: 0, spd: 1 } as Enemy }, selected: 'e:w', dm: true }), 'fill:var(--hp);fill-opacity:.35')).toBe(3)
    expect(pic({ chars: { a: { ...hero, mx: null } }, selected: 'c:a' })).not.toContain('fill-opacity:.35')
    expect(pic({ enemies: { w: { name: 'W', hp: 3 } }, selected: 'e:w' })).not.toContain('fill-opacity:.35')
    expect(pic({ selected: 'c:gone' })).not.toContain('fill-opacity:.35')
  })
})

it('nameless tombstones and riders, and a monster tombstone without a size', () => {
  const s = mapSvg({
    g: grid({ m: M }, 'm')!,
    image: 'data:map',
    chars: { a: { hp: 0, mx: 1, my: 1 }, r: { hp: 5, mt: 'climb', mon: 'w', mx: 3, my: 3 } },
    enemies: { w: { name: 'W', hp: 5, mx: 3, my: 3 }, d: { hp: 0, mx: 5, my: 5 } },
    dm: true,
    selected: null,
    combat: false,
    icons: {},
    markers: {},
    now: 0,
  })
  expect(count(s, '✝')).toBe(2)
  expect(s).toContain('>?</text>') // the nameless rider
})
