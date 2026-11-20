// Parity for the Game Master's Enemies panel: the same user actions on the live
// page and in the new logic must save exactly the same data.
import { expect, test } from '../harness.ts'
import { enemyFieldChange, hpStep, linksTo, NEW_SKILL, newEnemy, skillFieldValue, type NewEnemyForm } from '../../src/logic/enemies.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { rng } from './random.ts'

// Sets a box's value without focusing it (like a pasted value), then fires "change".
// Typing would leave the box focused, and the page's next redraw would fire a second change.
let setAndChange: (sel: string, v: string) => Promise<void>
test.beforeEach(({ page }) => {
  setAndChange = (sel, v) =>
    page.locator(sel).evaluate((el, value) => {
      ;(el as HTMLInputElement).value = value
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, v)
})

const OPEN = (enemies: object, open: string[]) =>
  `pin="tbl";role="gm";dm=true;canGM=true;me="gm";view="table";chars={};maps={};enemies=${JSON.stringify(enemies)};eOpen=new Set(${JSON.stringify(open)});last="";render()`

test('editor fields save the same change', async ({ legacy, page }) => {
  const r = rng(51)
  const TEXT = ['name', 'type', 'dm', 'pl', 'bt', 'nt', 'gt']
  const NUM = ['sz', 'max', 'spd', 'bon', 'pm', 'ac', 'ab', 'er', 'ib', 'pg']
  const cases = Array.from({ length: 60 }, () => {
    const kind = r.pick(['text', 'num', 'check', 'select'] as const)
    const f = kind === 'text' ? r.pick(TEXT) : kind === 'num' ? r.pick(NUM) : kind === 'check' ? r.pick(['sw', 'gv']) : r.pick(['rk', 'nx'])
    const v =
      kind === 'text'
        ? r.pick(['', 'Frost Warden', 'x'.repeat(r.int(20, 1000)), ' spaced '])
        : kind === 'num'
          ? r.pick(['', '0', '-3', '12', '75', '400', 'abc'])
          : kind === 'check'
            ? r.next() < 0.5
            : f === 'rk'
              ? r.pick(['n', 'l', 'm', 'u'])
              : r.pick(['', 'b'])
    return { f, v, e: { name: 'Wolf', type: 'Beast', hp: r.int(0, 100), max: 100, x10: true, sw: r.pick([0, 1]), gv: r.pick([0, 1]) } as Enemy }
  })
  for (const c of cases) {
    legacy.writes.length = 0
    await legacy.run(OPEN({ a: c.e, b: { name: 'Next', x10: true } }, ['a']))
    const sel = `[data-ef="${c.f}"][data-id="a"]`
    if (typeof c.v === 'boolean') {
      const now = await page.locator(sel).isChecked()
      if (now === c.v) await page.locator(sel).click() // make sure the click ends on the wanted state
      await page.locator(sel).setChecked(c.v)
    } else if (c.f === 'rk' || c.f === 'nx') await page.locator(sel).selectOption(c.v)
    else await setAndChange(sel, c.v)
    await expect.poll(() => legacy.writes.length, JSON.stringify(c)).toBeGreaterThan(0)
    const theirs = legacy.writes.filter((w) => w.path === 'enemies/a').at(-1)!.body
    expect(theirs, JSON.stringify(c)).toEqual(enemyFieldChange(c.e, c.f, c.v))
  }
})

test('HP buttons save the same HP', async ({ legacy, page }) => {
  for (const [hp, n] of [
    [60, 50],
    [60, -10],
    [5, -50],
    [100, 10],
  ] as const) {
    legacy.writes.length = 0
    await legacy.run(OPEN({ a: { name: 'Wolf', hp, max: 100, x10: true } }, []))
    await page.locator(`[data-a="eh"][data-id="a"][data-n="${n}"]`).click()
    await expect.poll(() => legacy.writes.at(-1)?.body).toEqual(hpStep({ hp, max: 100 }, n))
  }
})

test('"Add enemy" makes the same sheet', async ({ legacy, page }) => {
  const forms: Partial<NewEnemyForm>[] = [
    { name: 'Wolf' },
    { name: ' Troll ', type: 'Giant', size: '3', hp: '400', speed: '5', poise: '30', ac: '15', attack: '0', damage: ' 3d10+3d10+3d10+3d10 ' },
    { name: 'Imp', attack: '-1', poise: 'x' },
  ]
  for (const f of forms) {
    const form: NewEnemyForm = { name: '', type: '', size: '1', hp: '', speed: '', poise: '', ac: '', attack: '', damage: '', ...f }
    legacy.writes.length = 0
    await legacy.run(OPEN({}, []))
    const fill = async (id: string, v: string) => page.locator(id).fill(v)
    await fill('#en', form.name)
    await fill('#et', form.type)
    await page.locator('#es').selectOption(form.size)
    await fill('#eh', form.hp)
    await fill('#esp', form.speed)
    await page.locator('#epm').evaluate((el, v) => ((el as HTMLInputElement).value = v), form.poise) // number box: allow junk like the user could paste
    await fill('#eac', form.ac)
    await fill('#eab', form.attack)
    await fill('#edm', form.damage)
    await page.locator('[data-a="eadd"]').click()
    await expect.poll(() => legacy.writes.length).toBeGreaterThan(0)
    const w = legacy.writes[0]!
    expect(w.path).toMatch(/^enemies\/e[a-z0-9]{1,6}$/)
    expect(w.body).toEqual(newEnemy(form))
  }
})

test('removing an enemy clears links to it and deletes its pictures', async ({ legacy, page }) => {
  await legacy.run('window.confirm=()=>true')
  const enemies = { a: { name: 'A', nx: 'b', x10: true }, b: { name: 'B', x10: true }, c: { name: 'C', nx: 'b', x10: true } }
  legacy.writes.length = 0
  await legacy.run(OPEN(enemies, ['b']))
  await page.locator('[data-a="edel"][data-id="b"]').click()
  await expect.poll(() => legacy.writes.length).toBeGreaterThanOrEqual(6)
  const theirs = legacy.writes.map((w) => `${w.method} ${w.path} ${JSON.stringify(w.body)}`).sort()
  const mine = [
    ...linksTo(enemies as Record<string, Enemy>, 'b').map((k) => `PATCH enemies/${k} {"nx":""}`),
    ...['enemies', 'icons', 'portraits', 'bossart'].map((p) => `DELETE ${p}/b null`),
  ].sort()
  expect(theirs).toEqual(mine)
})

test('skill edits and "+ Add skill" save the same values', async ({ legacy, page }) => {
  const skill = { n: 'Bite', d: '2d6', r: 2, t: 's', a: 0 }
  for (const [f, v] of [
    ['n', 'Web'],
    ['d', '3d8'],
    ['r', '0'],
    ['r', '5'],
    ['t', 'a'],
    ['a', true],
  ] as const) {
    legacy.writes.length = 0
    await legacy.run(OPEN({ a: { name: 'Arachne', x10: true, sk: { s1: skill } } }, ['a']))
    const sel = `[data-es="a"][data-sk="s1"][data-f="${f}"]`
    if (typeof v === 'boolean') await page.locator(sel).check()
    else if (f === 't') await page.locator(sel).selectOption(v)
    else await setAndChange(sel, v)
    await expect.poll(() => legacy.writes.length).toBeGreaterThan(0)
    expect(legacy.writes[0]).toEqual({ method: 'PUT', path: `enemies/a/sk/s1/${f}`, body: skillFieldValue(f, v) })
  }
  legacy.writes.length = 0
  await legacy.run(OPEN({ a: { name: 'Arachne', x10: true } }, ['a']))
  await page.locator('[data-a="eskadd"][data-id="a"]').click()
  await expect.poll(() => legacy.writes.length).toBeGreaterThan(0)
  expect(legacy.writes[0]!.path).toMatch(/^enemies\/a\/sk\/s[a-z0-9]{1,4}$/)
  expect(legacy.writes[0]!.body).toEqual(NEW_SKILL)
})
