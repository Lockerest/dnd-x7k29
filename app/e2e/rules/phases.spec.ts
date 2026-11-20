// Damage, phase gates (event and swap), swapping sheets, and building a chain of
// phase sheets with "+ Add next phase sheet".
import { expect, test, writesTo } from '../harness.ts'

const HERO = { c1: { name: 'Hero', hp: 100, maxHp: 100, mx: 1, my: 0 } }
const hit = (target: string, dmg: number) =>
  `applyDmg({e:false,id:"c1",o:chars.c1},{e:true,id:"${target}",o:enemies.${target}},${dmg},{label:"Test",heavy:false,rng:1})`

test.describe('applyDmg(): damage to enemies', () => {
  test('plain damage lowers HP, saves it and plays the hit scene', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Wolf', hp: 1000, max: 1000 } })
    await legacy.run(hit('a', 300))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('enemies.a.hp')).toBe(700)
    expect(writesTo(legacy.writes, 'PATCH', 'enemies/a')).toContainEqual(expect.objectContaining({ hp: 700, hv: 300 }))
    await expect.poll(() => writesTo(legacy.writes, 'POST', 'rolls')).toContainEqual(
      expect.objectContaining({ fx: expect.objectContaining({ o: 'hit', d: 300, a: 'c:c1', t: 'e:a' }) }),
    )
  })

  test('HP never goes below 0 without a next phase, even with swap-at-0 set', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Wolf', hp: 100, max: 1000, sw: 1 } })
    await legacy.run(hit('a', 500))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('enemies.a.hp')).toBe(0)
  })

  test('an event gate stops the hit exactly at the gate % and flags it', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Kernunos', hp: 600, max: 1000, pg: 50 } })
    await legacy.run(hit('a', 2000))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('[enemies.a.hp,enemies.a.gr]')).toEqual([500, 500])
  })

  test('a gate only triggers when the hit crosses it', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Kernunos', hp: 400, max: 1000, pg: 50 } })
    await legacy.run(hit('a', 100))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('[enemies.a.hp,enemies.a.gr]')).toEqual([300, undefined])
  })

  test('the gate rounds up (10% of 333 is 34)', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Kernunos', hp: 333, max: 333, pg: 10 } })
    await legacy.run(hit('a', 9999))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('enemies.a.hp')).toBe(34)
  })

  test('a swap gate hands over to the next sheet at the same HP after the hit scene', async ({ legacy }) => {
    await legacy.table(HERO, {
        a: { name: 'Aethelric', hp: 1000, max: 1000, pg: 75, nx: 'b', mx: 4, my: 5, mp: 'm' },
        b: { name: 'Aethelric (phase 2)', hp: 2000, max: 2000, pm: 40 },
      })
    await legacy.run(hit('a', 600))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('enemies.a.hp')).toBe(750)
    await expect.poll(() => legacy.run('enemies.b.mx'), { timeout: 5000 }).toBe(4)
    expect(await legacy.run('[enemies.b.hp,enemies.b.my,enemies.b.mp,enemies.b.po,enemies.a.mx==null,sel]')).toEqual([750, 5, 'm', 40, true, 'e:b'])
  })

  test('swap at 0 HP leaves phase 1 at 1 HP and starts the next sheet at full HP', async ({ legacy }) => {
    await legacy.table(HERO, {
        a: { name: 'King', hp: 100, max: 1000, sw: 1, nx: 'b', mx: 2, my: 2, mp: 'm' },
        b: { name: 'King on foot', hp: 1, max: 700 },
      })
    await legacy.run(hit('a', 5000))
    // The page refreshes from the database in the background; wait for the saved value.
    await expect.poll(() => legacy.run('enemies.a.hp')).toBe(1)
    await expect.poll(() => legacy.run('enemies.b.hp'), { timeout: 5000 }).toBe(700)
  })
})

test.describe('applyDmg(): damage to characters', () => {
  test('lowers HP and adds fatigue', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'Wolf', hp: 10, max: 10, mx: 0, my: 0 } })
    await legacy.run('applyDmg({e:true,id:"a",o:enemies.a},{e:false,id:"c1",o:chars.c1},30,{label:"Bite",heavy:false,rng:1})')
    await expect.poll(() => legacy.run('[chars.c1.hp,chars.c1.ft,chars.c1.maxHp]')).toEqual([70, 3, 97])
  })
})

