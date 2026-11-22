import { describe, expect, it } from 'vitest'
import { realSizeBox, turnedDrag, turnedSize } from './projector'

describe('turning the projector picture', () => {
  it('a quarter turn swaps the sides', () => {
    expect(turnedSize(undefined, 1920, 1080)).toEqual({ w: 1920, h: 1080 })
    expect(turnedSize(180, 1920, 1080)).toEqual({ w: 1920, h: 1080 })
    expect(turnedSize(90, 1920, 1080)).toEqual({ w: 1080, h: 1920 })
    expect(turnedSize(270, 1920, 1080)).toEqual({ w: 1080, h: 1920 })
  })

  it('a drag on the screen moves the turned picture the same way on the table', () => {
    expect(turnedDrag(0, 3, 4)).toEqual([3, 4])
    expect(turnedDrag(90, 3, 4)).toEqual([4, -3])
    expect(turnedDrag(180, 3, 4)).toEqual([-3, -4])
    expect(turnedDrag(270, 3, 4)).toEqual([-4, 3])
  })

  it('real size keeps the projector width for millimetres when turned', () => {
    // 1000 px over 1000 mm: 1 px per mm, whatever the turned area is.
    expect(realSizeBox({ sq: 25, pw: 1000 }, 800, 1000, 10, 8, 500, 400, [], [0, 0], 1000).width).toBe(250)
  })
})
