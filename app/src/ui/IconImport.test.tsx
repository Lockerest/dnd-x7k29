// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeKit } from '../testing/fakeKit'
import { CLASS_ICONS, ICON_BASE, SKILL_ICONS } from '../data/icons'
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

describe('Import icons from web', () => {
  it('downloads each built-in icon and saves it squared', async () => {
    const setAbilityIcon = vi.fn(async () => {})
    const setSkillIcon = vi.fn(async () => {})
    let n = 0
    const download = vi.fn(async () => {
      if (n++ === 1) throw new Error('offline')
      return new Blob(['x'], { type: 'image/jpeg' })
    })
    render(
      <ImagesContext.Provider value={fakeKit}>
        <IconImport board={{ ...(board as object), h2: { n: 'Healing Rain', k: 'heal' } } as never} enemies={{}} setAbilityIcon={setAbilityIcon} setSkillIcon={setSkillIcon} download={download} />
      </ImagesContext.Provider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Import icons from web' }))
    await act(async () => void (await new Promise((r) => setTimeout(r, 100))))
    const total = Object.keys(SKILL_ICONS).length
    expect(download).toHaveBeenCalledWith(ICON_BASE + SKILL_ICONS.skyward_lance)
    expect(setSkillIcon).toHaveBeenCalledTimes(total - 1)
    expect(setSkillIcon).toHaveBeenCalledWith('skyward_lance', 'data:image/png;96x96')
    expect(setAbilityIcon).toHaveBeenCalledTimes(1)
    expect(setAbilityIcon).toHaveBeenCalledWith('h2', 'data:image/png;96x96')
    expect(download).toHaveBeenCalledWith(ICON_BASE + CLASS_ICONS.healing_rain)
    expect(screen.getByText(`${total} icons imported, 1 failed`)).toBeInTheDocument()
  })

  it('downloads with the browser by default', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 404, blob: async () => new Blob() }))
    vi.stubGlobal('fetch', f)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Import icons from web' }))
    expect(await screen.findByText(`0 icons imported, ${Object.keys(SKILL_ICONS).length} failed`, undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(f).toHaveBeenCalledWith(ICON_BASE + SKILL_ICONS.skyward_lance)
    vi.unstubAllGlobals()
    const ok = vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['x']) }))
    vi.stubGlobal('fetch', ok)
    cleanup()
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Import icons from web' }))
    expect(await screen.findByText(`${Object.keys(SKILL_ICONS).length} icons imported`, undefined, { timeout: 5000 })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
