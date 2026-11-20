// The map tools' wording and prompts (kept apart from the components).
import { pinTargets, type MapEntry, type Tool } from '../../logic/mapTools'
import type { GameState } from '../../state/store'

/** The note under the map for the GM's current tool. */
export function toolNote(tool: Tool, m: MapEntry): string {
  if (tool === 'wall') return ' Tap or drag to draw walls.'
  if (tool === 'dr') return Object.keys(m.dr || {}).length ? ' Tap a door to open or close it.' : ' This map has no doors. Doors only come from an imported Dungeondraft or Dungeon Alchemist map.'
  if (tool === 'nd') return ' Tap a square to place a door there. Tap a door you placed to remove it.'
  if (tool === 'pin') return ' Tap empty ground to add a pin, or tap a pin to travel, rename or delete it.'
  if (tool === 'en') return ' Tap where the party should arrive when they travel to this map through a pin.'
  if (tool === 'rev' || tool === 'hid') return ` Tap or drag to ${tool === 'rev' ? 'reveal' : 'hide'} areas.`
  return ''
}

/** The Pins tool's prompts: what a tap on a pin, or on empty ground, does. */
export function pinPrompts(
  maps: Record<string, MapEntry>,
  id: string,
  tap: { pin: string } | { newPin: { x: number; y: number } },
  ask: (q: string, def?: string) => string | null,
  actions: Pick<GameState, 'travel' | 'renamePin' | 'deletePin' | 'addPin' | 'notice'>,
) {
  if ('pin' in tap) {
    const q = maps[id]!.pn![tap.pin]!
    const c = ask(`Pin "${q.l}" leads to "${maps[q.to]?.name ?? '?'}".\n1 = travel there now (moves the whole party)\n2 = rename\n3 = delete`)
    if (c === '1') return void actions.travel(q.to)
    if (c === '2') {
      const l = ask('New label:', q.l)
      if (l) void actions.renamePin(tap.pin, l)
    } else if (c === '3') void actions.deletePin(tap.pin)
    return
  }
  const ids = pinTargets(maps, id)
  if (!ids.length) return actions.notice('Add another map first, then link a pin to it.')
  const n = parseInt(ask(`Link this pin to which map? Type a number:\n${ids.map((k, i) => `${i + 1}. ${maps[k]!.name}`).join('\n')}`) ?? '') - 1
  const to = ids[n]
  if (!to) return
  const name = String(maps[to]!.name)
  const l = (ask('Pin label (shown on the map):', name) || name).slice(0, 24)
  void actions.addPin(tap.newPin.x, tap.newPin.y, to, l)
}
