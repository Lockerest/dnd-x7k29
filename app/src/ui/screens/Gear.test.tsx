// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Sheet } from '../../logic/sheet'
import { Gear } from './Gear'

afterEach(cleanup)

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'archer', hp: 100, maxHp: 140, ...o }) as Sheet
const show = (c: Sheet, dm: boolean, own = dm) => {
  const upd = vi.fn()
  const patch = vi.fn()
  render(<Gear c={c} dm={dm} own={own} upd={upd} patch={patch} />)
  return { upd, patch }
}

describe('Weapon & accessories', () => {
  it('the GM sets the tier and gives and takes accessories', () => {
    const { upd, patch } = show(hero({ ao: 'ring_parry' }), true)
    expect(screen.getByText(/Light attack 1d6 \+ DEX \(free\) · Heavy attack 1d10 \+ DEX/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Weapon tier'), { target: { value: '2' } })
    expect(upd).toHaveBeenLastCalledWith([{ wt: 2 }, 'Weapon reforged: Tier 2 (Arachne has fallen)'])
    fireEvent.change(screen.getByLabelText('Give an accessory'), { target: { value: 'am_hearth' } })
    expect(upd).toHaveBeenLastCalledWith([{ ao: 'ring_parry,am_hearth' }, 'Received Hearthstone Amulet'])
    fireEvent.change(screen.getByLabelText('Take an accessory back'), { target: { value: 'ring_parry' } })
    expect(upd).toHaveBeenLastCalledWith([{ ao: null }, 'Gave back Duelist’s Signet'])
    fireEvent.change(screen.getByLabelText('Accessory slot 1'), { target: { value: 'ring_parry' } })
    expect(upd).toHaveBeenLastCalledWith([{ a1: 'ring_parry' }, 'Put on Duelist’s Signet'])
    const n = upd.mock.calls.length
    fireEvent.change(screen.getByLabelText('Accessory slot 2'), { target: { value: '' } }) // nothing to take off
    expect(upd).toHaveBeenCalledTimes(n)
    const box = screen.getByLabelText('Weapon') as HTMLInputElement
    fireEvent.blur(box, { target: { value: ' Dawnpiercer ' } })
    expect(patch).toHaveBeenLastCalledWith({ wn: 'Dawnpiercer' })
    fireEvent.blur(box, { target: { value: '  ' } })
    expect(patch).toHaveBeenLastCalledWith({ wn: null })
  })

  it('the player wears what they were given; one item never fills both slots', () => {
    show(hero({ cls: 'zz', wt: 3, wn: 'Old Fang', ao: 'ring_parry,am_hearth', a1: 'ring_parry' }), false, true)
    expect(screen.getByText('Tier 3 (the Nameless King has fallen)')).toBeInTheDocument()
    expect(screen.getByText(/Light attack 1d10 \+ STR/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Weapon tier')).toBeNull()
    expect(screen.queryByLabelText('Give an accessory')).toBeNull()
    expect(screen.getByText('+1 to every Parry roll.')).toBeInTheDocument()
    const two = screen.getByLabelText('Accessory slot 2')
    expect(two.querySelector('option[value="ring_parry"]')).toBeDisabled()
    expect(screen.getByLabelText('Accessory slot 1').querySelector('option[value="ring_parry"]')).not.toBeDisabled()
  })

  it('others see it read-only; an empty bag says how to get some', () => {
    show(hero({ a1: 'ring_iron', a2: 'zz' }), false, false)
    expect(screen.getByText('Iron Oath Ring (ring)')).toBeInTheDocument()
    expect(screen.getByText('Slot 2: empty')).toBeInTheDocument()
    expect(screen.getByLabelText('Weapon')).toBeDisabled()
    expect(screen.queryByText(/No rings or amulets yet/)).toBeNull()
    cleanup()
    show(hero({ a1: 'zz' }), false, true)
    expect(screen.getByText(/No rings or amulets yet/)).toBeInTheDocument()
    expect(screen.getByLabelText('Accessory slot 1')).toHaveValue('')
  })
})
