// What this device remembers between visits (localStorage). Every access is
// guarded: private windows and blocked storage simply forget.

export type Role = 'gm' | 'player' | 'table' | ''
export type Session = { pin: string; role: Role; me: string }

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const safe = <T>(f: () => T, fallback: T): T => {
  try {
    return f()
  } catch {
    return fallback
  }
}

/**
 * The table display (#table) keeps its own session, so a shared screen can sit next
 * to a GM tab. prefix keeps the new app's session apart from the live page's while
 * both run on the same site.
 */
export const sessionKey = (hash: string, prefix = '') => prefix + (hash === '#table' ? 'stT' : 'st')

export function loadSession(storage: StorageLike, hash: string, prefix = ''): Partial<Session> {
  return safe(() => JSON.parse(storage.getItem(sessionKey(hash, prefix)) || '{}') as Partial<Session>, {})
}

export function saveSession(storage: StorageLike, hash: string, s: Session, prefix = ''): void {
  safe(() => storage.setItem(sessionKey(hash, prefix), JSON.stringify(s)), undefined)
}

export function clearSession(storage: Pick<Storage, 'removeItem'>, hash: string, prefix = ''): void {
  safe(() => storage.removeItem(sessionKey(hash, prefix)), undefined)
}

export type Prefs = {
  /** Sound effects on, master volume 0..1, boss music on. */
  sound: boolean
  volume: number
  music: boolean
  /** Enemy sheets whose editor is open. */
  openEnemies: string[]
  /** The whole Enemies card folded away, and the GM's Boss abilities list shown (this device). */
  enemiesShut: boolean
  bossList: boolean
  /** The class abilities Reference folded to its title. */
  refShut: boolean
}

export function loadPrefs(storage: StorageLike): Prefs {
  const get = (k: string) => safe(() => storage.getItem(k), null)
  const v = get('sv')
  return {
    sound: get('sn') !== '0',
    volume: v == null ? 0.5 : Math.max(0, Math.min(1, Number(v) || 0)),
    music: get('bgm') !== '0',
    openEnemies: safe(() => {
      const x: unknown = JSON.parse(get('eop') || '[]')
      return Array.isArray(x) ? x.map(String) : []
    }, []),
    enemiesShut: get('ens') === '1',
    bossList: get('bal') === '1',
    refShut: get('rfs') === '1',
  }
}

export function savePrefs(storage: StorageLike, p: Partial<Prefs>): void {
  const set = (k: string, v: string) => safe(() => storage.setItem(k, v), undefined)
  if (p.sound !== undefined) set('sn', p.sound ? '1' : '0')
  if (p.volume !== undefined) set('sv', String(p.volume))
  if (p.music !== undefined) set('bgm', p.music ? '1' : '0')
  if (p.openEnemies !== undefined) set('eop', JSON.stringify(p.openEnemies))
  if (p.enemiesShut !== undefined) set('ens', p.enemiesShut ? '1' : '0')
  if (p.bossList !== undefined) set('bal', p.bossList ? '1' : '0')
  if (p.refShut !== undefined) set('rfs', p.refShut ? '1' : '0')
}
