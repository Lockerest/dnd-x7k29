// Attacking from the map: the action menu, what each action costs, attack numbers,
// saves (dodge or parry), damage with phase gates, fatigue and knock-downs, pushing,
// throwing and monster skills. Same rules as the live page's menuHtml, doAct,
// atkInfo, resolveAttack and applyDmg.
import { WEAPON_REACH } from '../data/rules'
import { boardIndex, parryMode, sheetAbilities, type Board } from './board'
import { adjacent, attackInfo, effectKind, gap, isHeavy } from './combat'
import { type Grid } from './table'
import { blocked } from './geometry'
import { fatigueFromDamage, hpCost } from './health'
import { damageEnemy } from './phases'
import { lightHit, type Sheet } from './sheet'
import { abilityCost } from './stamina'
import type { AttackInfo, Enemy, EnemySkill } from './types'

/** A unit on the table: e = monster, id, its sheet, and its key ("c:id" / "e:id"). */
export type U = { e: boolean; id: string; o: Sheet & Enemy; key: string }

/** Attack numbers plus what abilities add: auto-hit, area, critical. */
export type Attack = AttackInfo & { auto?: number | boolean; area?: boolean; crit?: boolean }

const sizeOf = (u: U) => (u.e ? u.o.sz || 1 : 1)

/** Light ("l"), heavy ("h") or ability ("ab", the i-th on the sheet) attack numbers; null for a non-attack. */
export function attackFor(a: U, k: 'l' | 'h' | 'ab', i: number | undefined, board: Board, hideGolden: boolean): Attack | null {
  if (k !== 'ab') return attackInfo(a, k)
  const c = a.o
  const base = attackInfo(a, 'l')
  const ab = sheetAbilities(c, board, hideGolden)[i as number]
  const d = ab && boardIndex(board).attack[ab[0]]
  return d ? { label: ab[0], rng: d.r, dmg: d.d, tb: base.tb, db: base.db, cost: ab[1], cs: abilityCost(c, ab[1]), po: 2, auto: d.t } : null
}

/** Whether a reaction-capable parry applies: not area attacks, not fire, ice, bolt or poison. */
export const parryable = (inf: Attack) => !inf.area && !['fire', 'ice', 'bolt', 'poison'].includes(effectKind(inf.label, !!inf.heavy, inf.rng))

export type MenuButton = { k: string; i?: string | number; label: string; disabled: boolean; warn: boolean; primary?: boolean }
export type Menu = { title: string; buttons: MenuButton[]; notes: string[] }

export type MenuContext = { dm: boolean; myTurn: boolean; board: Board; hideGolden: boolean; enemies: Record<string, Enemy> }

/** The action menu for a (attacker) on t (target): buttons, which are greyed out, and the notes under them. */
export function actionMenu(a: U, t: U, ctx: MenuContext): Menu {
  const c = a.o
  const near = adjacent(a, t)
  const tz = sizeOf(t)
  const mine = a.e || ctx.dm || ctx.myTurn
  const rider = a.e && !t.e && t.o.mon === a.id && !!t.o.mt
  const can = (a.e || (!c.exh && !c.stn && (c.used || 0) < 2 && mine)) && (c.hp as number) > 0 && !rider
  const d = gap(a, t)
  const buttons: MenuButton[] = []
  const bt = (k: string, i: number | undefined, inf: Attack) =>
    buttons.push({
      k,
      ...(i != null ? { i } : {}),
      label: `${inf.label}${inf.cs ? ` · ${inf.cs} St` : ''}${inf.rng > 1 ? ` · range ${inf.rng}` : ''}`,
      disabled: !(can && d <= inf.rng),
      warn: !a.e && !!inf.cs && (c.st as number) < inf.cs,
    })
  bt('l', undefined, attackFor(a, 'l', undefined, ctx.board, ctx.hideGolden)!)
  bt('h', undefined, attackFor(a, 'h', undefined, ctx.board, ctx.hideGolden)!)
  if (a.e) {
    buttons.push({ k: 'aoe', label: 'Area attack (everyone nearby)', disabled: false, warn: false })
    for (const [k2, s2] of Object.entries((c.sk || {}) as Record<string, EnemySkill>)) {
      const area = s2.t === 'a'
      buttons.push({ k: 'sk', i: k2, label: `${s2.n}${area ? ' (area)' : ` · range ${Number(s2.r) || 1}`}`, disabled: !(area || d <= (Number(s2.r) || 1)), warn: false })
    }
    buttons.push({ k: 'sp', label: 'Special attack…', disabled: false, warn: false })
  } else
    sheetAbilities(c, ctx.board, ctx.hideGolden).forEach((x, i) => {
      if (boardIndex(ctx.board).attack[x[0]]) bt('ab', i, attackFor(a, 'ab', i, ctx.board, ctx.hideGolden)!)
    })
  if (!a.e && c.ctr) buttons.push({ k: 'ctr', label: 'Counter attack (free)', disabled: !(d <= (WEAPON_REACH[c.cls as keyof typeof WEAPON_REACH] || 1)), warn: false, primary: true })
  if (!a.e && t.e && tz >= 2) buttons.push({ k: 'mount', label: `Mount (${abilityCost(c, 2)} St)`, disabled: !(near && can && !c.mt), warn: false })
  if (tz === 1) {
    buttons.push({ k: 'push', label: `Push (${abilityCost(c, 1)} St)`, disabled: !(near && can), warn: false })
    if (!a.e && t.e && t.o.stun) buttons.push({ k: 'pick', label: `Pick up (${abilityCost(c, 2)} St)`, disabled: !(near && can), warn: false })
  }
  if (!a.e && t.e) {
    const hid = Object.keys(ctx.enemies).find((i) => ctx.enemies[i]!.hd === a.key)
    if (hid && hid !== t.id)
      buttons.push({
        k: 'throw',
        label: `Throw ${ctx.enemies[hid]!.name} · ${abilityCost(c, 2)} St`,
        disabled: !(can && Math.max(Math.abs((t.o.mx as number) - (c.mx as number)), Math.abs((t.o.my as number) - (c.my as number))) <= 5),
        warn: false,
      })
  }
  const notes: string[] = []
  if (rider) notes.push('This target is riding it: it can only hit them with an area attack.')
  if (!mine) notes.push('It is not your turn: you can only use reactions (Dodge, Parry) or a counter-attack.')
  if (!near) notes.push('Melee, mount, push and pick up need you next to the target. Ranged attacks show their range.')
  return { title: `${c.name} → ${t.o.name}`, buttons, notes }
}

