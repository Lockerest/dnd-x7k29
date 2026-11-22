// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useStore } from 'zustand'
import type { Encounter } from '../../logic/encounters'
import type { Enemy } from '../../logic/types'
import { createGameStore, emptyTables, type GameStore } from '../../state/store'
import { fakeDb } from '../../testing/fakeDb'
import { EncountersPanel } from './EncountersPanel'

afterEach(cleanup)

let n = 0
const rand = () => (++n % 7) / 7 + 0.0123
const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const ENC: Encounter = { n: 'Pass', rg: 'Frozen North', mp: 'm', ax: 0, ay: 0, m: { w: { s: { name: 'Wolf', hp: 10 }, dx: 0, dy: 0 } } }

function Harness({ store, confirm, startOpen }: { store: GameStore; confirm: (q: string) => boolean; startOpen?: boolean }) {
  const tables = useStore(store, (s) => s.tables)
  const encounters = useStore(store, (s) => s.encounters)
  return <EncountersPanel tables={tables} actions={{ ...store.getState(), encounters }} confirm={confirm} rand={rand} startOpen={startOpen} />
}

function setup(enemies: Record<string, Enemy>, tree: Record<string, unknown> = {}, answer = true, startOpen = true) {
  const f = fakeDb(tree)
  const store = createGameStore(
    () => f.db,
    () => 5,
    rand,
  )
  store.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
  store.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', enemies })
  const asked: string[] = []
  render(
    <Harness
      store={store}
      startOpen={startOpen}
      confirm={(q) => {
        asked.push(q)
        return answer
      }}
    />,
  )
  return { store, f, asked }
}

describe('Encounters panel', () => {
  it('folded by default; opening loads the list', async () => {
    const { store } = setup({}, { encounters: { n1: ENC } }, true, false)
    expect(screen.getByText(/Ready-made groups/)).toBeInTheDocument()
    expect(store.getState().encounters).toBeNull()
    await act(async () => fireEvent.click(screen.getByLabelText('Show or hide the Encounters list')))
    expect(await screen.findByLabelText('Encounter Pass')).toHaveTextContent('1 enemy: Wolf')
    fireEvent.click(screen.getByLabelText('Show or hide the Encounters list'))
    expect(screen.queryByLabelText('Encounter Pass')).not.toBeInTheDocument()
  })

  it('empty: says how to start; saving needs enemies', async () => {
    setup({})
    expect(await screen.findByText(/No encounters yet/)).toBeInTheDocument()
    expect(screen.getByText('Save enemies as an encounter')).toBeDisabled()
  })

  it('saves picked enemies (phase sheets come along, not listed)', async () => {
    const { store, f } = setup({ a: { name: 'Wolf', mx: 1, my: 1 }, b: { name: 'King', nx: 'c' }, c: { name: 'King II' } })
    await screen.findByText(/No encounters yet/)
    fireEvent.click(screen.getByText('Save enemies as an encounter'))
    const box = screen.getByLabelText('New encounter')
    expect(within(box).getAllByRole('checkbox')).toHaveLength(2)
    expect(box).toHaveTextContent('King (not on the map)')
    expect(within(box).getByText('Save encounter')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Encounter name'), { target: { value: 'Ambush' } })
    fireEvent.change(screen.getByLabelText('Encounter region'), { target: { value: 'Sky City' } })
    fireEvent.click(within(box).getByText('All'))
    fireEvent.click(within(box).getByText('None'))
    fireEvent.click(within(box).getAllByRole('checkbox')[0]!)
    fireEvent.click(within(box).getAllByRole('checkbox')[1]!)
    fireEvent.click(within(box).getAllByRole('checkbox')[1]!)
    await act(async () => fireEvent.click(within(box).getByText('Save encounter')))
    const saved = Object.values(store.getState().encounters!)[0]!
    expect(saved).toMatchObject({ n: 'Ambush', rg: 'Sky City' })
    expect(Object.keys(saved.m)).toEqual(['a'])
    expect(f.writes.some((w) => w[1].startsWith('encounters/'))).toBe(true)
    expect(screen.queryByLabelText('New encounter')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Region Sky City')).toHaveTextContent('Ambush')
  })

  it('a failed save keeps the form; cancel closes it', async () => {
    const { store } = setup({ a: { name: 'Wolf' } })
    await screen.findByText(/No encounters yet/)
    fireEvent.click(screen.getByText('Save enemies as an encounter'))
    fireEvent.change(screen.getByLabelText('Encounter name'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('checkbox'))
    // The picked enemy was removed meanwhile: nothing to save.
    await act(async () => store.getState().removeEnemy('a'))
    await act(async () => fireEvent.click(screen.getByText('Save encounter')))
    expect(screen.getByLabelText('New encounter')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByLabelText('New encounter')).not.toBeInTheDocument()
  })

  it('deploys, shows what is on the table, clears; moves and deletes', async () => {
    const { store, asked } = setup({}, { encounters: { n1: ENC } })
    await act(async () => fireEvent.click(await screen.findByText('Deploy')))
    expect(screen.getByLabelText('Deployed encounters')).toHaveTextContent('Pass (1/1 standing)')
    await act(async () => fireEvent.click(screen.getByText('Clear')))
    expect(screen.queryByLabelText('Deployed encounters')).not.toBeInTheDocument()
    await act(async () => fireEvent.change(screen.getByLabelText('Region of Pass'), { target: { value: 'The Void' } }))
    expect(store.getState().encounters!.n1!.rg).toBe('The Void')
    await act(async () => fireEvent.click(screen.getByText('Delete')))
    expect(asked).toEqual(['Delete the encounter Pass? Enemies on the table stay.'])
    expect(store.getState().encounters).toEqual({})
  })

  it('a deploy whose encounter is gone still shows; delete can be refused', async () => {
    const { store } = setup({ x: { name: 'Wolf', ei: 'gone~1', hp: 1, mx: 1 } }, { encounters: { n1: ENC } }, false)
    expect(await screen.findByLabelText('Deployed encounters')).toHaveTextContent('Encounter (1/1 standing)')
    fireEvent.click(screen.getByText('Delete'))
    expect(store.getState().encounters!.n1).toBeDefined()
  })
})

describe('Encounters panel defaults', () => {
  it("asks with the browser's confirm box; an unnamed enemy shows its id", async () => {
    const f = fakeDb({ encounters: { n1: ENC } })
    const store = createGameStore(() => f.db)
    store.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    store.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', enemies: { zz: {} } })
    const asked: string[] = []
    window.confirm = (q?: string) => (asked.push(String(q)), false)
    render(<EncountersPanel tables={store.getState().tables} actions={store.getState()} startOpen />)
    await act(async () => {})
    cleanup()
    store.setState({ encounters: { n1: ENC } })
    render(<EncountersPanel tables={store.getState().tables} actions={store.getState()} startOpen />)
    fireEvent.click(screen.getByText('Delete'))
    expect(asked).toEqual(['Delete the encounter Pass? Enemies on the table stay.'])
    fireEvent.click(screen.getByText('Save enemies as an encounter'))
    expect(screen.getByLabelText('New encounter')).toHaveTextContent('zz (not on the map)')
  })
})
