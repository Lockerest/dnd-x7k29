// Loudness normalisation, boss theme matching, the cinematic script and the
// enemy editor's open/close memory.
import { expect, test, writesTo } from '../harness.ts'

const buffer = (amp: number) =>
  `(()=>{const b=new AudioBuffer({length:44100,sampleRate:44100,numberOfChannels:1}),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=${amp}*Math.sin(i/9);return b})()`

test.describe('bGain(): loudness normalisation for ability sounds', () => {
  test('boosts quiet sounds toward the target loudness', async ({ legacy }) => {
    const g = await legacy.run<number>(`bGain(${buffer(0.05)})`)
    expect(g).toBeGreaterThan(4)
    expect(g).toBeLessThanOrEqual(5)
  })
  test('never boosts more than 5x', async ({ legacy }) => {
    expect(await legacy.run(`bGain(${buffer(0.001)})`)).toBe(5)
  })
  test('never turns sounds down', async ({ legacy }) => {
    expect(await legacy.run(`bGain(${buffer(0.9)})`)).toBe(1)
  })
  test('keeps the peak under clipping', async ({ legacy }) => {
    // Short spike, otherwise silent: loudness alone would ask for 5x.
    const g = await legacy.run<number>(
      `(()=>{const b=${buffer(0)};b.getChannelData(0)[0]=0.5;b.getChannelData(0)[3]=0.5;return bGain(b)})()`,
    )
    expect(g).toBeCloseTo(1.9, 5)
  })
  test('leaves silence alone and caches the result', async ({ legacy }) => {
    expect(await legacy.run(`bGain(${buffer(0)})`)).toBe(1)
    expect(await legacy.run(`(()=>{const b=${buffer(0.05)},g=bGain(b);b.getChannelData(0).fill(0.9);return bGain(b)===g})()`)).toBe(true)
  })
})

test.describe('themeFor(): which boss theme plays', () => {
  const load = 'THB={aethelric:"A",firstdefier:"F",namelessking:"N"};'
  test('a sheet theme that is loaded wins', async ({ legacy }) => {
    expect(await legacy.run(load + 'themeFor("Aethelric (phase 2)","firstdefier")')).toBe('F')
  })
  test('otherwise it matches the boss name', async ({ legacy }) => {
    expect(await legacy.run(load + '[themeFor("Aethelric"),themeFor("The Nameless King"),themeFor("Aethelric","notloaded")]')).toEqual(['A', 'N', 'A'])
  })
  test('no theme for unknown or very short names', async ({ legacy }) => {
    expect(await legacy.run(load + '[themeFor("Wolf"),themeFor("Ae"),themeFor("")]')).toEqual([null, null, null])
  })
})

test.describe('playCin(): the cinematic script', () => {
  test('shows each beat in order, with [big] text', async ({ legacy, page }) => {
    await legacy.run('playCin({t:"[flash] The cave trembles\\n[big] ENOUGH GAMES",n:"Aethelric",k:""})')
    await expect(page.locator('.cin .ct p')).toHaveText('The cave trembles')
    await expect(page.locator('.cin .ct p.big')).toHaveText('ENOUGH GAMES', { timeout: 10_000 })
  })
  test('lasts at least 6 seconds and [wait=N] holds a beat for N seconds', async ({ legacy }) => {
    const short = await legacy.run<number>('playCin({t:"Hi",n:"",k:""})')
    const long = await legacy.run<number>('playCin({t:"[wait=12] Hold",n:"",k:""})')
    expect(short).toBe(6)
    expect(long).toBeGreaterThan(12)
  })
  test('tags are case-insensitive and are not shown as text', async ({ legacy, page }) => {
    await legacy.run('playCin({t:"[SHAKE][Glow] Light",n:"",k:""})')
    await expect(page.locator('.cin .ct')).toHaveText('Light')
    await expect(page.locator('.cin .cg')).toHaveClass(/on/)
  })
  test('text is escaped, never run as HTML', async ({ legacy, page }) => {
    await legacy.run('playCin({t:"<img src=x onerror=window.hacked=1>",n:"",k:""})')
    await expect(page.locator('.cin .ct p')).toHaveText('<img src=x onerror=window.hacked=1>')
    expect(await legacy.run('window.hacked===undefined')).toBe(true)
  })
  test('the portrait only shows when the script asks for it and art exists', async ({ legacy, page }) => {
    await legacy.run('BA.a={data:"data:image/gif;base64,R0lGODlhAQABAAAAACw="};playCin({t:"No portrait",n:"",k:"e:a"})')
    await expect(page.locator('.cin .ci')).toHaveCount(0)
    await legacy.run('document.querySelectorAll(".cin").forEach(e=>e.remove());playCin({t:"[portrait] Him",n:"",k:"e:a"})')
    await expect(page.locator('.cin .ci')).toHaveClass(/on/)
  })
  test('an empty request does nothing', async ({ legacy, page }) => {
    expect(await legacy.run('playCin(null)')).toBe(6)
    await expect(page.locator('.cin')).toHaveCount(0)
  })
  test('the Aethelric 75% preset only uses known tags', async ({ legacy }) => {
    const tags = await legacy.run<string[]>('[...CINP.matchAll(/\\[([a-z]+)(?:=[\\d.]+)?\\]/gi)].map(m=>m[1].toLowerCase())')
    expect(tags.length).toBeGreaterThan(5)
    const known = ['portrait', 'stagger', 'glow', 'flash', 'shake', 'slam', 'crack', 'collapse', 'black', 'big', 'wait']
    expect(tags.filter((t) => !known.includes(t))).toEqual([])
  })
  test('the GM buttons load the preset and play it on every device', async ({ legacy, page }) => {
    await legacy.table({}, { a: { name: 'Aethelric', hp: 10, max: 10 } })
    await legacy.run('eOpen.add("a");last="";render()')
    await page.locator('[data-a="cinpre"][data-id="a"]').click()
    expect(await legacy.run('enemies.a.gt===CINP')).toBe(true)
    await legacy.run('last="";render()')
    await page.locator('[data-a="cinplay"][data-id="a"]').click()
    await expect.poll(() => writesTo(legacy.writes, 'POST', 'rolls')).toContainEqual(expect.objectContaining({ cin: expect.objectContaining({ n: 'Aethelric', k: 'e:a' }) }))
    await expect(page.locator('.cin')).toHaveCount(1)
  })
})

test.describe('enemy editor open/close toggle', () => {
  test('opens, closes and remembers it on this device', async ({ legacy, page }) => {
    await legacy.table({}, { a: { name: 'Wolf', hp: 10, max: 10 } })
    const btn = page.locator('[data-a="etg"][data-id="a"]')
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await btn.click()
    await expect(page.locator('[data-a="etg"][data-id="a"]')).toHaveAttribute('aria-expanded', 'true')
    expect(await legacy.run('JSON.parse(localStorage.getItem("eop"))')).toContain('a')
    await page.locator('[data-a="etg"][data-id="a"]').click()
    expect(await legacy.run('eOpen.has("a")')).toBe(false)
  })
})
