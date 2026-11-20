// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../db/client'
import { useMarkers, usePictures } from './usePictures'

afterEach(cleanup)

/** A database whose get() answers from a table of paths (an Error value fails the call). */
function db(answers: Record<string, unknown>) {
  const get = vi.fn(async (p: string) => {
    const a = answers[p]
    if (a instanceof Error) throw a
    return a ?? null
  })
  return { d: { get } as unknown as Db, get }
}
const path = (id: string) => `icons/${id}`
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))))

describe('usePictures', () => {
  it('downloads each picture once per version, and again when the version changes', async () => {
    const { d, get } = db({ 'icons/a': { data: 'A1' }, 'icons/b': {} })
    const { result, rerender } = renderHook(({ w, r }) => usePictures(d, w, path, r), { initialProps: { w: { a: 1, b: 1 } as Record<string, unknown>, r: 0 } })
    await flush()
    expect(result.current).toEqual({ a: 'A1' }) // b has no picture data
    rerender({ w: { a: 1, b: 1 }, r: 1 })
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    rerender({ w: { a: 2 }, r: 1 })
    await flush()
    expect(get).toHaveBeenCalledTimes(3)
    expect(result.current).toEqual({ a: 'A1' })
  })

  it('tries a failed download again on the next refresh; nothing without a database', async () => {
    const answers: Record<string, unknown> = { 'icons/a': new Error('offline') }
    const { d, get } = db(answers)
    const { result, rerender } = renderHook(({ r }) => usePictures(d, { a: 1 }, path, r), { initialProps: { r: 0 } })
    await flush()
    expect(result.current).toEqual({})
    answers['icons/a'] = { data: 'A' }
    rerender({ r: 1 })
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    expect(result.current).toEqual({ a: 'A' })
    const none = renderHook(() => usePictures(null, { a: 1 }, path, 0))
    expect(none.result.current).toEqual({})
  })
})

describe('useMarkers', () => {
  it('downloads the custom markers once per version; none without a version', async () => {
    const answers: Record<string, unknown> = { mkicons: { al: { data: 'AL' }, bf: {}, gd: null } }
    const { d, get } = db(answers)
    const { result, rerender } = renderHook(({ v, r }) => useMarkers(d, v, r), { initialProps: { v: 1 as unknown, r: 0 } })
    await flush()
    expect(result.current).toEqual({ al: 'AL' })
    rerender({ v: 1, r: 1 })
    await flush()
    expect(get).toHaveBeenCalledTimes(1)
    rerender({ v: null, r: 1 })
    expect(result.current).toEqual({})
    answers.mkicons = null
    rerender({ v: 2, r: 1 })
    await flush()
    expect(result.current).toEqual({})
  })

  it('tries again after a failure; nothing without a database', async () => {
    const answers: Record<string, unknown> = { mkicons: new Error('offline') }
    const { d, get } = db(answers)
    const { result, rerender } = renderHook(({ r }) => useMarkers(d, 1, r), { initialProps: { r: 0 } })
    await flush()
    answers.mkicons = { al: { data: 'AL' } }
    rerender({ r: 1 })
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    expect(result.current).toEqual({ al: 'AL' })
    expect(renderHook(() => useMarkers(null, 1, 0)).result.current).toEqual({})
  })
})
