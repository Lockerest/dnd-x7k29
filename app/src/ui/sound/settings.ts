// This device's scene and sound settings, in the same browser storage keys as the
// live page (so a choice made on one carries over to the other).
export type FxSettings = { scenes: boolean; s25: boolean; sound: boolean; volume: number; reverb: number }

type Store = Pick<Storage, 'getItem' | 'setItem'>

const unit = (v: string | null) => (v == null ? 0.5 : Math.max(0, Math.min(1, +v || 0)))

export function loadFxSettings(s: Store): FxSettings {
  return { scenes: s.getItem('sc') !== '0', s25: s.getItem('s25') !== '0', sound: s.getItem('sn') !== '0', volume: unit(s.getItem('sv')), reverb: unit(s.getItem('rv')) }
}

const KEYS: Record<keyof FxSettings, string> = { scenes: 'sc', s25: 's25', sound: 'sn', volume: 'sv', reverb: 'rv' }

export function saveFxSettings(s: Store, p: Partial<FxSettings>) {
  for (const [k, v] of Object.entries(p) as [keyof FxSettings, boolean | number][]) s.setItem(KEYS[k], typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
}
