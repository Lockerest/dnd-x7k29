// Pictures stored in the database (token icons, map images, custom markers), each
// downloaded once per version and again when the GM changes it.
import { useEffect, useRef, useState } from 'react'
import type { Db } from '../db/client'

/**
 * Downloads path(id) for every id in wanted (id -> version), when its version changes.
 * A failed download is tried again when retry changes (pass something that changes
 * on every refresh, like the tables).
 */
export function usePictures(db: Db | null, wanted: Record<string, unknown>, path: (id: string) => string, retry: unknown): Record<string, string> {
  const [got, setGot] = useState<Record<string, { v: unknown; data: string }>>({})
  const asked = useRef<Record<string, unknown>>({})
  const key = JSON.stringify(wanted)
  useEffect(() => {
    if (!db) return
    for (const [id, v] of Object.entries(JSON.parse(key) as Record<string, unknown>)) {
      if (asked.current[id] === v) continue
      asked.current[id] = v
      db.get<{ data?: string }>(path(id)).then(
        (d) => d?.data && setGot((g) => ({ ...g, [id]: { v, data: d.data! } })),
        () => delete asked.current[id],
      )
    }
  }, [db, key, path, retry])
  const out: Record<string, string> = {}
  for (const id of Object.keys(wanted)) if (got[id]) out[id] = got[id].data
  return out
}

/** The custom altar, bonfire and guild pictures (one download per version). */
export function useMarkers(db: Db | null, version: unknown, retry: unknown): Record<string, string> {
  const [got, setGot] = useState<Record<string, string>>({})
  const asked = useRef<unknown>(undefined)
  useEffect(() => {
    if (!db || version == null || asked.current === version) return
    asked.current = version
    db.get<Record<string, { data?: string }>>('mkicons').then(
      (d) => setGot(Object.fromEntries(Object.entries(d || {}).flatMap(([k, x]) => (x?.data ? [[k, x.data]] : [])))),
      () => (asked.current = undefined),
    )
  }, [db, version, retry])
  return version == null ? {} : got
}
