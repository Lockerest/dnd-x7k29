// Boss skill-set presets and using enemy skills (damaging and utility).
import { expect, test, writesTo } from '../harness.ts'

type Row = [string, string, number, string]

test.describe('SKP: skill-set presets', () => {
  test('has the 8 boss sets', async ({ legacy }) => {
    expect(await legacy.run('Object.keys(SKP).length')).toBe(8)
  })

  test('every skill has a name, valid dice or a utility marker, a range and a target', async ({ legacy }) => {
    const sets = await legacy.run<Record<string, Row[]>>('SKP')
    const dice = await legacy.run<Record<string, number>>(
      `Object.fromEntries(Object.values(SKP).flat().map(r=>[r[1],parseD(r[1]).length]))`,
    )
    for (const [set, rows] of Object.entries(sets)) {
      expect(rows.length, set).toBeGreaterThan(0)
      const names = rows.map((r) => r[0])
      expect(new Set(names).size, `${set} has duplicate names`).toBe(names.length)
      for (const [name, d, range, target] of rows) {
        expect(name.trim(), set).not.toBe('')
        expect(['0', '-', 'none'].includes(d) || dice[d]! > 0, `${set} / ${name}: dice "${d}"`).toBe(true)
        expect(range, `${set} / ${name}: range`).toBeGreaterThanOrEqual(1)
        expect(['s', 'a'], `${set} / ${name}: target`).toContain(target)
      }
    }
  })

  test("Aethelric's first encounter only has his three cave moves", async ({ legacy }) => {
    expect(await legacy.run('SKP["Aethelric: first encounter (3)"].map(r=>r[0])')).toEqual(["Warden's Cut", 'Rime Guard', 'Chain Pull'])
  })

  test('each "phase 1 (all)" set includes the whole first encounter', async ({ legacy }) => {
    const r = await legacy.run<string[]>(
      'SKP["Aethelric: first encounter (3)"].map(r=>r[0]).filter(n=>!SKP["Aethelric: phase 1 (all)"].some(x=>x[0]===n))',
    )
    expect(r).toEqual([])
  })

  test('loading a preset adds its skills, keeps existing ones and skips names already there', async ({ legacy, page }) => {
    await legacy.table({}, {
      a: { name: 'Arachne', hp: 10, max: 10, sk: { old: { n: 'New skill', d: '2d6', r: 1, t: 's' }, dup: { n: 'Silk Snare', d: '9d9', r: 1, t: 's' } } },
    })
    await legacy.run('eOpen.add("a");last="";render()')
    await page.locator('[data-skp="a"]').selectOption('Arachne: phase 1 (all)')
    await expect.poll(() => writesTo(legacy.writes, 'PUT', 'enemies/a/sk').length).toBe(1)
    const saved = writesTo(legacy.writes, 'PUT', 'enemies/a/sk').at(-1) as Record<string, { n: string; d: string }>
    const preset = await legacy.run<string[]>('SKP["Arachne: phase 1 (all)"].map(r=>r[0])')
    const names = Object.values(saved).map((s) => s.n)
    // A "New skill" row made with "+ Add skill" stays until you rename or delete it.
    expect(names).toContain('New skill')
    for (const n of preset) expect(names.filter((x) => x === n), n).toHaveLength(1)
    if (preset.includes('Silk Snare')) expect(Object.values(saved).find((s) => s.n === 'Silk Snare')?.d).toBe('9d9')
    expect(names).toHaveLength(new Set([...preset, 'New skill', 'Silk Snare']).size)
  })

  test('loading the same preset twice adds nothing', async ({ legacy, page }) => {
    await legacy.table({}, { a: { name: 'Aethelric', hp: 10, max: 10 } })
    await legacy.run('eOpen.add("a");last="";render()')
    await page.locator('[data-skp="a"]').selectOption('Aethelric: first encounter (3)')
    await expect.poll(() => writesTo(legacy.writes, 'PUT', 'enemies/a/sk').length).toBe(1)
    await page.locator('[data-skp="a"]').selectOption('Aethelric: first encounter (3)')
    await expect.poll(() => writesTo(legacy.writes, 'PUT', 'enemies/a/sk').length).toBe(2)
    const saves = writesTo(legacy.writes, 'PUT', 'enemies/a/sk') as Record<string, unknown>[]
    expect(saves.map((s) => Object.keys(s).length)).toEqual([3, 3])
  })
})

