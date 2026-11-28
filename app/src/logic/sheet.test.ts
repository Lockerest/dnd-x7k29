import { describe, expect, it } from 'vitest'
import { COMMON_ABILITIES, PARRY } from '../data/abilities'
import { attunedSet, boardIndex, boardOrDefault, DEFAULT_SPOILERS, defaultBoard, equippedIds, goldenHidden, parryMode, sheetAbilities, slotsOf, spoilerList, type Board, spoilerParts, upgradeBoard, upgradeEquip } from './board'
import { altarsOf, blocked, bonfiresOf, geometry, lineOfSight, nearSpot, revealAround, waveCenter } from './geometry'
import {
  abilityLocked,
  altarRest,
  attunedKeys,
  bonfireRest,
  characterPills,
  cleanses,
  cycleParry,
  dismount,
  drinkFlask,
  fieldValue,
  healAmount,
  hpChange,
  isMyTurn,
  netRegen,
  releaseAttunement,
  respawnPatches,
  revive,
  signed,
  staminaChange,
  toggleArmor,
  toggleFoeDown,
  toggleShield,
  turnKey,
  payForAbility,
  type Sheet,
} from './sheet'

describe('ability board', () => {
  it('boards and heroes saved with Pilfer read it as Garrote (Thief became Assassin)', () => {
    const old: Board = { thief_backstab: defaultBoard().thief_backstab!, thief_pilfer: { n: 'Pilfer', v: 'thief', l: 1 } }
    const b = boardOrDefault(old)
    expect(Object.keys(b)).toEqual(['thief_backstab', 'thief_garrote'])
    expect(upgradeBoard({ ...old, thief_garrote: { n: 'Mine' } })).toEqual({ thief_backstab: old.thief_backstab, thief_garrote: { n: 'Mine' } })
    expect(upgradeBoard(b)).toBe(b)
    const c = { name: 'Vex', cls: 'thief', level: 1, eq: { _: true, thief_pilfer: true } }
    expect(equippedIds(c, b, false)).toEqual(['thief_garrote'])
    expect(upgradeEquip(c.eq)).toEqual({ _: true, thief_garrote: true })
    expect([upgradeEquip(null), upgradeEquip('x'), upgradeEquip({ _: true, a: true })]).toEqual([null, null, null])
  })

  it('the default board has three abilities per class plus the extras, with kinds filled in', () => {
    const b = defaultBoard()
    expect(Object.keys(b)).toHaveLength(31 + 8) // 31 class abilities
    expect(b.fighter_power_strike).toEqual({ n: 'Power Strike', c: 2, l: 1, v: 'fighter', k: 'atk', d: '2d8', r: 1, a: 0, b: '', t: '+1d8 damage on a hit' })
    expect(b.fighter_shield_bash).toMatchObject({ k: 'atk', a: 1 })
    expect(b.fighter_second_wind).toMatchObject({ k: 'heal', d: '1d10', b: 'level' })
    expect(b.mage_mending_light).toMatchObject({ k: 'heal', b: 'int' })
    expect(b.thief_garrote).toMatchObject({ k: 'check', b: 'dex' })
    expect(b.mage_fireball).toMatchObject({ l: 3, k: 'atk', d: '8d6', a: 1 })
    expect(Object.values(b).some((e) => e.k === 'util')).toBe(true)
  })

  it('uses the saved board when it has entries', () => {
    const b: Board = { x: { n: 'X' } }
    expect(boardOrDefault(b)).toBe(b)
    expect(Object.keys(boardOrDefault({}))).toHaveLength(39)
    expect(Object.keys(boardOrDefault(null))).toHaveLength(39)
  })

  it('indexes attacks, heals, checks and HP costs by name', () => {
    const ix = boardIndex({
      a: { n: 'Cut', k: 'atk', r: '3', d: '2d6', a: 1, hc: 10 },
      b: { n: 'Poke', k: 'atk' },
      c: { n: 'Mend', k: 'heal', d: '1d4', b: 'int' },
      d: { n: 'Pray', k: 'heal' },
      e: { n: 'Sneak', k: 'check', b: 'wis' },
      f: { n: 'Pick', k: 'check' },
      g: { n: 'Wait', k: 'util', hc: 0 },
      h: { n: '' },
      i: null as unknown as Board[string],
    })
    expect(ix).toEqual({
      attack: { Cut: { r: 3, d: '2d6', t: 1 }, Poke: { r: 1, d: '1d6', t: 0 } },
      heal: { Mend: { d: '1d4', b: 'int' }, Pray: { d: '1d6', b: '' } },
      check: { Sneak: { b: 'wis' }, Pick: { b: 'dex' } },
      hpCost: { Cut: 10 },
    })
  })

  it('spoilers: default list, none, or the GM list; Golden hidden from players only', () => {
    expect(spoilerList(null)).toEqual(DEFAULT_SPOILERS.split(','))
    expect(spoilerList('-')).toEqual([])
    expect(spoilerList(' Golden , ,altar')).toEqual(['golden', 'altar'])
    expect(goldenHidden(false, null)).toBe(true)
    expect(goldenHidden(true, null)).toBe(false)
    expect(goldenHidden(false, '-')).toBe(false)
  })

  const board: Board = {
    a1: { n: 'Any 1', v: 'any', l: 1, c: 1 },
    f2: { n: 'Fighter 2', v: 'fighter', l: 2, c: '2' },
    f1: { n: 'Fighter 1', v: 'fighter', c: 0 },
    m1: { n: 'Mage 1', v: 'mage', l: 1 },
    g: { n: 'Fighter 2 (Golden)', v: 'fighter', l: 2, gb: 'f2', c: 3, t: 'Shiny' },
    g0: { n: 'Lonely (Golden)', v: 'fighter', l: 9, gb: 'nope' },
  }

  it('slots grow with level up to 6', () => {
    expect(slotsOf({})).toBe(3)
    expect(slotsOf({ level: 3 })).toBe(5)
    expect(slotsOf({ level: 9 })).toBe(6)
  })

  it('equipped: chosen keys, or the first unlocked for the class; Golden needs its base', () => {
    expect(equippedIds({ cls: 'fighter', level: 1 }, board, false)).toEqual(['a1', 'f1'])
    expect(equippedIds({ cls: 'fighter', level: 2 }, board, false)).toEqual(['a1', 'f1', 'f2', 'g'])
    expect(equippedIds({ cls: 'fighter', level: 2 }, board, true)).toEqual(['a1', 'f1', 'f2'])
    expect(equippedIds({ cls: 'mage' }, board, false)).toEqual(['a1', 'm1'])
    expect(equippedIds({ cls: 'fighter', eq: { g: 1, gone: 1 } }, board, false)).toEqual([])
    expect(equippedIds({ cls: 'fighter', eq: { g: 1, f2: 1, g0: 1 } }, board, false)).toEqual(['g', 'f2'])
  })

  it('attuned Golden abilities, up to the attunement count', () => {
    expect(attunedSet({ at: { g: 1, g0: 1, f2: 1, gone: 1 }, atn: 1 }, board)).toEqual(['g'])
    expect(attunedSet({ at: { g: 1, g0: 1 }, atn: 5 }, board)).toEqual(['g', 'g0'])
    expect(attunedSet({ at: { g: 1 } }, board)).toEqual([])
    expect(attunedSet({}, board)).toEqual([])
  })

  it('parry: never, shield, GM setting, then class', () => {
    expect(parryMode(null)).toBe('')
    expect(parryMode({ pw: 'x', shield: true })).toBe('')
    expect(parryMode({ shield: true, cls: 'mage' })).toBe('n')
    expect(parryMode({ pw: 'd', cls: 'fighter' })).toBe('d')
    expect(parryMode({ pw: 'n', cls: 'mage' })).toBe('n')
    expect(parryMode({ cls: 'trickster' })).toBe('n')
    expect(parryMode({ cls: 'archer' })).toBe('')
  })

  it('the sheet lists Dodge Roll, Parry when allowed, then equipped abilities', () => {
    expect(sheetAbilities({ cls: 'mage' }, board, false)).toEqual([...COMMON_ABILITIES, ['Any 1', 1, '', ''], ['Mage 1', 0, '', '']])
    expect(sheetAbilities({ cls: 'fighter', level: 2 }, board, false)).toEqual([
      ...COMMON_ABILITIES,
      PARRY,
      ['Any 1', 1, '', ''],
      ['Fighter 1', 0, '', ''],
      ['Fighter 2', 2, '', ''],
      ['Fighter 2 (Golden)', 3, 'Shiny', ''],
    ])
  })
})

