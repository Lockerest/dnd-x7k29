// Parity for getting into a game: joining (same checks, messages and table
// creation), new characters, takeover requests, and which screen and header
// buttons show in every state.
import { expect, test } from '../harness.ts'
import { claimRequest, newCharacter } from '../../src/logic/characters.ts'
import { gmPinHash, planJoin, type JoinKind } from '../../src/logic/join.ts'
import { headerFor, screenFor, type View } from '../../src/logic/screens.ts'
import type { ClassId } from '../../src/logic/types.ts'
import { rng } from './random.ts'

const BUTTON: Record<JoinKind, string> = { player: 'joinP', table: 'joinT', gm: 'joinGM' }

test('joining: messages, sessions and new tables', async ({ legacy, page }) => {
  const right = await gmPinHash('secret1')
  const cases: { kind: JoinKind; pin: string; gm: string; meta: object | null; saved: object }[] = [
    { kind: 'player', pin: 'abc', gm: '', meta: {}, saved: {} },
    { kind: 'player', pin: 'with space', gm: '', meta: {}, saved: {} },
    { kind: 'player', pin: 'dragon42', gm: '', meta: null, saved: {} },
    { kind: 'table', pin: 'dragon42', gm: '', meta: null, saved: {} },
    { kind: 'player', pin: ' dragon42 ', gm: '', meta: { dm: right }, saved: { pin: 'dragon42', role: 'player', me: 'pkeep' } },
    { kind: 'table', pin: 'dragon42', gm: '', meta: { dm: right }, saved: { pin: 'dragon42', role: 'player', me: 'pkeep' } },
    { kind: 'gm', pin: 'dragon42', gm: 'abc', meta: { dm: right }, saved: {} },
    { kind: 'gm', pin: 'dragon42', gm: 'wrong!', meta: { dm: right }, saved: {} },
    { kind: 'gm', pin: 'dragon42', gm: 'secret1', meta: { dm: right }, saved: {} },
    { kind: 'gm', pin: 'newtable9', gm: 'secret1', meta: null, saved: {} },
  ]
  for (const c of cases) {
    // Forget the last join first, or the page would rejoin it by itself on reload.
    await legacy.run('localStorage.clear()')
    await page.reload()
    legacy.writes.length = 0
    legacy.db.root = {}
    if (c.meta) legacy.db.set("meta", c.meta) // the harness serves every table PIN from the same tree
    await legacy.run(`localStorage.setItem("st",${JSON.stringify(JSON.stringify(c.saved))});role="";render()`)
    await page.locator('#pin').fill(c.pin)
    await page.locator('#gpin').fill(c.gm)
    await page.locator(`[data-a="${BUTTON[c.kind]}"]`).click()
    const plan = await planJoin(c.kind, c.pin, c.gm, c.meta as { dm?: string } | null, c.saved, () => 'NEW')
    if ('error' in plan) {
      await expect(page.locator('#err'), JSON.stringify(c)).toHaveText(plan.error)
      expect(await legacy.run('role')).toBe('')
      continue
    }
    await expect.poll(() => legacy.run('role'), JSON.stringify(c)).toBe(plan.session.role)
    const s = await legacy.run<{ pin: string; me: string }>('({pin,me})')
    expect(s.pin).toBe(plan.session.pin)
    if (plan.session.me === 'NEW') expect(s.me).toMatch(/^p[a-z0-9]{1,8}$/)
    else expect(s.me).toBe(plan.session.me)
    const metaWrites = legacy.writes.filter((w) => w.method === 'PUT' && w.path === 'meta').map((w) => w.body)
    expect(metaWrites).toEqual(plan.createTable ? [plan.createTable] : [])
  }
})

test('a new character is the same sheet', async ({ legacy, page }) => {
  for (const [cls, name, me] of [
    ['fighter', 'Bram', 'p1'],
    ['magickarcher', '  ', 'p2'],
    ['trickster', 'x'.repeat(40), 'gm'],
  ] as const) {
    await page.reload()
    legacy.writes.length = 0
    await legacy.run(`pin="tbl";role="player";dm=false;me="${me}";chars={};render()`)
    await page.locator('#nm').fill(name)
    await page.locator(`[data-a="make"][data-k="${cls}"]`).click()
    await expect.poll(() => legacy.writes.length).toBeGreaterThan(0)
    const put = legacy.writes.find((w) => w.method === 'PUT' && w.path === `chars/${me}`)!.body
    // The name box holds at most 40 characters in both apps.
    expect(put).toEqual(newCharacter(cls as ClassId, name.slice(0, 40), me))
  }
})

