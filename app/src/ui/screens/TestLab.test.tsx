// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SoundTools } from '../sound/useSoundTools'
import { TestLab } from './TestLab'

afterEach(cleanup)

function tools(o: Partial<SoundTools> = {}): SoundTools {
  const f = () => vi.fn(async () => {})
  return {
    slots: ['slash'],
    themes: { arachne: 'Arachne', thewarden: 'The Warden' },
    status: { bs: 'bs status', th: 'th status', ab: 'ab status' },
    refresh: f(),
    previewSlot: vi.fn(),
    uploadSlot: f(),
    removeSlot: f(),
    importBase: f(),
    importAbilities: f(),
    importAbilityFiles: f(),
    removeAbilities: f(),
    previewTheme: f(),
    uploadTheme: f(),
    removeTheme: f(),
    importThemes: f(),
    ...o,
  }
}

function show(o: { ask?: (q: string) => string | null; t?: SoundTools } = {}) {
  const t = o.t ?? tools()
  const lab = { scene: vi.fn(), wave: vi.fn() }
  const onReverb = vi.fn()
  render(
    <TestLab
      chars={{ a: { name: 'Lyra', cls: 'fighter' } }}
      enemies={{ w: { name: 'Wolf' } }}
      board={{ b: { n: 'Firebolt', k: 'atk', r: 0 }, u: { n: 'Heal', k: 'util' } }}
      tools={t}
      lab={lab}
      reverb={0.35}
      onReverb={onReverb}
      ask={o.ask}
    />,
  )
  return { t, lab, onReverb }
}
const audio = (name = 'a.mp3') => new File(['x'], name, { type: 'audio/mpeg' })

describe('the test lab', () => {
  it('picks who, the ability or a generic attack, and plays an outcome or the wave', () => {
    const { lab, t } = show()
    expect(t.refresh).toHaveBeenCalled()
    expect([...screen.getByLabelText('Attacker').querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Test Hero (dummy)', 'Test Dummy (dummy)', 'Lyra (player)', 'Wolf (enemy)'])
    expect([...screen.getByLabelText('Ability').querySelectorAll('option')].map((o) => o.textContent)).toEqual(['(generic attack)', 'Firebolt'])
    fireEvent.click(screen.getByRole('button', { name: 'Hit' }))
    expect(lab.scene).toHaveBeenLastCalledWith(expect.objectContaining({ a: 't:Test Hero', t: 't:Test Dummy', k: 'slash', o: 'hit', l: 'Test' }))
    fireEvent.change(screen.getByLabelText('Attacker'), { target: { value: 'c:a' } })
    fireEvent.change(screen.getByLabelText('Target'), { target: { value: 'e:w' } })
    fireEvent.change(screen.getByLabelText('Generic'), { target: { value: 'ice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Miss' }))
    expect(lab.scene).toHaveBeenLastCalledWith(expect.objectContaining({ an: 'Lyra', tn: 'Wolf', k: 'ice', o: 'miss' }))
    fireEvent.change(screen.getByLabelText('Ability'), { target: { value: 'b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Critical hit' }))
    expect(lab.scene).toHaveBeenLastCalledWith(expect.objectContaining({ k: 'fire', o: 'hit', c: true, d: 240, l: 'Firebolt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Golden Wave' }))
    expect(lab.wave).toHaveBeenCalled()
    expect(screen.getByText('Plays only on your screen: no dice, no damage.')).toBeInTheDocument()
  })
})

describe('custom sounds', () => {
  it('each slot: built-in or custom, Play, Upload, Remove', () => {
    const { t } = show()
    const slash = screen.getByLabelText('Slot: Slash hit')
    expect(slash).toHaveTextContent('Slash hit: custom')
    expect(screen.getByLabelText('Slot: Parry')).toHaveTextContent('Parry: built-in')
    expect(within(screen.getByLabelText('Slot: Parry')).queryByRole('button', { name: 'Remove' })).toBeNull()
    fireEvent.click(within(slash).getByRole('button', { name: 'Play' }))
    expect(t.previewSlot).toHaveBeenCalledWith('slash')
    fireEvent.click(within(slash).getByRole('button', { name: 'Remove' }))
    expect(t.removeSlot).toHaveBeenCalledWith('slash')
    const input = screen.getByLabelText('Sound clip file') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.change(input, { target: { files: [audio()] } }) // nothing picked a slot yet
    expect(t.uploadSlot).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByLabelText('Slot: Parry')).getByRole('button', { name: 'Upload' }))
    expect(click).toHaveBeenCalled()
    const f = audio()
    fireEvent.change(input, { target: { files: [f] } })
    expect(t.uploadSlot).toHaveBeenCalledWith('parry', f)
    fireEvent.change(input, { target: { files: [] } })
    expect(t.uploadSlot).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Import base attack sounds from web' }))
    expect(t.importBase).toHaveBeenCalled()
    expect(screen.getByText('bs status')).toBeInTheDocument()
  })

  it('ability sounds and the reverb', () => {
    const { t, onReverb } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Import from web' }))
    expect(t.importAbilities).toHaveBeenCalled()
    const input = screen.getByLabelText('Ability sound files') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Import files' }))
    expect(click).toHaveBeenCalled()
    const fs = [audio('Firebolt.mp3'), audio('b.mp3')]
    fireEvent.change(input, { target: { files: fs } })
    expect(t.importAbilityFiles).toHaveBeenCalledWith(fs)
    fireEvent.change(input, { target: { files: null } })
    expect(t.importAbilityFiles).toHaveBeenLastCalledWith([])
    fireEvent.click(screen.getByRole('button', { name: 'Remove all' }))
    expect(t.removeAbilities).toHaveBeenCalled()
    expect(screen.getByText('ab status')).toBeInTheDocument()
    expect(screen.getByLabelText('Reverb')).toHaveValue('35')
    fireEvent.change(screen.getByLabelText('Reverb'), { target: { value: '80' } })
    expect(onReverb.mock.calls).toEqual([[0.8]])
  })
})