describe('map geometry', () => {
  const m = { w: 500, h: 520, cols: 10, fog: 1 }

  it('grid size, walls and edges, with open doors letting you through', () => {
    const g = geometry({ ...m, walls: { a: '1,1' }, ew: ['v,2,2'], dr: { d: { c: '5,5', e: { x: 'h,3,3' } }, o: { c: '6,6', o: 1, e: ['h,7,7'] }, n: {} } })
    expect(g).toMatchObject({ cols: 10, rows: 10 })
    expect([...g.walls]).toEqual(['1,1', '5,5'])
    expect([...g.edges]).toEqual(['v,2,2', 'h,3,3'])
    expect(geometry({ w: 240, h: 240 })).toMatchObject({ cols: 24, rows: 24 })
  })

  it('wall edges block straight and diagonal steps', () => {
    const g = geometry({ ...m, ew: ['v,3,2', 'h,2,3'] })
    expect(blocked(geometry(m), 2, 2, 1, 0)).toBe(false)
    expect(blocked(g, 2, 2, 1, 0)).toBe(true)
    expect(blocked(g, 3, 2, -1, 0)).toBe(true)
    expect(blocked(g, 2, 2, 0, 1)).toBe(true)
    expect(blocked(g, 2, 3, 0, -1)).toBe(true)
    expect(blocked(g, 2, 2, 0, -1)).toBe(false)
    expect(blocked(g, 2, 2, 1, 1)).toBe(true)
    expect(blocked(g, 5, 5, -1, -1)).toBe(false)
    expect(blocked(geometry({ ...m, ew: ['v,3,3'] }), 2, 2, 1, 1)).toBe(true)
    expect(blocked(geometry({ ...m, ew: ['h,3,3'] }), 2, 2, 1, 1)).toBe(true)
  })

  it('line of sight stops at walls (but sees the wall itself)', () => {
    const g = geometry({ ...m, walls: ['3,0'], ew: ['v,6,0'] })
    expect(lineOfSight(g, 0, 0, 2, 0)).toBe(true)
    expect(lineOfSight(g, 0, 0, 3, 0)).toBe(true)
    expect(lineOfSight(g, 0, 0, 4, 0)).toBe(false)
    expect(lineOfSight(g, 5, 0, 7, 0)).toBe(false)
    expect(lineOfSight(g, 2, 2, 2, 2)).toBe(true)
  })

  it('reveals what a hero sees within 4 squares, keeping what was already seen', () => {
    expect(revealAround({ ...m, fog: 0 }, 0, 0)).toBeNull()
    const fg = revealAround({ ...m, fg: '0000000001' }, 0, 0)!
    expect(fg).toHaveLength(100)
    expect(fg.slice(0, 10)).toBe('1111100001')
    expect(fg[4 * 10 + 4]).toBe('0') // farther than 4 squares
    expect(fg[9 * 10]).toBe('0')
    const walled = revealAround({ ...m, walls: ['2,0'] }, 0, 0)!
    expect(walled.slice(0, 5)).toBe('11100')
    expect(revealAround({ ...m, w: 100, h: 100, cols: 2 }, 1, 1)).toBe('1111')
  })

  it('altars, bonfires and standing next to one', () => {
    const map = { al: { a: '1,1' }, bf: ['5,5'] }
    expect(altarsOf(map)).toEqual(['1,1'])
    expect(bonfiresOf(map)).toEqual(['5,5'])
    expect(altarsOf(null)).toEqual([])
    expect(bonfiresOf(undefined)).toEqual([])
    expect(altarsOf({})).toEqual([])
    expect(nearSpot({ mx: 2, my: 2 }, ['5,5', '1,1'])).toBe('1,1')
    expect(nearSpot({ mx: 3, my: 1 }, ['1,1'])).toBeNull()
    expect(nearSpot({ mx: null }, ['1,1'])).toBeNull()
    expect(nearSpot(null, ['1,1'])).toBeNull()
  })

  it('the Golden Wave starts on the altar, or the middle of the map', () => {
    expect(waveCenter(m, '2,3')).toEqual({ x: 2.5, y: 3.5 })
    expect(waveCenter(m, null)).toEqual({ x: 5, y: 5 })
    expect(waveCenter(null, null)).toEqual({ x: 0, y: 0 })
  })
})

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'archer', hp: 60, maxHp: 100, st: 50, maxSt: 120, rg: 15, fl: 2, maxFl: 4, ...o })

