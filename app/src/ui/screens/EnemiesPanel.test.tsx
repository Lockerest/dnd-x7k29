// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { AETHELRIC_75 } from '../../data/cinematics'
import { SKILL_SETS } from '../../data/skillSets'
import type { Enemy } from '../../logic/types'
import { createGameStore, emptyTables, type GameStore } from '../../state/store'
import { fakeDb } from '../../testing/fakeDb'
import { EnemiesPanel } from './EnemiesPanel'

afterEach(cleanup)

// Different random keys for each new skill or sheet, the same in every run.
let n = 0
const rand = () => (++n % 7) / 7 + 0.0123

function Harness({ store, open, onToggle, onPlay, confirm }: { store: GameStore; open: string[]; onToggle: (id: string) => void; onPlay: (id: string) => void; confirm: (q: string) => boolean }) {
  const tables = useStore(store, (s) => s.tables)

  return (
    <EnemiesPanel
      tables={tables}
      actions={store.getState()}
      open={open}
      onToggle={onToggle}
      themes={[{ key: 'firstdefier', name: 'The First Defier' }]}
      onPlayCinematic={onPlay}
      confirm={confirm}
      rand={rand}
    />
  )
}

function setup(enemies: Record<string, Enemy>, open: string[] = Object.keys(enemies), extra: Partial<ReturnType<typeof emptyTables>> = {}) {
  const f = fakeDb()
  const store = createGameStore(() => f.db, () => 5)
  store.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
  store.getState().applySnapshot({ ...emptyTables(), enemies, ...extra })
  const onToggle = vi.fn()
  const onPlay = vi.fn()
  const confirm = vi.fn(() => true)
  const r = render(<Harness store={store} open={open} onToggle={onToggle} onPlay={onPlay} confirm={confirm} />)
  return { f, store, onToggle, onPlay, confirm, r }
}

const card = (name: string) => screen.getByText(name, { selector: 'b' }).closest('.enemy') as HTMLElement
const blur = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } })
  fireEvent.blur(el)
}

describe('<EnemiesPanel /> list', () => {
  it('lists phase sheets under their boss with labels, sizes, maps and HP', () => {
    setup(
      {
        b: { name: 'Aethelric (phase 2)', type: 'Undead', sz: 4, hp: 50, max: 100, pl: 'First Phase' },
        a: { name: 'Aethelric', type: 'Undead', sz: 4, hp: 100, max: 100, nx: 'b', mx: 1, my: 1, mp: 'm1', pm: 30, po: 10 },
        c: { name: 'Aethelric (phase 3)', hp: 0, max: 100, stun: true },
        w: { name: 'Wolf', hp: 5, max: 5, mx: 0, my: 0, mp: 'gone' },
      },
      [],
      { maps: { m1: { name: 'Frost Cave' } } },
    )
    const names = [...document.querySelectorAll('.enemy > .grow > .row b')].map((b) => b.textContent)
    expect(names).toEqual(['Aethelric', 'Aethelric (phase 2)', 'Aethelric (phase 3)', 'Wolf'])
    expect(within(card('Aethelric')).getByText('Undead · 4×4 · on Frost Cave')).toBeInTheDocument()
    expect(within(card('Aethelric')).getByText('Poise')).toBeInTheDocument()
    expect(within(card('Aethelric')).getAllByRole('meter')[1]).toHaveAttribute('aria-valuenow', '10')
    expect(card('Aethelric (phase 2)').style.marginLeft).toBe('12px')
    expect(within(card('Aethelric (phase 2)')).getByText('First Phase')).toBeInTheDocument()
    expect(within(card('Aethelric (phase 3)')).getByText('Slain')).toBeInTheDocument()
    expect(within(card('Aethelric (phase 3)')).getByText('Stunned')).toBeInTheDocument()
    expect(within(card('Wolf')).getByText('· 1×1')).toBeInTheDocument() // no type, and its map is gone
  })

  it('a chained sheet without a label says which phase it is, and the meter handles max 0', () => {
    setup({ a: { name: 'A', nx: 'b', max: 0, hp: 0 }, b: { name: 'B' } }, [])
    expect(within(card('B')).getByText('Phase 2 sheet')).toBeInTheDocument()
    expect(screen.getAllByRole('meter')[0]!.querySelector('i')!.style.width).toBe('0%')
  })

  it('says when there are none', () => {
    setup({})
    expect(screen.getByText('None in sight.')).toBeInTheDocument()
  })

  it('HP buttons and the open/close toggle', async () => {
    const { f, onToggle } = setup({ a: { name: 'Wolf', hp: 60, max: 100 } }, [])
    fireEvent.click(screen.getByRole('button', { name: '+50 HP for Wolf' }))
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { hp: 100 }])
    fireEvent.click(screen.getByRole('button', { name: '-50 HP for Wolf' }))
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { hp: 50 }])
    expect(screen.queryByLabelText('Max HP')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: "Show or hide Wolf's settings" }))
    expect(onToggle).toHaveBeenCalledWith('a')
  })
})