test('takeover requests: validation and the saved request', async ({ legacy, page }) => {
  for (const [who, target] of [
    ['', 'c1'],
    ['   ', 'c1'],
    ['  Sam ', 'c1'],
    ['y'.repeat(30), 'c1'],
  ] as const) {
    await page.reload()
    legacy.writes.length = 0
    await legacy.run(`pin="tbl";role="player";dm=false;me="p1";myClaim=null;claimMode=true;chars={c1:{name:"Bram",x10:true}};render()`)
    await page.locator('#cn').fill(who)
    await page.locator('#ct').selectOption(target)
    await page.locator('[data-a="csend"]').click()
    const mine = claimRequest(who, target, 0)
    if ('error' in mine) {
      await expect(page.locator('#err')).toHaveText(mine.error)
      continue
    }
    await expect.poll(() => legacy.writes.length).toBeGreaterThan(0)
    const { ts, ...rest } = legacy.writes[0]!.body as { ts: number }
    expect(typeof ts).toBe('number')
    expect(legacy.writes[0]!.path).toBe('claims/p1')
    const { ts: _t, ...mineRest } = mine
    void _t
    expect(rest).toEqual(mineRest)
  }
})

test('which screen and header buttons show, in every state', async ({ legacy }) => {
  const r = rng(41)
  const states = Array.from({ length: 120 }, () => {
    const role = r.pick(['', 'player', 'gm', 'gm'])
    const me = role === 'gm' ? 'gm' : 'p1'
    const own = r.pick([undefined, { name: 'Me' }, { name: 'Me', ap: false }, { name: 'Me', ap: 'no' }, { name: 'Me', ap: true }])
    const chars: Record<string, object> = { c1: { name: 'Bram', x10: true } }
    if (own) chars[me] = { ...own, x10: true, cls: 'fighter', hp: 1, maxHp: 1, st: 1, maxSt: 1, rg: 1 }
    const claim = r.maybe({ who: 'Sam', target: 'c1', st: r.pick(['pending', 'no']) }, 0.3) ?? null
    return { role, dm: role === 'gm' ? r.next() < 0.7 : false, me, chars, view: r.pick(['table', 'sheet', 'board', 'ref'] as View[]), claim, claimMode: r.next() < 0.3 }
  })
  for (const s of states) {
    const legacyView = await legacy.run<{ html: string; role: string; leave: boolean; tab: string | null; tab2: string | null; sw: string | null }>(
      `(()=>{pin="tbl";role=${JSON.stringify(s.role)};canGM=role==="gm";dm=${s.dm};me=${JSON.stringify(s.me)};chars=${JSON.stringify(s.chars)};enemies={};maps={};
        view=${JSON.stringify(s.view)};myClaim=${JSON.stringify(s.claim)};claimMode=${s.claimMode};render();const q=x=>document.querySelector(x);
        const b=id=>q(id).hidden?null:q(id).textContent;return{html:q("#app").innerHTML,role:q("#role").textContent,leave:!q("#leave").hidden,tab:b("#tab"),tab2:b("#tab2"),sw:b("#sw")}})()`,
    )
    const screen = screenFor({ role: s.role, dm: s.dm, me: s.me, chars: s.chars, view: s.view, claimPending: !!s.claim, claimMode: s.claimMode })
    const h = legacyView.html
    const marker: Record<string, boolean> = {
      join: h.includes('<h2>Join a table</h2>'),
      create: h.includes('<h2>Create your character</h2>'),
      'claim-form': h.includes('<h2>Take over your character</h2>'),
      'claim-wait': h.includes('<h2>Waiting for the GM</h2>') || (h.includes('<h2>Request declined</h2>') && h.includes('linking this device')),
      'wait-approval': h.includes('<h2>Waiting to be allowed to play</h2>') || (h.includes('<h2>Request declined</h2>') && h.includes('approved this character')),
      board: h.includes('class="pri" data-a="vb"'),
      ref: h.includes('class="pri" data-a="vr"'),
      table: h.includes('<div class="tbl'),
    }
    const where = JSON.stringify(s)
    if (screen === 'sheet') expect(Object.entries(marker).filter(([, v]) => v).map(([k]) => k), where).toEqual([])
    else expect(marker[screen], `${where} -> ${screen}`).toBe(true)
    const head = headerFor({ role: s.role, dm: s.dm, canGM: s.role === 'gm', view: s.view, mine: s.chars[s.me] })
    expect({ role: head.roleLabel, leave: head.leave, tab: head.sheetTab, tab2: head.boardTab, sw: head.switchRole }, where).toEqual({
      role: legacyView.role,
      leave: legacyView.leave,
      tab: legacyView.tab,
      tab2: legacyView.tab2,
      sw: legacyView.sw,
    })
  }
})