describe('sheet buttons', () => {
  it('status labels, with the bad ones marked', () => {
    expect(characterPills(hero())).toEqual([])
    const all = characterPills(hero({ mt: 'climb', exh: true, stn: true, ddg: true, pry: true, chg: 'Meteor', ctr: true, hp: 0, dth: 2, ft: 3, pr: true, conds: 'Poisoned' }))
    expect(all.map((p) => p.text)).toEqual([
      'Mounted: -40 St/round',
      'Exhausted · 2 rd',
      'Stunned',
      'Dodging',
      'Parrying',
      'Charging Meteor',
      'Counter ready',
      'Dead',
      'Curse x2 · stamina +30% · max HP -20% · rest at a DIFFERENT altar to cleanse',
      'Fatigue · max HP -3% · rest at a bonfire or altar to clear',
      'Prone',
      'Poisoned',
    ])
    expect(all.filter((p) => p.bad).map((p) => p.text)).toEqual(['Exhausted · 2 rd', 'Stunned', 'Dead', 'Prone'])
    expect(characterPills(hero({ mt: 'down', exh: true, exn: 3 })).map((p) => p.text)).toEqual(['On a downed foe', 'Exhausted · 3 rd'])
  })

  it('HP, stamina and flasks', () => {
    expect(signed(5)).toBe('+5')
    expect(signed(0)).toBe('+0')
    expect(signed(-5)).toBe('-5')
    expect(hpChange(hero(), 50)).toEqual([{ hp: 100 }, 'Healed 50'])
    expect(hpChange(hero(), -70)).toEqual([{ hp: 0 }, 'Took 70'])
    expect(staminaChange(hero(), 100)).toEqual([{ st: 120 }])
    expect(drinkFlask(hero())).toEqual([{ fl: 1, hp: 100 }, 'Drank a flask (+40 HP)'])
    expect(drinkFlask(hero({ fl: 0 }))).toBeNull()
    expect(drinkFlask(hero({ fl: undefined }))).toBeNull()
    expect(netRegen(hero())).toBe(15)
    expect(netRegen(hero({ mt: 'climb' }))).toBe(-25)
    expect(netRegen(hero({ ua: true }))).toBe(0)
  })

  it('bonfire rest clears fatigue but keeps the curse', () => {
    expect(bonfireRest(hero({ ft: 3, maxHp: 97, bmh: 100 }))).toEqual([
      { fa: 0, ft: 0, bmh: 100, maxHp: 100, hp: 100, st: 120, used: 0, mvd: 0, exh: false, pr: false, lh: 0 },
      'Rested at a bonfire: fatigue cleared',
    ])
    expect(bonfireRest(hero({ dth: 1 }))[0]).toMatchObject({ bmh: 100, maxHp: 90 })
    expect(bonfireRest(hero())[0]).toMatchObject({ bmh: null })
  })

  it('altar rest refills; a different altar lifts the curse', () => {
    expect(cleanses(hero({ dth: 1, cb: '1,1' }), '2,2')).toBe(true)
    expect(cleanses(hero({ dth: 1, cb: '1,1' }), '1,1')).toBe(false)
    expect(cleanses(hero({ dth: 1 }), null)).toBe(false)
    expect(cleanses(hero(), '2,2')).toBe(false)
    expect(altarRest(hero({ dth: 2, bmh: 100, maxHp: 80, cb: '1,1' }), '2,2')).toEqual([
      { fa: 0, ft: 0, hp: 100, maxHp: 100, st: 120, fl: 4, used: 0, mvd: 0, exh: false, pr: false, lh: 0, dth: 0, cb: null, bmh: null },
      'Cleansed at a new altar: the curse lifts',
    ])
    expect(altarRest(hero({ dth: 2, bmh: 100, maxHp: 80, cb: '1,1' }), '1,1')).toEqual([
      { fa: 0, ft: 0, hp: 80, maxHp: 80, st: 120, fl: 4, used: 0, mvd: 0, exh: false, pr: false, lh: 0, bmh: 100 },
      'Rested at the altar',
    ])
    expect(altarRest(hero(), null)[0]).toMatchObject({ dth: 0, hp: 100 })
  })

  it('reviving adds a curse (max 3) and moves the hero onto the altar', () => {
    expect(revive(hero({ hp: 0 }), '3,4')).toEqual([
      { bmh: 100, maxHp: 90, hp: 90, st: 120, fl: 4, fa: 0, ft: 0, dth: 1, cb: '3,4', mx: 3, my: 4, exh: false, stn: false, pr: false, mt: '', mon: null, used: 0, mvd: 0 },
      'Revived at an altar (curse x1): max HP -10%, stamina costs +15%',
      'Lyra rises again at an altar, weaker than before (curse x1)',
    ])
    expect(revive(hero({ hp: 0, dth: 3, bmh: 100, maxHp: 70 }), '0,0')[0]).toMatchObject({ dth: 3, maxHp: 70 })
  })

  it('toggles: shield, parry setting, armor, mounts', () => {
    expect(toggleShield(hero())).toEqual([{ shield: true }, 'Equipped a shield'])
    expect(toggleShield(hero({ shield: true }))).toEqual([{ shield: false }, 'Put away the shield'])
    expect(cycleParry(hero())).toEqual([{ pw: 'n' }, 'Parry set to normal'])
    expect(cycleParry(hero({ pw: 'n' }))).toEqual([{ pw: 'd' }, 'Parry set to disadvantage'])
    expect(cycleParry(hero({ pw: 'x' }))).toEqual([{ pw: '' }, 'Parry set to class default'])
    expect(toggleArmor(hero())).toEqual([{ ha: true }, 'Put on heavy armor'])
    expect(toggleArmor(hero({ cls: 'fighter' }))).toEqual([{ ha: false }, 'Changed into light armor'])
    expect(toggleFoeDown(hero({ mt: 'climb' }))).toEqual([{ mt: 'down' }, 'Foe knocked down: no drain'])
    expect(toggleFoeDown(hero({ mt: 'down' }))).toEqual([{ mt: 'climb' }, 'Foe is back up: -40 St per round'])
    expect(dismount(true)).toEqual([{ mt: '', mon: null }, 'Dropped from the monster'])
    expect(dismount(false)).toEqual([{ mt: '', mon: null }, 'Unmounted'])
  })

  it('releasing an attunement', () => {
    const board: Board = { g: { n: 'Big (Golden)', gb: 'b' }, h: { n: 'Other (Golden)', gb: 'b' } }
    expect(releaseAttunement(hero({ at: { g: 1, h: 1 } }), 'g', board)).toEqual([{ at: { h: 1 } }, 'Attunement released: Big (Golden)'])
    expect(releaseAttunement(hero({ at: { g: 1 } }), 'g', board)).toEqual([{ at: null }, 'Attunement released: Big (Golden)'])
    expect(releaseAttunement(hero(), 'gone', board)).toEqual([{ at: null }, 'Attunement released: '])
    expect(attunedKeys(hero({ at: { g: 1, h: 1 }, atn: 1 }), board)).toEqual(['g'])
  })

  it('typed boxes', () => {
    expect(fieldValue('12', true)).toBe(12)
    expect(fieldValue('abc', true)).toBe(0)
    expect(fieldValue(' Poisoned ', false)).toBe(' Poisoned ')
  })

  it('turns: anyone outside combat, only the current unit in combat', () => {
    expect(turnKey(null)).toBeNull()
    expect(turnKey({ ph: 'roll', l: [{ k: 'c:a' }] })).toBeNull()
    expect(turnKey({ ph: 'go', t: 1, l: [{ k: 'c:a' }, { k: 'e:w' }] })).toBe('e:w')
    expect(turnKey({ ph: 'go', t: 5, l: [{ k: 'c:a' }] })).toBeNull()
    expect(turnKey({ ph: 'go', t: 0 })).toBeNull()
    expect(isMyTurn(null, 'c:a')).toBe(true)
    expect(isMyTurn({ ph: 'go', t: 0, l: [{ k: 'c:a' }] }, 'c:a')).toBe(true)
    expect(isMyTurn({ ph: 'go', t: 0, l: [{ k: 'e:w' }] }, 'c:a')).toBe(false)
  })

  it('which ability buttons are greyed out', () => {
    expect(abilityLocked(hero(), false, false, true)).toBe(false)
    for (const o of [{ exh: true }, { stn: true }, { chg: 'X' }, { hp: 0 }]) expect(abilityLocked(hero(o), true, true, true)).toBe(true)
    expect(abilityLocked(hero({ used: 2 }), false, true, true)).toBe(true)
    expect(abilityLocked(hero({ used: 2 }), true, false, false)).toBe(false)
    expect(abilityLocked(hero(), false, false, false)).toBe(true)
    expect(abilityLocked(hero(), false, true, false)).toBe(false)
  })

  it('using an ability pays stamina, counts the action and raises Dodge or Parry', () => {
    expect(payForAbility(hero(), 'Smoke', 2, false, undefined)).toEqual([{ st: 30, used: 1, ua: true }, 'Used Smoke (-20 St)'])
    expect(payForAbility(hero({ used: 1, dth: 1 }), 'Smoke', 2, false, undefined, 'Wolf')).toEqual([{ st: 27, used: 2, ua: true }, 'Used Smoke (-23 St) on Wolf'])
    expect(payForAbility(hero(), 'Dodge Roll', 3, true, undefined)).toEqual([{ st: 20, ddg: true }, 'Used Dodge Roll (-30 St)'])
    expect(payForAbility(hero(), 'Parry', 2, true, undefined)).toEqual([{ st: 30, pry: true }, 'Used Parry (-20 St)'])
    expect(payForAbility(hero({ st: 5 }), 'Smoke', 2, false, undefined)).toEqual([{ st: 0, exh: true, mt: '', mon: null, used: 1, ua: true }, 'Used Smoke (-20 St) - out of stamina: EXHAUSTED'])
    expect(payForAbility(hero(), 'Big (Golden)', 1, false, 10)[0]).toEqual({ st: 40, hp: 50, fa: 10, ft: 1, bmh: 100, maxHp: 99, used: 1, ua: true })
    // A free ability (cost 0) keeps the regen.
    expect(payForAbility(hero(), 'Unbroken', 0, false, undefined)[0]).toEqual({ st: 50, used: 1 })
  })

  it('heal amounts are dice plus bonus, x10', () => {
    expect(healAmount([3, 4], 2)).toBe(90)
    expect(healAmount([], 0)).toBe(0)
  })
})

