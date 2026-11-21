// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ICON_BASE, SKILL_ICONS } from '../../data/icons'
import { BossAbilities } from './BossAbilities'

afterEach(cleanup)

const show = (o: { open?: boolean; icons?: Record<string, string>; notes?: Record<string, string> } = {}) => {
  const p = { onOpen: vi.fn(), onNote: vi.fn(), onPlay: vi.fn() }
  render(<BossAbilities open={o.open ?? true} icons={o.icons} notes={o.notes ?? {}} {...p} />)
  return p
}

describe("the GM's Boss abilities list", () => {
  it('folded to its title until opened', () => {
    const p = show({ open: false })
    expect(screen.getByRole('heading', { name: 'Boss abilities' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aethelric' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show or hide the Boss abilities' }))
    expect(p.onOpen).toHaveBeenCalledWith(true)
    cleanup()
    const q = show()
    fireEvent.click(screen.getByRole('button', { name: 'Show or hide the Boss abilities' }))
    expect(q.onOpen).toHaveBeenCalledWith(false)
  })

  it('each boss by phase: icon, sound, damage, reach, what it does, and a note', () => {
    const p = show({ icons: { warden_s_cut: 'data:mine' }, notes: { rime_guard: 'Blocks once.' } })
    const list = screen.getByLabelText('Boss abilities')
    expect(within(list).getByRole('heading', { name: 'first encounter (3)' })).toBeInTheDocument()
    const cut = within(list).getAllByLabelText("Boss ability Warden's Cut")[0]!
    expect(cut.querySelector('img')).toHaveAttribute('src', 'data:mine') // the table's own icon first
    expect(cut).toHaveTextContent('2d8')
    expect(cut).toHaveTextContent('1 sq, single')
    expect(cut).toHaveTextContent('A fast frostbitten slash at one hero.')
    fireEvent.click(within(cut).getByRole('button', { name: "Play the sound of Warden's Cut" }))
    expect(p.onPlay).toHaveBeenCalledWith("Warden's Cut")
    expect(within(list).getAllByLabelText('Notes: Rime Guard')[0]).toHaveValue('Blocks once.')
    const note = within(list).getAllByLabelText('Notes: Chain Pull')[0]!
    fireEvent.blur(note) // nothing changed: nothing saved
    fireEvent.change(note, { target: { value: 'Pulls 3 squares.' } })
    fireEvent.blur(note)
    expect(p.onNote.mock.calls).toEqual([['chain_pull', 'Pulls 3 squares.']])

    fireEvent.click(within(list).getByRole('button', { name: 'Nameless King' }))
    const wager = within(list).getAllByLabelText("Boss ability Storm's Wager")[0]!
    expect(wager).toHaveTextContent('Roll a d4 in the open')
    expect(wager).toHaveTextContent('—')
    expect(wager.querySelector('img')).toHaveAttribute('src', ICON_BASE + SKILL_ICONS.storm_s_wager)
    // A move with no icon anywhere shows none.
    fireEvent.click(within(list).getByRole('button', { name: 'Kernunos' }))
    expect(within(list).getAllByLabelText('Boss ability Antler Gore')[0]!.querySelector('img')).toBeNull()
  })

  it('built-in icons only, when the table has none', () => {
    show()
    expect(screen.getAllByLabelText("Boss ability Warden's Cut")[0]!.querySelector('img')).toHaveAttribute('src', ICON_BASE + SKILL_ICONS.warden_s_cut)
  })
})
