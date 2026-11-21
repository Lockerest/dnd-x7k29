// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ICON_BASE, SKILL_ICONS } from '../../data/icons'
import { BossAbilities } from './BossAbilities'

afterEach(cleanup)

describe("the GM's Boss abilities list", () => {
  it('each boss by phase: icon, damage, reach, what it does, and a note', () => {
    const onNote = vi.fn()
    render(<BossAbilities icons={{ warden_s_cut: 'data:mine' }} notes={{ rime_guard: 'Blocks once.' }} onNote={onNote} />)
    const list = screen.getByLabelText('Boss abilities')
    expect(within(list).getByRole('heading', { name: 'first encounter (3)' })).toBeInTheDocument()
    const cut = within(list).getAllByLabelText("Boss ability Warden's Cut")[0]!
    expect(cut.querySelector('img')).toHaveAttribute('src', 'data:mine') // the table's own icon first
    expect(cut).toHaveTextContent('2d8')
    expect(cut).toHaveTextContent('1 square, one target')
    expect(within(list).getAllByLabelText('Notes: Rime Guard')[0]).toHaveValue('Blocks once.')
    const note = within(list).getAllByLabelText('Notes: Chain Pull')[0]!
    fireEvent.change(note, { target: { value: 'Pulls 3 squares.' } })
    fireEvent.blur(note)
    expect(onNote).toHaveBeenCalledWith('chain_pull', 'Pulls 3 squares.')

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
    render(<BossAbilities notes={{}} onNote={vi.fn()} />)
    expect(screen.getAllByLabelText("Boss ability Warden's Cut")[0]!.querySelector('img')).toHaveAttribute('src', ICON_BASE + SKILL_ICONS.warden_s_cut)
  })
})