describe('the world reset', () => {
  it('everyone back to full at their post, except unique foes and waiting phase sheets', () => {
    const p = respawnPatches({
      wolf: { name: 'Wolf', hp: 0, max: 30, pm: 10, mx: 5, my: 5, hx: 1, hy: 2, hm: 'm2', mp: 'm1' },
      imp: { name: 'Imp', hp: 3, max: 9, mx: 4, my: 4, mp: 'm1' },
      drake: { name: 'Drake', hp: 0, max: 99, sz: 4 },
      ogre: { name: 'Ogre', hp: 0, max: 50, sz: 4, rk: 'l' },
      boss: { name: 'Boss', hp: 0, max: 100, nx: 'p2', hx: 2, hy: 2, sz: 4 },
      p2: { name: 'Boss 2', hp: 40, max: 80, mx: 3, my: 3, pm: 5 },
      boss2: { name: 'Other', hp: 0, max: 100, nx: 'p3', mx: 1, my: 1, rk: 'u' },
      p3: { name: 'Other 2', hp: 0, max: 80 },
      lone: { name: 'Lone', hp: 0, max: 5, nx: 'gone' },
      b4: { name: 'B4', hp: 0, max: 10, nx: 'p4', rk: 'u' },
      p4: { name: 'P4', hp: 5, max: 20, mx: 1, my: 1 },
    })
    expect(p).toEqual([
      ['wolf', { hp: 30, bi: false, po: 10, stun: false, sg: false, rec: false, hd: null, ht: 0, mx: 1, my: 2, mp: 'm2' }],
      ['imp', { hp: 9, bi: false, po: 0, stun: false, sg: false, rec: false, hd: null, ht: 0, mx: 4, my: 4, mp: 'm1' }],
      ['ogre', { hp: 50, bi: false, po: 0, stun: false, sg: false, rec: false, hd: null, ht: 0, mx: undefined, my: undefined, mp: undefined }],
      ['boss', { hp: 100, bi: false, po: 0, stun: false, sg: false, hd: null, ht: 0, mx: 2, my: 2, mp: undefined }],
      ['p2', { hp: 80, mx: null, my: null, po: 5, stun: false, sg: false }],
      ['lone', { hp: 5, bi: false, po: 0, stun: false, sg: false, rec: false, hd: null, ht: 0, mx: undefined, my: undefined, mp: undefined }],
      ['b4', { hp: 10, bi: false, po: 0, stun: false, sg: false, hd: null, ht: 0, mx: undefined, my: undefined, mp: undefined }],
      ['p4', { hp: 20, mx: null, my: null, po: 0, stun: false, sg: false }],
    ])
    expect(respawnPatches({})).toEqual([])
  })
})

