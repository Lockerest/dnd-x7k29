// Live updates from the Firebase REST streaming API (EventSource). Firebase
// sends "put" (replace the value at path) and "patch" (merge children at path)
// events; applyStreamEvent turns one into a new copy of the local tree.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json }
export type StreamEvent = { path: string; data: Json }

const isObj = (v: unknown): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v)

function setAt(tree: Json, parts: string[], value: Json): Json {
  if (!parts.length) return value
  const [head, ...rest] = parts as [string, ...string[]]
  const base: Record<string, Json> = isObj(tree) ? { ...tree } : {}
  const next = setAt(base[head] ?? null, rest, value)
  if (next === null) delete base[head]
  else base[head] = next
  return Object.keys(base).length ? base : null
}

const split = (path: string) => path.split('/').filter(Boolean)

/** Returns the tree after one stream event (the input is not changed). Null removes. */
export function applyStreamEvent(tree: Json, kind: 'put' | 'patch', ev: StreamEvent): Json {
  const parts = split(ev.path)
  if (kind === 'put') return setAt(tree, parts, ev.data)
  if (!isObj(ev.data)) return tree
  let t = tree
  for (const [k, v] of Object.entries(ev.data)) t = setAt(t, [...parts, ...split(k)], v)
  return t
}

/** The parts of EventSource used here (so tests can pass a fake). */
export type ES = { addEventListener: (type: string, f: (e: MessageEvent) => void) => void; close: () => void; onerror: ((e: Event) => void) | null }
export type EventSourceFactory = (url: string) => ES

/**
 * Follows a path live. onChange gets the whole subtree after every change.
 * Returns a function that stops listening.
 */
export function subscribe(url: string, onChange: (tree: Json) => void, open: EventSourceFactory = (u) => new EventSource(u) as unknown as ES): () => void {
  let tree: Json = null
  const es = open(url)
  const on = (kind: 'put' | 'patch') => (e: MessageEvent) => {
    try {
      tree = applyStreamEvent(tree, kind, JSON.parse(String(e.data)) as StreamEvent)
      onChange(tree)
    } catch {
      // A malformed event is skipped; the next full "put" repairs the tree.
    }
  }
  es.addEventListener('put', on('put'))
  es.addEventListener('patch', on('patch'))
  // Errors (network drops) are retried by the browser; nothing to do here.
  es.onerror = () => {}
  return () => es.close()
}