describe('boss themes', () => {
  it('the main bosses and the added ones: Play, Upload or Replace, Remove', () => {
    const { t } = show()
    expect(screen.getByLabelText('Theme: Aethelric')).toHaveTextContent('Aethelric: none')
    expect(within(screen.getByLabelText('Theme: Aethelric')).queryByRole('button', { name: 'Play' })).toBeNull()
    const ar = screen.getByLabelText('Theme: Arachne')
    expect(ar).toHaveTextContent('Arachne: theme loaded')
    expect(screen.getByLabelText('Theme: The Warden')).toBeInTheDocument()
    fireEvent.click(within(ar).getByRole('button', { name: 'Play' }))
    expect(t.previewTheme).toHaveBeenCalledWith('arachne')
    fireEvent.click(within(ar).getByRole('button', { name: 'Remove' }))
    expect(t.removeTheme).toHaveBeenCalledWith('arachne')
    const input = screen.getByLabelText('Boss theme file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [audio()] } })
    expect(t.uploadTheme).not.toHaveBeenCalled()
    fireEvent.click(within(ar).getByRole('button', { name: 'Replace' }))
    const f = audio()
    fireEvent.change(input, { target: { files: [f] } })
    expect(t.uploadTheme).toHaveBeenCalledWith('arachne', 'Arachne', f)
    fireEvent.click(within(screen.getByLabelText('Theme: Aethelric')).getByRole('button', { name: 'Upload' }))
    fireEvent.change(input, { target: { files: [f] } })
    expect(t.uploadTheme).toHaveBeenLastCalledWith('aethelric', 'Aethelric', f)
    fireEvent.click(screen.getByRole('button', { name: 'Import all boss themes from web' }))
    expect(t.importThemes).toHaveBeenCalled()
    expect(screen.getByText('th status')).toBeInTheDocument()
  })

  it('add another boss theme by name', () => {
    const answers = ['ab', 'The Gatekeeper']
    const ask = vi.fn(() => answers.shift() ?? null)
    const { t } = show({ ask })
    const input = screen.getByLabelText('Boss theme file') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Add another boss theme' }))
    expect(click).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add another boss theme' }))
    expect(ask).toHaveBeenCalledWith('Boss name for this theme (for example the halfway boss):')
    const f = audio()
    fireEvent.change(input, { target: { files: [f] } })
    expect(t.uploadTheme).toHaveBeenCalledWith('thegatekeeper', 'The Gatekeeper', f)
  })

  it('asks with the browser by default', () => {
    const p = vi.spyOn(window, 'prompt').mockReturnValue(null)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Add another boss theme' }))
    expect(p).toHaveBeenCalled()
  })
})