test.describe('using an enemy skill (doAct "sk")', () => {
  const setup = async (legacy: { table: (c: object, e: object) => Promise<void>; run: (x: string) => Promise<unknown> }, sk: object, heroAt: [number, number]) => {
    await legacy.table(
      { c1: { name: 'Hero', hp: 100, maxHp: 100, mx: heroAt[0], my: heroAt[1] } },
      { a: { name: 'Aethelric', hp: 1000, max: 1000, mx: 0, my: 0, sk: { s1: sk } } },
    )
    await legacy.run('menu={a:"e:a",t:"c:c1"}')
  }

  test('a utility skill ("0" damage) plays its scene with no damage', async ({ legacy }) => {
    await setup(legacy, { n: 'Rime Guard', d: '0', r: 1, t: 's' }, [1, 0])
    await legacy.run('doAct("sk","s1")')
    expect(await legacy.run('chars.c1.hp')).toBe(100)
    await expect.poll(() => writesTo(legacy.writes, 'POST', 'rolls')).toContainEqual(
      expect.objectContaining({ fx: expect.objectContaining({ l: 'Rime Guard', d: 0, t: 'c:c1' }) }),
    )
    expect(writesTo(legacy.writes, 'PATCH', 'chars/c1')).toEqual([])
  })

  for (const d of ['-', 'none', ' NONE ']) {
    test(`"${d}" is a utility marker too: a hit scene with 0 damage, never an attack roll`, async ({ legacy }) => {
      await setup(legacy, { n: 'Taunt', d, r: 1, t: 's' }, [1, 0])
      await legacy.run('doAct("sk","s1")')
      await expect
        .poll(() => writesTo(legacy.writes, 'POST', 'rolls'))
        .toContainEqual(expect.objectContaining({ fx: expect.objectContaining({ l: 'Taunt', o: 'hit', d: 0 }) }))
      expect(writesTo(legacy.writes, 'POST', 'rolls')).toContainEqual(expect.objectContaining({ ev: 'Aethelric uses Taunt on Hero.' }))
      expect(await legacy.run('chars.c1.hp')).toBe(100)
    })
  }

  test('an area utility skill picks a hero within its range', async ({ legacy }) => {
    await setup(legacy, { n: 'Frost Aura', d: '0', r: 3, t: 'a' }, [3, 0])
    await legacy.run('doAct("sk","s1")')
    await expect.poll(() => writesTo(legacy.writes, 'POST', 'rolls')).toContainEqual(expect.objectContaining({ fx: expect.objectContaining({ l: 'Frost Aura', d: 0 }) }))
  })

  test('skills out of range are refused with a message', async ({ legacy, page }) => {
    await setup(legacy, { n: 'Rime Guard', d: '0', r: 1, t: 's' }, [5, 0])
    await legacy.run('doAct("sk","s1")')
    await expect(page.locator('#err')).toHaveText('Out of range: Rime Guard reaches 1 square(s).')
    expect(writesTo(legacy.writes, 'POST', 'rolls')).toEqual([])
  })

  test('a damaging skill out of range is refused too', async ({ legacy, page }) => {
    await setup(legacy, { n: 'Chain Pull', d: '2d8', r: 3, t: 's' }, [6, 0])
    await legacy.run('doAct("sk","s1")')
    await expect(page.locator('#err')).toHaveText('Out of range: Chain Pull reaches 3 square(s).')
  })
})
