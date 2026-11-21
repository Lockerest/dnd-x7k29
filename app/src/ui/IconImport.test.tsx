// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeKit } from '../testing/fakeKit'
import { IconImport } from './IconImport'
import { ImagesContext } from './imageKit'

afterEach(cleanup)

const board = { a: { n: 'Frost Lance', k: 'atk' }, c: { n: 'Heal', k: 'util' } } as never
const enemies = { w: { name: 'Wolf', sk: { s: { n: 'Howl', d: '', r: 1, t: 'a' as const } } } }
const png = (name: string) => new File(['x'], name, { type: 'image/png' })

function show(kit = fakeKit) {
  const setAbilityIcon = vi.fn(async () => {})
  const setSkillIcon = vi.fn(async () => {})
  render(
    <ImagesContext.Provider value={kit}>
      <IconImport board={board} enemies={enemies} setAbilityIcon={setAbilityIcon} setSkillIcon={setSkillIcon} />
    </ImagesContext.Provider>,
  )
  return { setAbilityIcon, setSkillIcon }
}
const pick = async (files: File[]) => {
  fireEvent.change(screen.getByLabelText('Icon files'), { target: { files } })
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))))
}

describe('Import icons', () => {
  it('saves each matched picture, squared, and says what did not match', async () => {
    const { setAbilityIcon, setSkillIcon } = show()
    const input = screen.getByLabelText('Icon files') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Import icons' }))
    expect(click).toHaveBeenCalled()
    await pick([png('Frost Lance.png'), png('Howl.png'), png('Nope.png')])
    expect(setAbilityIcon).toHaveBeenCalledWith('a', 'data:image/png;96x96')
    expect(setSkillIcon).toHaveBeenCalledWith('howl', 'data:image/png;96x96')
    expect(screen.getByText('2 imported; no ability named Nope.png')).toBeInTheDocument()
  })

  it('a picture that cannot be read', async () => {
    const { setAbilityIcon } = show({ ...fakeKit, load: async () => Promise.reject(new Error('bad')) })
    await pick([png('Heal.png')])
    expect(setAbilityIcon).not.toHaveBeenCalled()
    expect(screen.getByText("0 imported; couldn't read Heal.png")).toBeInTheDocument()
  })

  it('choosing nothing does nothing', async () => {
    show()
    await pick([])
    fireEvent.change(screen.getByLabelText('Icon files'), { target: { files: null } })
    expect(screen.queryByText(/imported/)).toBeNull()
  })
})