/**
 * Paying for an action (the live page's act): monsters act for free; a hero needs
 * their turn (GM aside), not exhausted, stunned, down or out of actions. Returns
 * 0 (refused), 1 (done) or 2 (done but now exhausted) with the change and log line.
 */
export function payForAction(
  a: U,
  baseCost: number,
  msg: string,
  extra: Record<string, unknown> | undefined,
  dm: boolean,
  myTurn: boolean,
): { status: 0 | 1 | 2; patch?: Record<string, unknown>; msg?: string } {
  if (a.e) return { status: 1 }
  const c = a.o
  if (!dm && !myTurn) return { status: 0 }
  if (c.exh || c.stn || (c.hp as number) <= 0 || (c.used || 0) >= 2) return { status: 0 }
  const p: Record<string, unknown> = { used: (c.used || 0) + 1 }
  const cost = abilityCost(c, baseCost)
  let m = msg + (cost ? ` (-${cost} St)` : '')
  if ((c.st as number) >= cost) {
    p.st = (c.st as number) - cost
    Object.assign(p, extra || {})
  } else {
    Object.assign(p, { st: 0, exh: true, mt: '', mon: null })
    m += ' - out of stamina: EXHAUSTED'
  }
  return { status: p.exh ? 2 : 1, patch: p, msg: m }
}

/** Extra change when a hero uses an ability attack: charging ones stop charging; Golden ones cost HP. */
export const abilityExtra = (c: Sheet, hpPct: number | undefined, charged: boolean) => (charged ? { chg: null } : hpCost(c as Sheet & { hp: number }, hpPct))

/** A save against an attack total: "full" avoids it, "half" takes half damage, "none" takes it all. */
export function saveResult(sv: number, total: number): 'full' | 'half' | 'none' {
  const margin = sv - total
  return margin >= 0 ? 'full' : margin >= -2 ? 'half' : 'none'
}

/** A dice list ("2d6+1d4") as sizes, doubled for a critical hit. */
export function damageDice(dmg: string, crit: boolean, parse: (s: string) => number[]): number[] {
  const d = parse(dmg)
  return crit ? d.concat(d) : d
}

/** Damage from dice results: total plus bonus (at least 1), x SC, times a factor (half damage). */
export const damageTotal = (results: number[], bonus: number, sc: number, factor: number) => Math.max(1, results.reduce((x, y) => x + y, 0) + bonus) * sc * factor

/**
 * What a hit does to its target. Monsters stop at phase gates (and may swap sheets);
 * heroes gain fatigue, and exhausted heroes hit by a monster get knocked down.
 */
