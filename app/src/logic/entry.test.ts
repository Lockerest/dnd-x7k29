import { describe, expect, it } from 'vitest'
import { approvedIds, claimRequest, CLAIM_ERROR, isApproved, newCharacter, pendingIds } from './characters'
import { gmPinHash, JOIN_ERRORS, newPlayerId, planJoin } from './join'
import { headerFor, screenFor } from './screens'

describe('planJoin', () => {
  const id = () => 'pnew'
  it('checks the PIN format', async () => {
    for (const p of ['abc', 'has space1', 'x'.repeat(31), 'drågon123']) expect(await planJoin('player', p, '', {}, {}, id)).toEqual({ error: JOIN_ERRORS.pin })
  })
  it('players and table displays need an existing table', async () => {
    expect(await planJoin('player', 'dragon42', '', null, {}, id)).toEqual({ error: JOIN_ERRORS.noTable })
    expect(await planJoin('table', 'dragon42', '', null, {}, id)).toEqual({ error: JOIN_ERRORS.noTable })
  })
  it('a player keeps their id on the same table, gets a new one elsewhere', async () => {
    expect(await planJoin('player', ' dragon42 ', '', {}, { pin: 'dragon42', me: 'p1' }, id)).toEqual({ session: { pin: 'dragon42', role: 'player', me: 'p1' } })
    expect(await planJoin('player', 'dragon42', '', {}, { pin: 'other123', me: 'p1' }, id)).toEqual({ session: { pin: 'dragon42', role: 'player', me: 'pnew' } })
  })
  it('the table display has no character', async () =>
    expect(await planJoin('table', 'dragon42', '', {}, { pin: 'dragon42', me: 'p1' }, id)).toEqual({ session: { pin: 'dragon42', role: 'table', me: '' } }))
  it('GM: PIN length, new table, right and wrong PIN', async () => {
    const h = await gmPinHash('secret')
    expect(await planJoin('gm', 'dragon42', 'abc', {}, {}, id)).toEqual({ error: JOIN_ERRORS.gmShort })
    expect(await planJoin('gm', 'dragon42', 'secret', null, {}, id)).toEqual({ session: { pin: 'dragon42', role: 'gm', me: 'gm' }, createTable: { dm: h } })
    expect(await planJoin('gm', 'dragon42', 'secret', { dm: h }, {}, id)).toEqual({ session: { pin: 'dragon42', role: 'gm', me: 'gm' } })
    expect(await planJoin('gm', 'dragon42', 'nope!', { dm: h }, {}, id)).toEqual({ error: JOIN_ERRORS.gmWrong })
  })
  it('the GM PIN hash is SHA-256 hex', async () =>
    expect(await gmPinHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))
  it('new player ids', () => {
    expect(newPlayerId(() => 0.123456789)).toMatch(/^p[a-z0-9]{1,8}$/)
    expect(newPlayerId()).toMatch(/^p[a-z0-9]{1,8}$/)
  })
})

describe('characters', () => {
  it('approval', () => {
    expect([isApproved({}), isApproved({ ap: true }), isApproved({ ap: false }), isApproved({ ap: 'no' })]).toEqual([true, true, false, false])
    const chars = { a: {}, b: { ap: false }, c: { ap: 'no' }, d: { ap: true } }
    expect(approvedIds(chars)).toEqual(['a', 'd'])
    expect(pendingIds(chars)).toEqual(['b', 'c'])
  })
  it('a new character uses the class table', () => {
    expect(newCharacter('archer', '  Lyra ', 'p1')).toMatchObject({ name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 100, maxSt: 100, rg: 20, ap: false, x10: true, log: ['Joined the party'] })
    expect(newCharacter('mage', '', 'gm')).toMatchObject({ name: 'Nameless', ap: true, st: 140 })
  })
  it('takeover requests', () => {
    expect(claimRequest('  Sam  ', 'c1', 5)).toEqual({ who: 'Sam', target: 'c1', st: 'pending', ts: 5 })
    expect(claimRequest('x'.repeat(40), 'c1', 5)).toMatchObject({ who: 'x'.repeat(30) })
    expect(claimRequest('   ', 'c1', 5)).toEqual({ error: CLAIM_ERROR })
    expect(claimRequest('Sam', '', 5)).toEqual({ error: CLAIM_ERROR })
  })
})

describe('screenFor', () => {
  const base = { role: 'player', dm: false, me: 'p1', chars: {}, view: 'table' as const, claimPending: false, claimMode: false }
  it.each([
    [{ role: '' }, 'join'],
    [{ role: 'table' }, 'table-display'],
    [{}, 'create'],
    [{ claimMode: true }, 'claim-form'],
    [{ claimPending: true, claimMode: true }, 'claim-wait'],
    [{ chars: { p1: { ap: false } } }, 'wait-approval'],
    [{ chars: { p1: { ap: 'no' } } }, 'wait-approval'],
    [{ chars: { p1: {} } }, 'table'],
    [{ chars: { p1: {} }, view: 'sheet' }, 'sheet'],
    [{ chars: { p1: {} }, view: 'board' }, 'board'],
    [{ chars: { p1: {} }, view: 'ref' }, 'ref'],
    [{ role: 'gm', dm: true, me: 'gm' }, 'table'],
    [{ role: 'gm', dm: false, me: 'gm' }, 'create'],
  ] as const)('%o -> %s', (over, out) => expect(screenFor({ ...base, ...over } as Parameters<typeof screenFor>[0])).toBe(out))
})

describe('headerFor', () => {
  it('nobody joined', () => expect(headerFor({ role: '', dm: false, canGM: false, view: 'table' })).toEqual({ roleLabel: '', leave: false, sheetTab: null, boardTab: null, switchRole: null }))
  it('GM on the table', () =>
    expect(headerFor({ role: 'gm', dm: true, canGM: true, view: 'table' })).toEqual({ roleLabel: 'Game Master', leave: true, sheetTab: 'Sheet', boardTab: 'Abilities', switchRole: 'View as player' }))
  it('GM looking as a player, on the sheet', () =>
    expect(headerFor({ role: 'gm', dm: false, canGM: true, view: 'sheet', mine: {} })).toMatchObject({ roleLabel: 'Player', sheetTab: 'Table', switchRole: 'Back to GM' }))
  it('player waiting for approval has no tabs', () => expect(headerFor({ role: 'player', dm: false, canGM: false, view: 'ref', mine: { ap: false } })).toMatchObject({ sheetTab: null, boardTab: null }))
  it('player on the reference', () => expect(headerFor({ role: 'player', dm: false, canGM: false, view: 'ref', mine: {} })).toMatchObject({ boardTab: 'Back to table', switchRole: null }))
})