describe('<EnemiesPanel /> editor', () => {
  it('saves each field the way the live page does', () => {
    const { f, store } = setup({ a: { name: 'Wolf', type: 'Beast', hp: 80, max: 100 }, b: { name: 'Other' } }, ['a'])
    const c = card('Wolf')
    const q = (l: string) => within(c).getByLabelText(l) as HTMLInputElement
    blur(q('Name'), '')
    blur(q('Max HP'), '50')
    blur(q('Size'), '12')
    blur(q('Phase gate (% HP, 0 = off)'), '75')
    blur(q('Damage'), '2d8')
    blur(q('Phase label'), 'First encounter')
    fireEvent.click(q('Swap at 0 HP'))
    fireEvent.change(q('Next phase'), { target: { value: 'b' } })
    fireEvent.change(q('Theme'), { target: { value: 'firstdefier' } })
    fireEvent.change(q('Rank'), { target: { value: 'm' } })
    fireEvent.click(within(c).getByLabelText(/vanishes from the board/))
    expect(f.writes.map((w) => w[2])).toEqual([
      { name: 'Wolf' },
      { max: 50, hp: 50 },
      { sz: 8 },
      { pg: 75 },
      { dm: '2d8' },
      { pl: 'First encounter' },
      { sw: 1 },
      { nx: 'b' },
      { th: 'firstdefier' },
      { rk: 'm' },
      { gv: 1 },
    ])
    expect(store.getState().tables.enemies.a).toMatchObject({ max: 50, sz: 8, pg: 75, nx: 'b', rk: 'm' })
  })

  it('leaving a box unchanged saves nothing; every number box saves', () => {
    const { f } = setup({ a: { name: 'Wolf', hp: 1, max: 1 } }, ['a'])
    const c = card('Wolf')
    fireEvent.blur(within(c).getByLabelText('Name'))
    expect(f.writes).toEqual([])
    const labels = ['Type', 'Speed', 'Bonus', 'Poise', 'AC', 'Atk +', 'Range', 'Init +', 'Title', 'GM notes (only you see this)', /Gate cinematic text/]
    labels.forEach((l, i) => blur(within(c).getByLabelText(l) as HTMLInputElement, String(i + 2)))
    expect(f.writes.map((w) => Object.keys(w[2] as object)[0])).toEqual(['type', 'spd', 'bon', 'pm', 'ac', 'ab', 'er', 'ib', 'bt', 'nt', 'gt'])
  })

  it('shows a removed next phase so it can be picked again', () => {
    setup({ a: { name: 'Wolf', nx: 'gone' } }, ['a'])
    expect(within(card('Wolf')).getByRole('option', { name: '(removed monster: pick again)' })).toBeInTheDocument()
  })

  it('cinematic: loads the preset, plays it, and the vanish box', () => {
    const { f, onPlay, store } = setup({ a: { name: 'Aethelric', gv: 1 } }, ['a'])
    const c = card('Aethelric')
    expect(within(c).queryByRole('button', { name: 'Play cinematic' })).toBeNull()
    fireEvent.click(within(c).getByRole('button', { name: 'Load the Aethelric 75% scene' }))
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { gt: AETHELRIC_75 }])
    expect(store.getState().tables.enemies.a!.gt).toBe(AETHELRIC_75)
    fireEvent.click(within(card('Aethelric')).getByRole('button', { name: 'Play cinematic' }))
    expect(onPlay).toHaveBeenCalledWith('a')
    expect(within(card('Aethelric')).getByLabelText(/vanishes from the board/)).toBeChecked()
  })

  it('skills: add, edit, delete, and load a skill set', () => {
    const { f, store } = setup({ a: { name: 'Arachne', sk: { s0: { n: 'Silk Snare', d: '1d4', r: 2, t: 'a', a: 1 } } } }, ['a'])
    const c = card('Arachne')
    const sk = within(c).getByLabelText('Skill Silk Snare')
    expect(within(sk).getByLabelText('Type')).toHaveValue('a')
    expect(within(sk).getByLabelText('Auto-hit')).toBeChecked()
    blur(within(sk).getByLabelText('Range'), '0')
    blur(within(sk).getByLabelText('Damage'), '2d6')
    fireEvent.change(within(sk).getByLabelText('Type'), { target: { value: 's' } })
    fireEvent.click(within(sk).getByLabelText('Auto-hit'))
    blur(within(sk).getByLabelText('Name'), 'Web')
    expect(f.writes.map((w) => [w[1], w[2]])).toEqual([
      ['enemies/a/sk/s0/r', 1],
      ['enemies/a/sk/s0/d', '2d6'],
      ['enemies/a/sk/s0/t', 's'],
      ['enemies/a/sk/s0/a', 0],
      ['enemies/a/sk/s0/n', 'Web'],
    ])
    fireEvent.click(within(card('Arachne')).getByRole('button', { name: '+ Add skill' }))
    expect(f.writes.at(-1)).toEqual(['PUT', expect.stringMatching(/^enemies\/a\/sk\/s[a-z0-9]{1,4}$/), { n: 'New skill', d: '2d6', r: 1, t: 's', a: 0 }])
    fireEvent.click(within(card('Arachne')).getByRole('button', { name: 'Delete skill New skill' }))
    expect(f.writes.at(-1)![0]).toBe('DELETE')
    fireEvent.change(within(card('Arachne')).getByLabelText('Load a skill set'), { target: { value: 'Arachne: phase 1 (all)' } })
    const saved = f.writes.at(-1)!
    expect(saved[1]).toBe('enemies/a/sk')
    const names = Object.values(saved[2] as Record<string, { n: string }>).map((q) => q.n)
    expect(names).toEqual(['Web', ...SKILL_SETS['Arachne: phase 1 (all)']!.map((r) => r.name).filter((n) => n !== 'Web')])
    expect(Object.keys(store.getState().tables.enemies.a!.sk!)).toHaveLength(names.length)
    fireEvent.change(within(card('Arachne')).getByLabelText('Load a skill set'), { target: { value: '' } })
    expect(f.writes.at(-1)).toBe(saved)
  })

  it('next phase, gate reached, start phase 2, stun, remove', () => {
    const { f, store, confirm } = setup(
      { a: { name: 'Aethelric', hp: 75, max: 100, pg: 75, gr: 75, nx: 'b', mx: 1, my: 1 }, b: { name: 'Aethelric (phase 2)', max: 200 } },
      ['a'],
    )
    const c = card('Aethelric')
    expect(within(c).getByText('Gate reached at 75% HP: run your scripted event.')).toBeInTheDocument()
    fireEvent.click(within(c).getByRole('button', { name: 'Done' }))
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { gr: 0 }])
    fireEvent.click(within(card('Aethelric')).getByRole('button', { name: 'Stun' }))
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { stun: true }])
    expect(within(card('Aethelric')).getByRole('button', { name: 'Unstun' })).toBeInTheDocument()
    fireEvent.click(within(card('Aethelric')).getByRole('button', { name: 'Start phase 2: Aethelric (phase 2)' }))
    return vi.waitFor(() => expect(f.writes.some((w) => (w[2] as { ev?: string })?.ev?.endsWith('rises!'))).toBe(true)).then(async () => {
      expect(store.getState().tables.enemies.b!.mx).toBe(1)
      fireEvent.click(within(card('Aethelric')).getByRole('button', { name: '+ Add next phase sheet' }))
      await vi.waitFor(() => expect(Object.keys(store.getState().tables.enemies)).toHaveLength(3))
      const added = Object.keys(store.getState().tables.enemies).find((k) => k !== 'a' && k !== 'b')!
      expect(store.getState().tables.enemies[added]!.name).toBe('Aethelric (phase 3)')
      confirm.mockReturnValueOnce(false)
      fireEvent.click(within(card('Aethelric')).getByRole('button', { name: 'Remove' }))
      expect(store.getState().tables.enemies.a).toBeDefined()
      fireEvent.click(within(card('Aethelric')).getByRole('button', { name: 'Remove' }))
      await vi.waitFor(() => expect(store.getState().tables.enemies.a).toBeUndefined())
      expect(confirm).toHaveBeenCalledWith('Remove this enemy?')
    })
  })

  it('uses the browser confirm box by default', () => {
    const f = fakeDb()
    const store = createGameStore(() => f.db)
    store.getState().applySnapshot({ ...emptyTables(), enemies: { a: { name: 'Wolf' } } })
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<EnemiesPanel tables={store.getState().tables} actions={store.getState()} open={['a']} onToggle={() => {}} themes={[]} onPlayCinematic={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(spy).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '+ Add skill' }))
    expect(f.writes[0]![1]).toMatch(/^enemies\/a\/sk\/s/)
    spy.mockRestore()
  })
})