export function hitChanges(
  a: U,
  t: U,
  dmg: number,
  heavy: boolean,
  enemies: Record<string, Enemy>,
  ts: number,
): { patch: Record<string, unknown>; msg?: string; gate: false | 'event' | 'swap'; full: boolean; hp: number; knock?: [Record<string, unknown>, string]; line: string } {
  const o = t.o
  let r = { hp: Math.max(0, (o.hp || 0) - dmg), gate: false as false | 'event' | 'swap', full: false }
  let patch: Record<string, unknown>
  let msg: string | undefined
  let knock: [Record<string, unknown>, string] | undefined
  if (t.e) {
    r = damageEnemy(o, dmg, !!(o.nx && enemies[o.nx]))
    patch = { hp: r.hp, ht: ts, hv: dmg }
  } else {
    const fp = fatigueFromDamage(o, dmg, r.hp)
    patch = { hp: r.hp, ht: ts, hv: dmg, ...fp }
    msg = `${a.o.name} hits for ${dmg}${fp.ft !== undefined ? ` (fatigue ${fp.ft}%)` : ''}`
    if (a.e && o.exh) knock = lightHit(o, heavy ? 'h' : 'l')
  }
  const line = `${a.o.name} hits ${o.name} for ${dmg}${r.hp === 0 ? (t.e ? `. ${o.name} is slain!` : `. ${o.name} falls!`) : ''}`
  return { patch, msg, gate: r.gate, full: r.full, hp: r.hp, knock, line }
}

/** The effect shown on every screen for an attack (a hit, a miss, a dodge, a parry). */
export const fxEvent = (a: U, t: U, inf: { label: string; heavy?: boolean; rng: number }, outcome: string, dmg: number, crit: boolean) => ({
  a: a.key,
  t: t.key,
  k: effectKind(inf.label, !!inf.heavy, inf.rng),
  o: outcome,
  d: dmg,
  c: crit,
  an: a.o.name,
  tn: t.o.name,
  l: inf.label,
  ha: isHeavy(t.o),
})

/** A readied reaction on the target: Dodge, or Parry when it applies. */
export function readied(t: Sheet, inf: Attack): 'dodge' | 'parry' | null {
  return t.ddg ? 'dodge' : t.pry && parryable(inf) && parryMode(t) ? 'parry' : null
}

/** Whether the target's player gets the 3-second prompt: monster attacks, on a hero able to react. */
export const canPrompt = (a: U, t: U, inf: Attack) => a.e && t.id !== 'gm' && (t.o.hp as number) > 0 && !t.o.exh && !t.o.stn && !t.o.chg && !inf.area

/**
 * Where a push sends a 1x1 target: one square away from the attacker. "moved" to
 * (x, y); "wall" (off the map, a wall or a wall edge: stunned); or "blocked".
 */
export function pushResult(a: U, t: U, g: Grid | null, taken: (x: number, y: number) => boolean): { kind: 'moved'; x: number; y: number } | { kind: 'wall' } | { kind: 'blocked' } {
  const za = sizeOf(a)
  const tx = t.o.mx as number
  const ty = t.o.my as number
  const nx = tx + Math.sign(tx - ((a.o.mx as number) + (za - 1) / 2))
  const ny = ty + Math.sign(ty - ((a.o.my as number) + (za - 1) / 2))
  const edge = (gg: Grid) => blocked(gg, tx, ty, nx - tx, ny - ty)
  if (g && nx >= 0 && ny >= 0 && nx < g.cols && ny < g.rows && !g.walls.has(`${nx},${ny}`) && !edge(g) && !taken(nx, ny)) return { kind: 'moved', x: nx, y: ny }
  const wall = !g || nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows || g.walls.has(`${nx},${ny}`) || edge(g)
  return wall ? { kind: 'wall' } : { kind: 'blocked' }
}

/** Where a thrown monster lands: the nearest free square around the target, or nowhere. */
export function throwLanding(t: U, g: Grid | null, taken: (x: number, y: number) => boolean): [number, number] | null {
  const zt = sizeOf(t)
  const tx = t.o.mx as number
  const ty = t.o.my as number
  for (let r = 1; r <= zt + 1; r++)
    for (let dx = -r; dx <= zt + r - 1; dx++)
      for (let dy = -r; dy <= zt + r - 1; dy++) {
        const x = tx + dx
        const y = ty + dy
        if (x < 0 || y < 0 || (g && (x >= g.cols || y >= g.rows || g.walls.has(`${x},${y}`))) || taken(x, y) || (x >= tx && x < tx + zt && y >= ty && y < ty + zt)) continue
        return [x, y]
      }
  return null
}

/** A monster skill as an attack: heavy, its own range, auto-hit when marked. */
export const skillAttack = (e: Enemy, sk: EnemySkill, rng: number, auto: boolean): Attack => ({ label: sk.n, rng, dmg: sk.d || '1d8', tb: e.ab ?? 4, db: 0, cost: 0, po: 0, auto, heavy: true })

/** A skill with no damage ("0", "-" or "none") is only announced. */
export const harmlessSkill = (sk: EnemySkill) => ['0', '-', 'none'].includes(String(sk.d || '').trim().toLowerCase())

/** The monster's area attack: its damage twice, on everyone within max(2, reach). */
export const areaAttack = (e: Enemy): Attack => {
  const d0 = e.dm || '1d8'
  return { label: 'Area attack', rng: 99, dmg: `${d0}+${d0}`, tb: 0, db: 0, cost: 0, po: 0, auto: true, heavy: true, area: true }
}
