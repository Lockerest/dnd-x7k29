// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.
import type { EffectKind } from '../logic/types'

/** Ability-name keywords that pick the hit effect and sound. First match wins. */
export const EFFECT_KEYWORDS: [RegExp, EffectKind][] = [
  [/shield|bash|slam|smash|bonk/i, 'bash'],
  [/fire|flame|burn|ember|inferno|meteor|blaze|pyro|lava/i, 'fire'],
  [/ice|frost|freez|snow|blizzard|cold/i, 'ice'],
  [/bolt|lightning|thunder|shock|spark|arc storm|tempest/i, 'bolt'],
  [/arrow|shot|bow|volley|snipe|pierc/i, 'arrow'],
  [/poison|venom|toxic|acid|spit/i, 'poison'],
]

/** Emoji shown with elemental hits. */
export const EFFECT_EMOJI: Partial<Record<EffectKind, string>> = {
  "fire": "🔥",
  "ice": "❄️",
  "bolt": "⚡",
  "poison": "☠️",
  "bash": "💥"
}