describe('<EnemiesPanel /> odd sheets', () => {
  it('a nameless enemy, a map without a name, and a bare skill still render and save', () => {
    const { f } = setup({ a: { mx: 0, my: 0, mp: 'm1', sk: { s: { n: 'Bare' } as never } } }, ['a'], { maps: { m1: {} } })
    expect(screen.getByRole('button', { name: "Show or hide this enemy's settings" })).toBeInTheDocument()
    const sk = screen.getByLabelText('Skill Bare')
    expect(within(sk).getByLabelText('Range')).toHaveValue(1)
    expect(within(sk).getByLabelText('Damage')).toHaveValue('')
    blur(screen.getAllByLabelText('Name')[0]!, 'Named')
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/a', { name: 'Named' }])
  })

  it('adding a next phase sets the theme only when the table has it', async () => {
    const { store } = setup({ a: { name: 'Aethelric', max: 10 } }, ['a'])
    fireEvent.click(screen.getByRole('button', { name: '+ Add next phase sheet' }))
    await vi.waitFor(() => expect(Object.values(store.getState().tables.enemies).some((e) => e.th === 'firstdefier')).toBe(true))
  })
})

describe('<EnemiesPanel /> adding', () => {
  it('adds an enemy with the form values, then clears the form', async () => {
    const { f, store } = setup({})
    const type = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(f.writes).toEqual([])
    type('Name', 'Troll')
    type('Type', 'Giant')
    type('Size', '3')
    type('HP', '400')
    type('Speed', '5')
    type('Poise', '30')
    type('AC', '15')
    type('Attack bonus', '6')
    type('Damage', '3d10')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(f.writes[0]).toEqual(['PUT', expect.stringMatching(/^enemies\/e[a-z0-9]{1,6}$/), expect.objectContaining({ name: 'Troll', type: 'Giant', sz: 3, hp: 400, pm: 30, ac: 15, ab: 6, dm: '3d10' })])
    expect(Object.values(store.getState().tables.enemies)[0]!.name).toBe('Troll')
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })
})
