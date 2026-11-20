// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { grid } from '../../logic/table'
import { MapView } from './MapView'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const g = grid({ m: { w: 500, h: 400, cols: 10 } }, 'm')!
const base = { g, image: 'data:,', chars: {}, enemies: {}, dm: false, selected: null, combat: false, icons: {}, markers: {}, now: 0 }

it('turns a tap into a square; taps outside the grid or without a handler do nothing', () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => ({}) })
  const onTap = vi.fn()
  const { rerender } = render(<MapView {...base} onTap={onTap} />)
  const map = screen.getByRole('img', { name: /^Map:/ })
  fireEvent.pointerDown(map, { clientX: 125, clientY: 75 })
  expect(onTap).toHaveBeenCalledWith(2, 1)
  fireEvent.pointerDown(map, { clientX: 600, clientY: 75 })
  expect(onTap).toHaveBeenCalledTimes(1)
  rerender(<MapView {...base} />)
  fireEvent.pointerDown(map, { clientX: 125, clientY: 75 })
  expect(onTap).toHaveBeenCalledTimes(1)
})
