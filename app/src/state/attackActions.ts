// Attack actions for the game store: the action menu's buttons, the hit sequence
// (attack roll, the defender's 3-second dodge/parry prompt, damage, stagger and
// phase swaps), and the defender answering the prompt. The rules are in
// logic/attack.ts; this is the live page's doAct, resolveAttack, applyDmg,
// poiseHit and its prompt handlers, in the same order.
import { SC } from '../data/rules'
import type { Db } from '../db/client'
import {
  abilityExtra,
  areaAttack,
  attackFor,
  canPrompt,
  damageDice,
  damageTotal,
  fxEvent,
  harmlessSkill,
  hitChanges,
  parryable,
  payForAction,
  pushResult,
  readied,
  saveResult,
  skillAttack,
  throwLanding,
  type Attack,
  type U,
} from '../logic/attack'
import { boardIndex, boardOrDefault, goldenHidden, parryMode, type Board } from '../logic/board'
import { adjacent, effectKind, gap, isHeavy, poiseHit } from '../logic/combat'
import { approvedIds } from '../logic/characters'
import { unitOf } from '../logic/initiative'
import { isMyTurn, type Sheet } from '../logic/sheet'
import { spend } from '../logic/stamina'
import { mod } from '../logic/stats'
import { grid, occupant, type Maps } from '../logic/table'
import { parseDice } from '../logic/text'
import type { EnemySkill } from '../logic/types'
import { currentMapId } from './sheetActions'
import type { Timers } from './sheetActions'
import type { GameState } from './store'

/** The prompt shown to a defender: who attacks, the total to beat, and whether Parry works. */
export type Qte = { id: number; tid: string; total: number; melee: boolean; par: boolean; from: string; pre?: 'dodge' | 'parry'; res?: string; sv?: { r: number; t: number } }

