// Attack kinds and elements, attack stats, reach, poise and stagger.
import { expect, test } from '../harness.ts'

test.describe('fxKind(): which effect and sound an attack uses', () => {
  const cases: [string, string, boolean, number][] = [
    ['bash', 'Shield Bash', false, 1],
    ['fire', 'Ember Burst', false, 4],
    ['fire', 'Firebolt', false, 6],
    ['ice', 'Frostbite Cleave', true, 2],
    ['bolt', 'Chain Lightning', false, 3],
    ['arrow', 'Piercing Shot', false, 6],
    ['poison', 'Venom Spit', false, 2],
    ['heavy', 'Heavy attack', true, 1],
    ['slash', 'Light attack', false, 1],
    ['arrow', 'Light attack', false, 3],
  ]
  for (const [kind, label, heavy, rng] of cases) {
    test(`"${label}" (heavy ${heavy}, range ${rng}) is ${kind}`, async ({ legacy }) => {
      expect(await legacy.run(`fxKind(${JSON.stringify(label)},${heavy},${rng})`)).toBe(kind)
    })
  }
  test('matching ignores case', async ({ legacy }) => {
    expect(await legacy.run('fxKind("THUNDER SLAM",false,1)')).toBe('bash')
    expect(await legacy.run('fxKind("thunder breath",false,1)')).toBe('bolt')
  })
})

test.describe('elemOf(): the element of a ranged attack', () => {
  test('returns elements only, never bash or arrow', async ({ legacy }) => {
    expect(await legacy.run('[elemOf("Ember Burst"),elemOf("Frost Arrow"),elemOf("Shield Bash"),elemOf("Triple Volley"),elemOf("")]')).toEqual([
      'fire',
      'ice',
      null,
      null,
      null,
    ])
  })
})

test.describe('isHeavy(): heavy hit reactions', () => {
  test('fighters are heavy unless the sheet overrides it', async ({ legacy }) => {
    expect(await legacy.run('[isHeavy({cls:"fighter"}),isHeavy({cls:"mage"}),isHeavy({cls:"fighter",ha:false}),isHeavy({ha:1}),isHeavy(null)]')).toEqual([
      true,
      false,
      false,
      true,
      false,
    ])
  })
})

test.describe('atkInfo(): attack stats', () => {
  test('enemy light and heavy attacks use the sheet dice, reach and bonus', async ({ legacy }) => {
    const [l, h] = await legacy.run<object[]>('[atkInfo({e:true,o:{dm:"2d6",er:2,ab:5}},"l"),atkInfo({e:true,o:{dm:"2d6",er:2,ab:5}},"h")]')
    expect(l).toEqual({ label: 'Light attack', rng: 2, dmg: '2d6', tb: 5, db: 0, cost: 0, po: 1 })
    expect(h).toEqual({ label: 'Heavy attack', rng: 2, dmg: '2d6+2d6', tb: 5, db: 0, cost: 0, po: 3, heavy: true })
  })
  test('enemy defaults are 1d8, reach 1 and +4', async ({ legacy }) => {
    expect(await legacy.run('atkInfo({e:true,o:{}},"l")')).toMatchObject({ dmg: '1d8', rng: 1, tb: 4 })
  })
  test('player attacks add proficiency and the class stat', async ({ legacy }) => {
    const r = await legacy.run<{ l: Record<string, unknown>; h: Record<string, unknown>; wr: number; st: string }>(
      'const c={cls:"fighter",level:5,str:16,dex:16,int:16};({l:atkInfo({e:false,o:c},"l"),h:atkInfo({e:false,o:c},"h"),wr:WR.fighter||1})',
    )
    // level 5: proficiency 3, a 16 in the class stat: +3
    expect(r.l).toEqual({ label: 'Light attack', rng: r.wr, dmg: '1d6', tb: 6, db: 3, cost: 0, cs: 0, po: 1 })
    expect(r.h).toEqual({ label: 'Heavy attack', rng: r.wr, dmg: '1d10', tb: 6, db: 3, cost: 1, cs: 10, po: 3, heavy: true })
  })
})

test.describe('gap() and adj(): distance on the grid', () => {
  const A = '{e:false,o:{mx:0,my:0}}'
  test('counts squares between edges, with a minimum of 1', async ({ legacy }) => {
    expect(await legacy.run(`gap(${A},{e:false,o:{mx:3,my:0}})`)).toBe(3)
    expect(await legacy.run(`gap(${A},{e:false,o:{mx:1,my:1}})`)).toBe(1)
    expect(await legacy.run(`gap(${A},{e:false,o:{mx:0,my:0}})`)).toBe(1)
  })
  test('large enemies are measured from their nearest edge', async ({ legacy }) => {
    expect(await legacy.run(`gap(${A},{e:true,o:{mx:3,my:0,sz:2}})`)).toBe(3)
    expect(await legacy.run(`gap(${A},{e:true,o:{mx:-2,my:-2,sz:3}})`)).toBe(1)
    expect(await legacy.run(`gap({e:true,o:{mx:0,my:0,sz:3}},{e:false,o:{mx:5,my:1}})`)).toBe(3)
  })
  test('adj() is true only for touching squares', async ({ legacy }) => {
    expect(await legacy.run(`[adj(${A},{e:false,o:{mx:1,my:1}}),adj(${A},{e:false,o:{mx:2,my:0}}),adj(${A},{e:true,o:{mx:-3,my:0,sz:3}})]`)).toEqual([
      true,
      false,
      true,
    ])
  })
})

test.describe('poiseHit() and tick(): stagger', () => {
  test('hits lower poise, and empty poise staggers', async ({ legacy }) => {
    await legacy.table({}, { a: { name: 'Golem', hp: 100, max: 100, pm: 30 } })
    expect(await legacy.run('(poiseHit("a",10),enemies.a.po)')).toBe(20)
    expect(await legacy.run('(poiseHit("a",25),[enemies.a.po,enemies.a.stun,enemies.a.sg])')).toEqual([0, true, true])
  })
  test('a staggered enemy takes no more poise damage', async ({ legacy }) => {
    await legacy.table({}, { a: { name: 'Golem', hp: 100, max: 100, pm: 30, po: 0, stun: true } })
    expect(await legacy.run('(poiseHit("a",10),enemies.a.po)')).toBe(0)
  })
  test('enemies without poise are never staggered', async ({ legacy }) => {
    await legacy.table({}, { a: { name: 'Rat', hp: 10, max: 10, pm: 0 } })
    expect(await legacy.run('(poiseHit("a",99),[enemies.a.po,!!enemies.a.stun])')).toEqual([undefined, false])
  })
  test('the next round clears the stagger and refills poise', async ({ legacy }) => {
    await legacy.table({}, { a: { name: 'Golem', hp: 100, max: 100, pm: 30, po: 0, stun: true, sg: true } })
    expect(await legacy.run('(tick(),[enemies.a.stun,enemies.a.sg,enemies.a.po])')).toEqual([false, false, 30])
  })
})
