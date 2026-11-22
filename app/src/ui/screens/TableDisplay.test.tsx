// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyTables, type Tables } from '../../state/store'
import { realSizeBox } from '../../logic/projector'
import { TableDisplay } from './TableDisplay'

afterEach(cleanup)

const memory = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const tables = (t: Partial<Tables> = {}): Tables => ({
  ...emptyTables(),
  maps: { m: MAP },
  cur: 'm',
  chars: { a: { name: 'Lyra', hp: 5, mx: 2, my: 2 }, b: { name: 'Bo', hp: 5, mx: 4, my: 2 }, c: { name: 'New', ap: false, mx: 9, my: 9 } },
  ...t,
})

describe('real size', () => {
  it('scales squares to millimetres and centres on the party (or the map), plus the drag', () => {
    expect(realSizeBox({ sq: 25, pw: 1000 }, 1000, 800, 10, 8, 500, 400, [{ mx: 2, my: 2 }], [0, 0])).toEqual({ width: 250, height: 200, left: 1000 / 2 - 2.5 * 25, top: 400 - 2.5 * 25 })
    expect(realSizeBox({}, 1200, 800, 10, 8, 500, 400, [], [10, -5])).toEqual({ width: 250, height: 200, left: 600 - 5 * 25 + 10, top: 400 - 4 * 25 - 5 })
  })
})

describe('<TableDisplay />', () => {
  const show = (t: Tables, storage = memory(), onLeave = vi.fn()) => {
    render(<TableDisplay tables={t} mapImages={{ m: 'data:m' }} icons={{}} markers={{}} now={() => 1} storage={storage} onLeave={onLeave} size={() => ({ w: 1000, h: 800 })} />)
    return { storage, onLeave }
  }

  it('waits for a map, then fills the screen with it', () => {
    show(tables({ maps: {} }))
    expect(screen.getByText('Waiting for the GM to show a map…')).toBeInTheDocument()
    cleanup()
    show(tables())
    expect(screen.getByRole('img', { name: 'Map: Crypt' }).style.width).toBe('100%')
  })

  it('settings: real size, square size, projected width (remembered), drag and centre, close, leave', () => {
    const { storage, onLeave } = show(tables())
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByLabelText(/Real size/))
    fireEvent.change(screen.getByLabelText(/Square size/), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/Projected width/), { target: { value: '' } })
    expect(JSON.parse(storage.m.get('tv')!)).toEqual({ mode: 'real', sq: 20, pw: 1200 })
    const map = screen.getByRole('img', { name: 'Map: Crypt' })
    const left = parseFloat(map.style.left)
    const tv = document.getElementById('tv')!
    fireEvent.pointerMove(tv, { clientX: 5, clientY: 5 }) // not dragging yet
    fireEvent.pointerDown(tv, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(tv, { clientX: 130, clientY: 90 })
    expect(parseFloat(map.style.left)).toBe(left + 30)
    fireEvent.pointerUp(window)
    fireEvent.pointerMove(tv, { clientX: 300, clientY: 300 })
    expect(parseFloat(map.style.left)).toBe(left + 30)
    fireEvent.click(screen.getByRole('button', { name: 'Center on party' }))
    expect(parseFloat(map.style.left)).toBe(left)
    fireEvent.change(screen.getByLabelText(/Square size/), { target: { value: 'x' } })
    fireEvent.click(screen.getByLabelText(/Fit the map/))
    expect(map.style.width).toBe('100%')
    fireEvent.pointerDown(tv, { clientX: 1, clientY: 1 }) // no dragging in fit mode
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Table view')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave table view' }))
    expect(onLeave).toHaveBeenCalled()
  })

  it('miniatures: tokens become black squares; the picture turns, and drags follow the turn', () => {
    const { storage } = show(tables({ enemies: { w: { name: 'Wolf', hp: 3, mx: 6, my: 1, sz: 2 } } }))
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByLabelText(/Miniatures on the table/))
    const map = screen.getByRole('img', { name: 'Map: Crypt' })
    expect(map.innerHTML).toContain('<rect x="300" y="50" width="100" height="100" style="fill:#000"></rect>')
    expect(map.innerHTML).not.toContain('<circle')
    const turn = map.parentElement!
    expect(turn.style.transform).toBe('translate(-50%, -50%) rotate(0deg)')
    fireEvent.change(screen.getByLabelText('Turn the picture'), { target: { value: '90' } })
    expect(turn.style.transform).toBe('translate(-50%, -50%) rotate(90deg)')
    expect([turn.style.width, turn.style.height]).toEqual(['800px', '1000px'])
    expect(JSON.parse(storage.m.get('tv')!)).toEqual({ bk: true, rot: 90 })
    fireEvent.click(screen.getByLabelText(/Real size/))
    const left = parseFloat(map.style.left)
    const top = parseFloat(map.style.top)
    const tv = document.getElementById('tv')!
    fireEvent.pointerDown(tv, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(tv, { clientX: 130, clientY: 100 })
    expect([parseFloat(map.style.left), parseFloat(map.style.top)]).toEqual([left, top - 30])
  })

  it('a broken or blocked setting store is ignored', () => {
    show(tables({ chars: {} }), memory({ tv: '{bad' }))
    expect(screen.getByRole('img', { name: 'Map: Crypt' }).style.width).toBe('100%')
    cleanup()
    const blocked = {
      getItem: () => '{"mode":"real"}',
      setItem: () => {
        throw new Error('blocked')
      },
    }
    render(<TableDisplay tables={tables()} mapImages={{ m: 'data:m' }} icons={{}} markers={{}} now={() => 1} storage={blocked} onLeave={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByLabelText(/Fit the map/))
    expect(screen.getByRole('img', { name: 'Map: Crypt' }).style.width).toBe('100%')
  })
})
