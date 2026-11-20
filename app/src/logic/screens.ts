// Which screen to show: the same order of checks as the live page's render().
import { isApproved } from './characters'

export type View = 'table' | 'sheet' | 'board' | 'ref'
export type Screen = 'join' | 'table-display' | 'claim-wait' | 'claim-form' | 'create' | 'wait-approval' | 'board' | 'ref' | 'sheet' | 'table'

export function screenFor(s: {
  role: string
  dm: boolean
  me: string
  chars: Record<string, { ap?: boolean | string }>
  view: View
  claimPending: boolean
  claimMode: boolean
}): Screen {
  if (!s.role) return 'join'
  if (s.role === 'table') return 'table-display'
  const mine = s.chars[s.me]
  if (!s.dm && !mine) return s.claimPending ? 'claim-wait' : s.claimMode ? 'claim-form' : 'create'
  if (!s.dm && !isApproved(mine!)) return 'wait-approval'
  if (s.view === 'board') return 'board'
  if (s.view === 'ref') return 'ref'
  if (s.view === 'sheet') return 'sheet'
  return 'table'
}

/** Header buttons: labels and whether they show. */
export function headerFor(s: { role: string; dm: boolean; canGM: boolean; view: View; mine?: { ap?: boolean | string } }) {
  const tabsHidden = !s.role || (!s.dm && !(s.mine && isApproved(s.mine)))
  return {
    roleLabel: s.role ? (s.dm ? 'Game Master' : 'Player') : '',
    leave: !!s.role,
    sheetTab: tabsHidden ? null : s.view === 'sheet' ? 'Table' : 'Sheet',
    boardTab: tabsHidden ? null : s.view === 'board' || s.view === 'ref' ? 'Back to table' : 'Abilities',
    switchRole: !s.canGM || !s.role ? null : s.dm ? 'View as player' : 'Back to GM',
  }
}