export type AttackActions = {
  /** The open action menu: attacker and target keys. */
  menu: { a: string; t: string } | null
  openMenu: (a: string, t: string) => void
  closeMenu: () => void
  /** Presses a menu button: k is the action, i the ability index or skill key. */
  act: (k: string, i?: string | number) => Promise<void>
  /** The defender's prompt on this device, while it is up. */
  qte: Qte | null
  /** Checks for a prompt aimed at this player's hero (a readied reaction answers by itself). */
  checkQte: () => Promise<void>
  /** The defender's choice: dodge, parry or none (take it). */
  answerQte: (kind: 'dodge' | 'parry' | 'none') => Promise<void>
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function attackActions(get: Get, set: Set_, save: Save, db: () => Db | null, now: () => number, rand: () => number, later: Timers): AttackActions {
  const sleep = (ms: number) => new Promise<void>((r) => later(() => r(), ms))
  const d20 = () => 1 + Math.floor(rand() * 20)
  const ent = (k: string) => unitOf(get().tables.chars as Record<string, Sheet>, get().tables.enemies, k) as U | null
  // Plays the attack scene here, and shares it so every other screen plays it too.
  const fx = (f: ReturnType<typeof fxEvent>) => {
    get().effects?.scene(f)
    return save((d) => d.post('rolls', { fx: f, ts: now(), by: get().session?.me ?? '' }))
  }
  const say = (line: string) => get().log(line)
  const upd = (u: U, p: Record<string, unknown>, msg?: string) => (u.e ? get().updateEnemy(u.id, p) : get().updateCharacter(u.id, p, msg))
  let qteSeen: number | null = null

  const board = () => boardOrDefault(get().tables.board as Board | null)
  const taken = (x: number, y: number) => {
    const t = get().tables
    return !!occupant(t.chars as Record<string, Sheet>, t.enemies, currentMapId(t, get()), x, y)
  }

  /** A monster's poise takes a hit; at 0 it is staggered. */
  const poise = async (id: string, dmg: number) => {
    const e = get().tables.enemies[id]
    const p = e && poiseHit(e, dmg)
    if (!p) return
    await get().updateEnemy(id, p)
    if (p.stun) await say(`${e!.name} is staggered!`)
  }

  const applyDamage = async (a: U, t: U, dmg: number, inf: Attack) => {
    const ts = now()
    const r = hitChanges(a, t, dmg, !!inf.heavy, get().tables.enemies, ts)
    await fx(fxEvent(a, t, inf, 'hit', dmg, !!inf.crit))
    if (t.e) {
      await get().updateEnemy(t.id, r.patch)
      await poise(t.id, (inf.po || 1) * SC)
      if (r.gate === 'swap') later(() => get().switchPhase(t.id, r.full ? null : r.hp), 1700)
      else if (r.gate) await get().updateEnemy(t.id, { gr: r.hp })
    } else {
      await get().updateCharacter(t.id, r.patch, r.msg)
      if (r.knock) await get().updateCharacter(t.id, r.knock[0], r.knock[1])
    }
    await say(r.line)
  }

  const resolve = async (a: U, t: U, inf: Attack) => {
    const an = a.o.name
    const tn = t.o.name
    const pl = !a.e
    const ac = t.o.ac ?? 12
    const par = parryable(inf)
    const scene = (o: string) => fx(fxEvent(a, t, inf, o, 0, false))

    const deal = async (crit: boolean, fac: number) => {
      const list = damageDice(inf.dmg, crit, parseDice)
      let dmg: number
      if (pl) {
        const res = await get().roll(list, inf.db)
        dmg = damageTotal(res, inf.db, SC, fac)
      } else dmg = Math.max(1, list.reduce((x, d) => x + 1 + Math.floor(rand() * d), 0)) * SC * fac
      await applyDamage(a, t, dmg, { ...inf, crit })
    }

    const finishSave = async (kind: string, sv0: number | null, total: number, crit: boolean, paid: boolean) => {
      // The target as it was when the attack began, like the page.
      const tt = t.o
      const useD = kind === 'dodge'
      if (!useD && !(parryMode(tt) && par)) return deal(crit, 1)
      if (!paid) {
        const [pp, mm] = spend(tt as Sheet & { st: number }, useD ? 3 : 2, useD ? 'Dodge' : 'Parry')
        await get().updateCharacter(t.id, pp, mm)
      }
      let sv = sv0
      if (sv == null) {
        let r = d20()
        if (!useD && parryMode(tt) === 'd') r = Math.min(r, d20())
        sv = r + mod((useD ? tt.dex : tt.str) as number | undefined)
      }
      const res = saveResult(sv, total)
      if (res === 'full') {
        await scene(useD ? 'dodge' : 'parry')
        if (!useD) await get().updateCharacter(t.id, { ctr: true })
        return say(`${tn}${useD ? ' dodges ' : ' parries '}${an}'s attack (save ${sv} vs ${total})${useD ? '' : ' and can counter-attack'}`)
      }
      if (res === 'half') {
        await say(`${tn}${useD ? ' only half dodges' : ' only half parries'} (save ${sv} vs ${total}): half damage`)
        return deal(crit, 0.5)
      }
      await say(`${tn}${useD ? ' fails to dodge' : ' fails to parry'} (save ${sv} vs ${total}): full damage`)
      return deal(crit, 1)
    }

    /** The defender's prompt: waits for their choice and save roll (3.5 s, or 18 s once they chose). */
    const waitSave = async (pre: 'dodge' | 'parry' | null, total: number, melee: boolean, crit: boolean) => {
      const qid = now()
      await save((d) => d.put('qte', { id: qid, tid: t.id, total, melee, par, from: an, ...(pre ? { pre } : {}) }))
      await say(`${an} attacks ${tn}! ${pre ? `${tn} uses a readied ${pre}.` : `${tn} has 3 seconds to react.`}`)
      const t0 = now()
      for (;;) {
        await sleep(350)
        let q: Qte | null = null
        try {
          q = (await db()?.get<Qte>('qte')) ?? null
        } catch {
          // Offline for a moment: keep waiting.
        }
        const mine = !!q && q.id === qid
        if (mine && q!.res && q!.sv) {
          await save((d) => d.del('qte'))
          return finishSave(q!.res, q!.sv.t, total, crit, !!pre)
        }
        const wait = pre || (mine && q!.res) ? 18000 : 3500
        if (now() - t0 > wait) {
          await save((d) => d.del('qte'))
          if (pre) return finishSave(pre, null, total, crit, true)
          if (mine && q!.res) return finishSave(q!.res, null, total, crit, false)
          return deal(crit, 1)
        }
      }
    }

    const onHit = async (nat: number, total: number) => {
      const crit = nat === 20
      const melee = inf.rng <= 1
      const tt = t.o
      if (!t.e && (!inf.auto || inf.area)) {
        const ready = readied(tt, inf)
        const canQ = canPrompt(a, t, inf)
        if (ready) {
          await get().updateCharacter(t.id, ready === 'dodge' ? { ddg: false } : { pry: false })
          return canQ ? waitSave(ready, total, melee, crit) : finishSave(ready, null, total, crit, true)
        }
        if (canQ) return waitSave(null, total, melee, crit)
      }
      return deal(crit, 1)
    }

    if (inf.auto) {
      await say(`${an} uses ${inf.label} on ${tn}${inf.area ? ' (area attack: a readied Dodge Roll can avoid it)' : ' (targeted, no attack roll)'}`)
      return inf.area ? onHit(10, 10 + (inf.tb || 4)) : onHit(0, 0)
    }
    const fin = async (nat: number, m: number) => {
      const total = nat + m
      const hit = nat === 20 || (nat !== 1 && total >= ac)
      if (pl) await say(`${an} rolls ${nat} ${m >= 0 ? `+${m}` : m} = ${total} vs AC ${ac} (${inf.label} on ${tn}): ${nat === 20 ? 'CRITICAL HIT' : hit ? 'HIT' : 'MISS'}`)
      else if (!hit) await say(`${an} misses ${tn} (${inf.label})`)
      return hit ? onHit(nat, total) : scene('miss')
    }
    if (pl) {
      const [r] = await get().roll([20], inf.tb)
      return fin(r!, inf.tb)
    }
    let n = d20()
    const chars = get().tables.chars as Record<string, Sheet>
    if (approvedIds(chars).some((i) => chars[i]!.mon === a.id && chars[i]!.mt)) {
      n = Math.min(n, d20())
      await say(`${an} is struggling with a rider: attacking at disadvantage`)
    }
    return fin(n, inf.tb)
  }

  /** Rolls the defender's save and sends it to the attacker's device. */
  const doSave = async (kind: string) => {
    const c = get().tables.chars[get().session?.me ?? '']
    if (!c) return
    const dis = kind === 'parry' && parryMode(c) === 'd'
    const res = await get().roll(dis ? [20, 20] : [20], mod((kind === 'dodge' ? c.dex : c.str) as number | undefined))
    const r = dis ? Math.min(res[0]!, res[1]!) : res[0]!
    await save((d) => d.put('qte/sv', { r, t: r + mod((kind === 'dodge' ? c.dex : c.str) as number | undefined) }))
  }

  return {
    menu: null,
    openMenu: (a, t) => set({ menu: { a, t } }),
    closeMenu: () => set({ menu: null }),

    act: async (k, i) => {
      const { menu, dm, session, tables } = get()
      const A = menu && ent(menu.a)
      const T = menu && ent(menu.t)
      if (!A || !T) return set({ menu: null })
      if (!dm && A.id !== session?.me) return
      const c = A.o
      const sk0 = k === 'sk' ? (((c.sk || {}) as Record<string, EnemySkill>)[i as string] ?? null) : null
      if (A.e && !T.e && T.o.mon === A.id && T.o.mt && k !== 'aoe' && k !== 'sp' && !(k === 'sk' && sk0?.t === 'a')) return get().notice('It cannot attack its rider, only use an area attack.')
      const an = c.name
      const tn = T.o.name
      const near = adjacent(A, T)
      const tz = T.e ? T.o.sz || 1 : 1
      const myTurn = isMyTurn(tables.ini, A.key)
      const act = async (cost: number, msg: string, extra?: Record<string, unknown>) => {
        const r = payForAction(A, cost, msg, extra, dm, myTurn)
        if (r.patch) await get().updateCharacter(A.id, r.patch, r.msg)
        return r.status
      }
      const b = board()
      const ix = boardIndex(b)
      const charged = new Set(Object.values(b).filter((e) => e && e.ch).map((e) => e.n))

      if (k === 'l' || k === 'h' || k === 'ab' || k === 'ctr') {
        const inf = attackFor(A, k === 'ctr' ? 'l' : (k as 'l' | 'h' | 'ab'), i as number, b, goldenHidden(dm, tables.sp))
        if (!inf) return
        if (k === 'ab' && !A.e && charged.has(inf.label) && c.chg !== inf.label) {
          get().notice('')
          if (await act(inf.cost, `${inf.label}: charging (takes the whole round)`, { chg: inf.label, used: 2, ddg: false, pry: false, ...abilityExtra(c, ix.hpCost[inf.label], false) }))
            await say(`${an} gathers power for ${inf.label}! They are wide open until their next turn.`)
          return
        }
        if (gap(A, T) > inf.rng) return get().notice(`Out of range: ${inf.label} reaches ${inf.rng} square${inf.rng > 1 ? 's' : ''}.`)
        get().notice('')
        let go = true
        if (k === 'ctr') await get().updateCharacter(A.id, { ctr: false }, 'Counter-attack!')
        else {
          const isCh = k === 'ab' && charged.has(inf.label)
          go = !!(await act(isCh ? 0 : inf.cost, `${inf.label} on ${tn}`, k === 'ab' ? abilityExtra(c, ix.hpCost[inf.label], isCh) : {}))
        }
        set({ menu: null })
        if (go) await resolve(A, T, inf)
        return
      } else if (k === 'sk' && A.e) {
        const sk = sk0
        if (!sk) return
        const r = Number(sk.r) || 1
        if (harmlessSkill(sk)) {
          const chars = get().tables.chars as Record<string, Sheet>
          const tg =
            sk.t === 'a'
              ? approvedIds(chars)
                  .map((id) => ent(`c:${id}`)!)
                  .filter((tt) => (tt.o.hp as number) > 0 && tt.o.mx != null && gap(A, tt) <= Math.max(1, Number(sk.r) || 2))[0]
              : gap(A, T) <= r
                ? T
                : null
          if (!tg) return get().notice(`Out of range: ${sk.n} reaches ${r} square(s).`)
          await say(`${an} uses ${sk.n}${sk.t === 'a' ? '!' : ` on ${tg.o.name}`}.`)
          await fx({ a: A.key, t: tg.key, k: effectKind(sk.n, true, r), o: 'hit', d: 0, c: false, an, tn: tg.o.name, l: sk.n, ha: isHeavy(tg.o) })
          return
        }
        if (sk.t === 'a') {
          await say(`${an} uses ${sk.n}!`)
          set({ menu: null })
          for (const id of approvedIds(get().tables.chars)) {
            const tt = ent(`c:${id}`)!
            if ((tt.o.hp as number) <= 0 || tt.o.mx == null) continue
            if (gap(A, tt) <= Math.max(1, Number(sk.r) || 2)) await resolve(A, tt, { ...skillAttack(c, sk, 99, true), area: true })
          }
          return
        }
        if (gap(A, T) > r) return get().notice(`Out of range: ${sk.n} reaches ${r} square(s).`)
        set({ menu: null })
        await resolve(A, T, skillAttack(c, sk, r, !!sk.a))
        return
      } else if (k === 'aoe' && A.e) {
        const inf = areaAttack(c)
        await say(`${an} unleashes an area attack!`)
        set({ menu: null })
        for (const id of approvedIds(get().tables.chars)) {
          const tt = ent(`c:${id}`)!
          if ((tt.o.hp as number) <= 0 || tt.o.mx == null) continue
          if (gap(A, tt) <= Math.max(2, c.er || 1)) await resolve(A, tt, inf)
        }
        return
      } else if (k === 'sp') {
        // The name comes with the button (the page asks for it in a box).
        const nm = String(i ?? '').trim()
        if (nm) await say(`${an} uses ${nm.slice(0, 40)} on ${tn}`)
      } else if (k === 'mount' && near && T.e && tz >= 2 && !A.e && !c.mt) {
        if ((await act(2, `Mounted ${tn}`, { mt: 'climb', mon: T.id, mx: T.o.mx, my: T.o.my })) === 1) await say(`${an} climbs onto ${tn} (Athletics check)`)
      } else if (k === 'push' && near && tz === 1) {
        if ((await act(1, `Pushed ${tn}`)) === 1) {
          const t = get().tables
          const r = pushResult(A, T, grid(t.maps as Maps, currentMapId(t, get())), taken)
          if (r.kind === 'moved') {
            await upd(T, { mx: r.x, my: r.y }, `Pushed by ${an}`)
            await say(`${an} pushes ${tn} back (STR contest)`)
          } else if (r.kind === 'wall') {
            if (T.e) await get().updateEnemy(T.id, { stun: true, rec: true })
            else await get().updateCharacter(T.id, { stn: true }, 'Slammed into a wall: STUNNED')
            await say(`${an} slams ${tn} into the wall: stunned!`)
          } else await say(`${an} tries to push ${tn} but something blocks the way`)
        }
      } else if (k === 'pick' && near && T.e && T.o.stun && tz === 1 && !A.e) {
        if ((await act(2, `Picked up ${tn}`)) === 1) {
          await get().updateEnemy(T.id, { hd: A.key, mx: c.mx, my: c.my })
          await say(`${an} picks up the stunned ${tn}`)
        }
      } else if (k === 'throw' && T.e && !A.e) {
        const en = get().tables.enemies
        const hid = Object.keys(en).find((x) => en[x]!.hd === A.key)
        const H = hid ? en[hid] : undefined
        if (H && hid !== T.id && Math.max(Math.abs((T.o.mx as number) - (c.mx as number)), Math.abs((T.o.my as number) - (c.my as number))) <= 5 && (await act(2, `Threw ${H.name}`)) === 1) {
          const t = get().tables
          const land = throwLanding(T, grid(t.maps as Maps, currentMapId(t, get())), taken)
          await get().updateEnemy(hid!, land ? { hd: null, mx: land[0], my: land[1] } : { hd: null })
          await say(`${an} hurls ${H.name} at ${tn}!`)
          await poise(T.id, 3 * SC)
        }
      }
      set({ menu: null })
    },

    qte: null,

    checkQte: async () => {
      const { dm, session } = get()
      if (dm || !session) return
      let q: Qte | null = null
      try {
        q = (await db()?.get<Qte>('qte')) ?? null
      } catch {
        return
      }
      if (q && q.tid === session.me && !q.res) {
        if (qteSeen === q.id) return
        qteSeen = q.id
        if (q.pre) {
          await save((d) => d.put('qte/res', q.pre))
          set({ qte: q })
          later(() => get().qte?.id === q.id && set({ qte: null }), 4000)
          await doSave(q.pre)
          return
        }
        set({ qte: q })
        later(() => get().qte?.id === q.id && set({ qte: null }), 3000)
      } else if (!q || q.tid !== session.me) set({ qte: null })
    },

    answerQte: async (kind) => {
      set({ qte: null })
      if (kind === 'none') return
      await save((d) => d.put('qte/res', kind))
      await doSave(kind)
    },
  }
}

/** The 3-second prompt's buttons for this hero: whether they can react, and the prices. */
export function promptButtons(c: Sheet, q: Qte) {
  const can = !c.exh && !c.stn && (c.hp as number) > 0 && !c.chg
  const pm = parryMode(c)
  return { can, parry: !!pm && q.par, disadvantage: pm === 'd' }
}