test.describe('phaseGo(): switching to the next sheet', () => {
  test('moves the boss in the initiative order to the next sheet', async ({ legacy }) => {
    await legacy.table(HERO, {
        a: { name: 'Arachne', hp: 1, max: 900, nx: 'b', mx: 3, my: 3, mp: 'm' },
        b: { name: 'The Collector', hp: 1200, max: 1200 },
      })
    await legacy.run('ini={ph:"go",t:0,r:1,l:[{k:"e:a"},{k:"c:c1"}]};phaseGo("a",null)')
    expect(await legacy.run('ini.l.map(u=>u.k)')).toEqual(['e:b', 'c:c1'])
    expect(await legacy.run('enemies.b.hp')).toBe(1200)
    await expect.poll(() => writesTo(legacy.writes, 'PUT', 'init')).toContainEqual(expect.objectContaining({ l: [{ k: 'e:b' }, { k: 'c:c1' }] }))
  })
  test('keeps the next HP within 1 and the sheet max', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'A', hp: 1, max: 10, nx: 'b' }, b: { name: 'B', hp: 5, max: 50 } })
    expect(await legacy.run('(phaseGo("a",999),enemies.b.hp)')).toBe(50)
    expect(await legacy.run('(phaseGo("a",0),enemies.b.hp)')).toBe(1)
  })
  test('does nothing without a next sheet', async ({ legacy }) => {
    await legacy.table(HERO, { a: { name: 'A', hp: 1, max: 10, nx: 'gone' } })
    expect(await legacy.run('(phaseGo("a",5),Object.keys(enemies))')).toEqual(['a'])
  })
})

test.describe('"+ Add next phase sheet"', () => {
  const open = (id: string) => `eOpen.add("${id}");last="";render()`

  test('creates a linked copy at full HP with a 50% gate, copying the skills', async ({ legacy, page }) => {
    await legacy.table(HERO, {
        a: { name: 'Aethelric', type: 'boss', hp: 300, max: 1000, pm: 20, po: 0, mx: 1, my: 1, mp: 'm', sk: { s1: { n: "Warden's Cut", d: '2d8', r: 1, t: 's' } } },
      })
    await legacy.run('TH.firstdefier={data:""};' + open('a'))
    await page.locator('[data-a="phadd"][data-id="a"]').click()
    // Wait until the new sheet and the link to it are saved.
    await expect.poll(() => legacy.writes.filter((w) => /^enemies\/e[a-z0-9]{6}$/.test(w.path) || /^enemies\/[ab]$/.test(w.path)).length).toBeGreaterThanOrEqual(2)
    const r = await legacy.run<{ nx: string; pg: number; d: Record<string, unknown> }>('({nx:enemies.a.nx,pg:enemies.a.pg,d:enemies[enemies.a.nx]})')
    expect(r.pg).toBe(50)
    expect(r.d).toMatchObject({ name: 'Aethelric (phase 2)', hp: 1000, max: 1000, po: 20, th: 'firstdefier', sk: { s1: { n: "Warden's Cut" } } })
    expect(r.d).not.toHaveProperty('mx')
    expect(r.d).not.toHaveProperty('nx')
    await expect.poll(() => writesTo(legacy.writes, 'PUT', `enemies/${r.nx}`)).toHaveLength(1)
  })

  test('adds to the end of an existing chain and picks that phase’s theme', async ({ legacy, page }) => {
    await legacy.table(HERO, {
        a: { name: 'Kernunos', hp: 1000, max: 1000, nx: 'b', pg: 50 },
        b: { name: 'Kernunos (phase 2)', hp: 900, max: 900, pg: 10 },
      })
    await legacy.run('TH.rotarena={data:""};' + open('a'))
    await page.locator('[data-a="phadd"][data-id="a"]').click()
    // Wait until the new sheet and the link to it are saved.
    await expect.poll(() => legacy.writes.filter((w) => /^enemies\/e[a-z0-9]{6}$/.test(w.path) || /^enemies\/[ab]$/.test(w.path)).length).toBeGreaterThanOrEqual(2)
    const r = await legacy.run<{ a: string; b: Record<string, unknown>; n: Record<string, unknown> }>(
      '({a:enemies.a.nx,b:enemies.b,n:enemies[enemies.b.nx]})',
    )
    expect(r.a).toBe('b')
    expect(r.b.pg).toBe(10)
    expect(r.n).toMatchObject({ name: 'Kernunos (phase 3)', hp: 900, th: 'rotarena' })
  })

  test('leaves the theme empty when that track is not imported', async ({ legacy, page }) => {
    await legacy.table(HERO, { a: { name: 'Odi\'ram', hp: 10, max: 10 } })
    await legacy.run('delete TH.emberrage;' + open('a'))
    await page.locator('[data-a="phadd"][data-id="a"]').click()
    // Wait until the new sheet and the link to it are saved.
    await expect.poll(() => legacy.writes.filter((w) => /^enemies\/e[a-z0-9]{6}$/.test(w.path) || /^enemies\/[ab]$/.test(w.path)).length).toBeGreaterThanOrEqual(2)
    expect(await legacy.run('enemies[enemies.a.nx].th')).toBeUndefined()
  })
})
