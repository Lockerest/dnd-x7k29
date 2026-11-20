// Keeps the store in step with the database: a quick read of the small tables
// every few seconds (like the live page), Game Master migrations, and the asset
// versions so big downloads (themes, sounds, icons) can reload lazily.
import type { Db } from '../db/client'
import { scaleCharacter, scaleEnemy } from '../logic/health'
import type { GameStore, Tables } from './store'

/** Version stamps the GM bumps when themes, sounds or icons change. */
export type AssetVersions = { build: number | null; themes: unknown; sounds: unknown; skillIcons: unknown; mapIcons: unknown }

/** The small paths read on every refresh, in the live page's order. */
export function refreshPaths(dm: boolean, me: string): { path: string; query?: Record<string, string> }[] {
  return [
    { path: 'chars' },
    { path: 'enemies' },
    { path: 'maps' },
    { path: 'cur' },
    { path: 'rolls', query: { orderBy: '"$key"', limitToLast: '20' } },
    { path: dm ? 'claims' : `claims/${me}` },
    { path: 'combat' },
    { path: 'init' },
    { path: 'meta/build' },
    { path: 'board' },
    { path: 'meta/mki' },
    { path: 'meta/snd' },
    { path: 'meta/thv' },
    { path: 'meta/sp' },
    { path: 'meta/abv' },
    { path: 'meta/aic' },
    { path: 'meta/skiv' },
  ]
}

/** Old map layouts kept bonfires in bf; they are altars (al) now. */
export function mapMigration(m: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!m || m.v2) return null
  const bf = Object.values((m.bf as Record<string, unknown>) || {})
  return { v2: 1, ...(bf.length ? { al: bf, bf: null } : {}) }
}

export type SyncResult = { changed: boolean; versions: AssetVersions }

/** One refresh: read, migrate old sheets (GM only, once each), apply. */
export async function refresh(store: GameStore, db: Db, migrated: Set<string>): Promise<SyncResult | null> {
  const { session, dm } = store.getState()
  if (!session) return null
  const r = await Promise.all(refreshPaths(dm, session.me).map((p) => db.get<unknown>(p.path, p.query)))
  const [chars, enemies, maps, cur, rolls, claims, combat, ini, build, board, mki, snd, thv, sp, , , skiv] = r as [
    Tables['chars'] | null,
    Tables['enemies'] | null,
    Tables['maps'] | null,
    string | null,
    Tables['rolls'] | null,
    Record<string, unknown> | null,
    unknown,
    Tables['ini'],
    number | null,
    Tables['board'],
    ...unknown[],
  ]
  const t: Tables = {
    chars: { ...(chars || {}) },
    enemies: { ...(enemies || {}) },
    maps: { ...(maps || {}) },
    cur: cur ?? null,
    rolls: rolls || {},
    combat: !!combat,
    ini: ini || null,
    board: board && Object.keys(board).length ? board : null,
    claims: claims || null,
    sp: sp == null ? null : String(sp),
  }
  if (dm) {
    const writes: Promise<unknown>[] = []
    const once = (key: string, path: string, p: Record<string, unknown> | null, apply: (p: Record<string, unknown>) => void) => {
      if (!p || migrated.has(key)) return
      migrated.add(key)
      apply(p)
      writes.push(db.patch(path, p).catch((e: unknown) => store.getState().setError(e)))
    }
    for (const [i, m] of Object.entries(t.maps)) once(`m${i}`, `maps/${i}`, mapMigration(m), (p) => (t.maps[i] = { ...m, ...p }))
    for (const [i, c] of Object.entries(t.chars)) once(`c${i}`, `chars/${i}`, scaleCharacter(c), (p) => (t.chars[i] = { ...c, ...p }))
    for (const [i, e] of Object.entries(t.enemies)) once(`e${i}`, `enemies/${i}`, scaleEnemy(e), (p) => (t.enemies[i] = { ...e, ...p }))
    const changed = store.getState().applySnapshot(t)
    // Saved after the screen updates, so a failed save stays visible (like the live page).
    await Promise.all(writes)
    return { changed, versions: versionsOf(build, thv, snd, skiv, mki) }
  }
  const changed = store.getState().applySnapshot(t)
  return { changed, versions: versionsOf(build, thv, snd, skiv, mki) }
}

const versionsOf = (build: unknown, thv: unknown, snd: unknown, skiv: unknown, mki: unknown): AssetVersions => ({
  build: typeof build === 'number' ? build : null,
  themes: thv ?? null,
  sounds: snd ?? null,
  skillIcons: skiv ?? null,
  mapIcons: mki ?? null,
})

/**
 * Refreshes now and then every `every` ms until stopped. A refresh never overlaps
 * the previous one; failures are shown and retried on the next tick.
 */
export function startSync(
  store: GameStore,
  db: Db,
  opts: { every?: number; onVersions?: (v: AssetVersions) => void; timers?: { set: typeof setInterval; clear: typeof clearInterval } } = {},
): () => void {
  // Wrapped: browsers refuse setInterval called as a method of another object ("Illegal invocation").
  const timers = opts.timers ?? { set: ((f: () => void, ms: number) => setInterval(f, ms)) as typeof setInterval, clear: ((h: number) => clearInterval(h)) as typeof clearInterval }
  const migrated = new Set<string>()
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const r = await refresh(store, db, migrated)
      if (r) opts.onVersions?.(r.versions)
    } catch (e) {
      store.getState().setError(e)
    } finally {
      busy = false
    }
  }
  void tick()
  const h = timers.set(() => void tick(), opts.every ?? 3000)
  return () => timers.clear(h)
}
