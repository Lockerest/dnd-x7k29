// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { RETRY_MS } from './App'
import { APP_VERSION, LEGACY_URL } from './config'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const stubFetch = (impl: () => Promise<Response>) => {
  const f = vi.fn(impl)
  vi.stubGlobal('fetch', f)
  return f
}

describe('<App /> preview page', () => {
  it('shows the title, the version and a link back to the live table', () => {
    stubFetch(() => new Promise(() => {}))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Curse of the Golden Wave' })).toBeInTheDocument()
    expect(screen.getByText(`New app preview, version ${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'live table' })).toHaveAttribute('href', LEGACY_URL)
  })

  it('starts in the checking state', () => {
    stubFetch(() => new Promise(() => {}))
    render(<App />)
    expect(screen.getByTestId('db-status')).toHaveTextContent('Checking the database connection')
  })

  it('pings the database root with a shallow, read-only request', async () => {
    const f = stubFetch(async () => new Response('{}'))
    render(<App />)
    await screen.findByText('Database reachable.')
    expect(f).toHaveBeenCalledTimes(1)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit | undefined]
    expect(url).toMatch(/firebaseio\.com\/\.json\?shallow=true$/)
    expect(init?.method ?? 'GET').toBe('GET')
  })

  it('counts an HTTP error (for example rules blocking the root) as reachable', async () => {
    stubFetch(async () => new Response('denied', { status: 401 }))
    render(<App />)
    expect(await screen.findByTestId('db-status')).toHaveTextContent('Database reachable.')
    expect(screen.getByTestId('db-status')).toHaveClass('ok')
  })

  it('reports a network failure', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    render(<App />)
    expect(await screen.findByText('Database not reachable right now (Failed to fetch). Trying again...')).toHaveClass('error')
  })

  it('reports non-Error rejections as text', async () => {
    stubFetch(() => Promise.reject('offline'))
    render(<App />)
    expect(await screen.findByText('Database not reachable right now (offline). Trying again...')).toBeInTheDocument()
  })

  it('ignores a late answer after it has been closed', async () => {
    let answer!: (r: Response) => void
    stubFetch(() => new Promise<Response>((r) => (answer = r)))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<App />)
    unmount()
    answer(new Response('{}'))
    await new Promise((r) => setTimeout(r, 0))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('ignores a late failure after it has been closed', async () => {
    let fail!: (e: unknown) => void
    stubFetch(() => new Promise<Response>((_, r) => (fail = r)))
    const { unmount } = render(<App />)
    unmount()
    fail(new TypeError('late'))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/not reachable/)).toBeNull()
  })

  it('checks again after a failure: every 10 seconds, when back online, or when the page is shown again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let ok = false
    const f = stubFetch(async () => {
      if (!ok) throw new TypeError('Failed to fetch')
      return new Response('{}')
    })
    const { unmount } = render(<App />)
    expect(await screen.findByText(/not reachable right now/)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(RETRY_MS)
    expect(f).toHaveBeenCalledTimes(2)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(3))
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(f).toHaveBeenCalledTimes(3)
    ok = true
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByText('Database reachable.')).toBeInTheDocument()
    // Reachable now: no more checks.
    await vi.advanceTimersByTimeAsync(RETRY_MS * 3)
    expect(f).toHaveBeenCalledTimes(4)
    unmount()
    window.dispatchEvent(new Event('online'))
    expect(f).toHaveBeenCalledTimes(4)
    vi.useRealTimers()
  })

  it('only the newest check counts when two overlap', async () => {
    const answers: ((ok: boolean) => void)[] = []
    stubFetch(() => new Promise<Response>((res, rej) => answers.push((ok) => (ok ? res(new Response('{}')) : rej(new TypeError('old'))))))
    render(<App />)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(answers).toHaveLength(2))
    answers[1]!(true)
    expect(await screen.findByText('Database reachable.')).toBeInTheDocument()
    answers[0]!(false)
    answers[0]!(true)
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByTestId('db-status')).toHaveTextContent('Database reachable.')
  })
})