describe('hidden words', () => {
  it('splits a text into plain parts and whole hidden words, any case, longest first', () => {
    expect(spoilerParts('Revive at the Altar; revived.', ['revive', 'revived', 'altar'])).toEqual([
      { t: 'Revive', hide: true },
      { t: ' at the ', hide: false },
      { t: 'Altar', hide: true },
      { t: '; ', hide: false },
      { t: 'revived', hide: true },
      { t: '.', hide: false },
    ])
    expect(spoilerParts('Altars', ['altar'])).toEqual([{ t: 'Altars', hide: false }])
    expect(spoilerParts('a.b', ['a.b'])).toEqual([{ t: 'a.b', hide: true }])
    expect(spoilerParts('Plain', [])).toEqual([{ t: 'Plain', hide: false }])
    expect(spoilerParts('', ['x'])).toEqual([])
  })

  it('with clause, hides the whole clause around each hidden word', () => {
    expect(spoilerParts('Passive. Once per altar rest, drop to 1 HP instead of 0.', ['altar'], true)).toEqual([
      { t: 'Passive. ', hide: false },
      { t: 'Once per altar rest', hide: true },
      { t: ', drop to 1 HP instead of 0.', hide: false },
    ])
    expect(spoilerParts('Altar Call', ['altar'], true)).toEqual([{ t: 'Altar Call', hide: true }])
    expect(spoilerParts('Revive at an altar', ['altar', 'revive'], true)).toEqual([{ t: 'Revive at an altar', hide: true }])
    expect(spoilerParts('Heal (at a bonfire) now', ['bonfire'], true)).toEqual([
      { t: 'Heal (', hide: false },
      { t: 'at a bonfire', hide: true },
      { t: ') now', hide: false },
    ])
  })
})
