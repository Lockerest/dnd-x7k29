// The map picture, drawn exactly like the live page's mapHtml(): the uploaded image,
// reach squares, walls, wall edges and doors, the grid, altars, bonfires, guilds,
// pins, the entry flag, fog and tokens. Built as SVG text so it can be compared
// with the live page's own drawing.
import type { Sheet } from '../../logic/sheet'
import { abilityCost } from '../../logic/stamina'
import { enemyHidden, enemyReach, fogHidden, fogPath, heroReach, onMap, type Grid, type Seer } from '../../logic/table'
import type { Enemy } from '../../logic/types'

/** The live page's HTML escaping. */
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export type MapPicture = {
  g: Grid
  /** The map's uploaded picture. */
  image: string
  chars: Record<string, Sheet>
  enemies: Record<string, Enemy>
  dm: boolean
  /** The selected unit ("c:id" or "e:id"): the GM's pick, or the player's own hero. */
  selected: string | null
  combat: boolean
  /** Token pictures by sheet id (used when the sheet has an icon version, iv). */
  icons: Record<string, string>
  /** Custom altar (al), bonfire (bf) and guild (gd) pictures. */
  markers: Record<string, string>
  /** For the hit flash, which lasts 4.5 s after a hit (ht). */
  now: number
  /** Projector with miniatures on the table: every standing token is a plain black square, so no light lands on the painted minis. */
  minis?: boolean
}

const approved = (c: { ap?: unknown }) => c.ap !== false && c.ap !== 'no'

function wallsSvg(W: Set<string>, cs: number) {
  return [...W]
    .map((k) => {
      const [x, y] = k.split(',') as [string, string]
      return `<rect x="${Number(x) * cs}" y="${Number(y) * cs}" width="${cs}" height="${cs}" style="fill:url(#hatch);stroke:#000;stroke-opacity:.7;stroke-width:${cs / 30}"/>`
    })
    .join('')
}

function edgesSvg(g: Grid) {
  const cs = g.cs
  let d = ''
  g.edges.forEach((k) => {
    const [t, a, b] = k.split(',')
    const x = Number(a)
    const y = Number(b)
    d += t === 'h' ? `M${x * cs} ${y * cs}H${(x + 1) * cs}` : `M${x * cs} ${y * cs}V${(y + 1) * cs}`
  })
  let h = d
    ? `<path d="${d}" style="stroke:#fff;stroke-opacity:.55;stroke-width:${cs * 0.2};stroke-linecap:round;fill:none"/><path d="${d}" style="stroke:#14110e;stroke-width:${cs * 0.11};stroke-linecap:round;fill:none"/>`
    : ''
  for (const q of Object.values(g.m.dr || {}) as { c?: string; o?: unknown; a?: number[]; b?: number[] }[]) {
    if (q.c) {
      const [cx, cy] = q.c.split(',').map(Number) as [number, number]
      const x = cx * cs
      const y = cy * cs
      h += q.o
        ? `<rect x="${x + cs * 0.04}" y="${y + cs * 0.04}" width="${cs * 0.92}" height="${cs * 0.92}" style="fill:none;stroke:#8a5a2b;stroke-width:${cs * 0.06};stroke-dasharray:${cs * 0.12} ${cs * 0.12}"/>`
        : `<rect x="${x + cs * 0.05}" y="${y + cs * 0.05}" width="${cs * 0.9}" height="${cs * 0.9}" rx="${cs * 0.08}" style="fill:#8a5a2b;stroke:#2a1a0a;stroke-width:${cs * 0.05}"/><path d="M${x + cs * 0.5} ${y + cs * 0.1}V${y + cs * 0.9}" style="stroke:#2a1a0a;stroke-width:${cs * 0.03}"/><circle cx="${x + cs * 0.72}" cy="${y + cs * 0.5}" r="${cs * 0.06}" style="fill:#e8c26a"/>`
      continue
    }
    const dl = `M${q.a![0]! * cs} ${q.a![1]! * cs}L${q.b![0]! * cs} ${q.b![1]! * cs}`
    h += q.o
      ? `<path d="${dl}" style="stroke:#8a5a2b;stroke-width:${cs * 0.06};stroke-dasharray:${cs * 0.12} ${cs * 0.12};fill:none"/>`
      : `<path d="${dl}" style="stroke:#fff;stroke-opacity:.6;stroke-width:${cs * 0.22};stroke-linecap:round;fill:none"/><path d="${dl}" style="stroke:#8a5a2b;stroke-width:${cs * 0.13};stroke-linecap:round;fill:none"/>`
  }
  return h
}

const markerImg = (src: string, x: number, y: number, sz: number) => `<image href="${src}" x="${x - sz / 2}" y="${y - sz / 2}" width="${sz}" height="${sz}" preserveAspectRatio="xMidYMid meet"/>`

function tomb(o: { mx?: number | null; my?: number | null; sz?: number; name?: string }, en: boolean, cs: number) {
  const z = en ? o.sz || 1 : 1
  const x = ((o.mx as number) + z / 2) * cs
  const y = ((o.my as number) + z / 2) * cs
  const w = cs * 0.62 * Math.max(1, z * 0.8)
  const h = cs * 0.74 * Math.max(1, z * 0.8)
  return `<g><path d="M${x - w / 2} ${y + h / 2}V${y - h * 0.1}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y - h * 0.1}V${y + h / 2}Z" style="fill:#8a8d94;stroke:#2b2d33;stroke-width:${cs * 0.05}px"/><text x="${x}" y="${y}" text-anchor="middle" style="font:700 ${cs * 0.26}px sans-serif;fill:#2b2d33">✝</text><text x="${x}" y="${y + h / 2 + cs * 0.28}" text-anchor="middle" style="font:700 ${cs * 0.26}px sans-serif;fill:#fff;stroke:#000;stroke-width:${cs * 0.06}px;paint-order:stroke">${esc((o.name || '').slice(0, 14))}</text></g>`
}

/** Spinning stars over a stunned token, falling arrows over an exhausted hero. */
function effects(o: { stun?: unknown; stn?: unknown; exh?: unknown }, en: boolean, x: number, y: number, r: number, cs: number) {
  const stun = en ? o.stun : o.stn
  const t = `stroke:#000;stroke-width:${cs * 0.03}px;paint-order:stroke`
  if (stun) {
    const cy = y - r * 0.95
    return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${x} ${cy}" to="360 ${x} ${cy}" dur="1.4s" repeatCount="indefinite"/>${[0, 1, 2]
      .map((i) => {
        const a = i * 2.094
        return `<text x="${x + Math.cos(a) * r * 0.62}" y="${cy + Math.sin(a) * r * 0.62}" text-anchor="middle" dy=".35em" style="font-size:${cs * 0.34}px;fill:#ffd84d;${t}">★</text>`
      })
      .join('')}</g>`
  }
  if (!en && o.exh)
    return [-1, 0, 1]
      .map(
        (k, i) =>
          `<text x="${x + k * r * 0.6}" y="${y - r}" text-anchor="middle" style="font-size:${cs * 0.3}px;fill:#e0533f;${t}"><animate attributeName="y" values="${y - r * 1.3};${y - r * 0.55}" dur="1s" begin="${i * 0.25}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="1s" begin="${i * 0.25}s" repeatCount="indefinite"/>▼</text>`,
      )
      .join('')
  return ''
}

/** Up to 3 small badges for the heroes climbing a monster. */
function riders(p: MapPicture, id: string, x: number, y: number, r: number, cs: number) {
  return Object.keys(p.chars)
    .filter((i) => approved(p.chars[i]!) && p.chars[i]!.mon === id && p.chars[i]!.mt)
    .slice(0, 3)
    .map((i, k, a) => {
      const c = p.chars[i]!
      const bx = x + (k - (a.length - 1) / 2) * cs * 0.42
      const by = y - r * 0.82
      const rr = cs * 0.2
      const img = c.iv && p.icons[i]
      return (
        `<circle cx="${bx}" cy="${by}" r="${rr}" style="fill:var(--ac);stroke:#fff;stroke-width:${cs / 14}"/>` +
        (img
          ? `<clipPath id="rb${i}"><circle cx="${bx}" cy="${by}" r="${rr}"/></clipPath><image href="${img}" x="${bx - rr}" y="${by - rr}" width="${rr * 2}" height="${rr * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#rb${i})"/>`
          : `<text x="${bx}" y="${by}" text-anchor="middle" dy=".35em" style="fill:#fff;font:600 ${cs * 0.26}px sans-serif">${esc((c.name || '?')[0])}</text>`)
      )
    })
    .join('')
}

/** The whole map picture (the inside of the live page's <svg id="map">). */
export function mapSvg(p: MapPicture): string {
  const { g, dm, chars, enemies } = p
  const { m, cs, cols, rows } = g
  const seers: Seer[] = Object.values(chars).filter(approved)
  const sid = p.selected?.slice(2) ?? ''
  const sEnemy = p.selected?.[0] === 'e'
  const so = p.selected ? (sEnemy ? enemies[sid] : chars[sid]) : undefined
  const c = so && !sEnemy ? (so as Sheet) : null
  const R: Record<string, number> = c && c.mx != null ? heroReach(c, g, p.combat) : so && sEnemy && so.mx != null ? enemyReach(so as Enemy, g) : {}
  let v = `<defs><pattern id="hatch" width="${cs / 4}" height="${cs / 4}" patternUnits="userSpaceOnUse"><path d="M0 0L${cs / 4} ${cs / 4}M${cs / 4} 0L0 ${cs / 4}" style="stroke:#000;stroke-width:${cs / 22}"/></pattern></defs><image href="${p.image}" width="${m.w}" height="${m.h}"/>`
  for (const k in R) {
    if (!R[k]) continue
    const [x, y] = k.split(',') as [string, string]
    const fill = sEnemy ? 'var(--hp)' : p.combat && !c!.exh && abilityCost(c!, R[k]) > (c!.st as number) ? 'var(--ac)' : 'var(--st)'
    v += `<rect x="${Number(x) * cs}" y="${Number(y) * cs}" width="${cs}" height="${cs}" style="fill:${fill};fill-opacity:.35"/>`
  }
  v += `<g id="wl">${wallsSvg(g.walls, cs)}</g>`
  v += edgesSvg(g)
  if (m.grid !== false) {
    let d = ''
    for (let i = 0; i <= cols; i++) d += `M${i * cs} 0V${rows * cs}`
    for (let j = 0; j <= rows; j++) d += `M0 ${j * cs}H${cols * cs}`
    v += `<path d="${d}" style="stroke:#000;stroke-opacity:.9;stroke-width:${Math.max(2, (m.w as number) / 450)};fill:none"/>`
  }
  for (const z of Object.values((m.dz as Record<string, { x: number; y: number; s: number; c: string }>) || {})) {
    const c = /^#[0-9a-f]{3,8}$/i.test(z.c) ? z.c : '#f5c542'
    v += `<rect class="dz" x="${z.x * cs}" y="${z.y * cs}" width="${z.s * cs}" height="${z.s * cs}" style="fill:${c};fill-opacity:.38;stroke:${c};stroke-width:${cs * 0.08}px"><animate attributeName="fill-opacity" values=".25;.5;.25" dur="1.6s" repeatCount="indefinite"/></rect>`
  }
  const spots = (o: unknown) => Object.values((o as Record<string, string>) || {}).map((k) => k.split(',').map(Number) as [number, number])
  v += spots(m.al)
    .map(([ax, ay]) => {
      const cx = (ax + 0.5) * cs
      const cy = (ay + 0.5) * cs
      if (p.markers.al) return markerImg(p.markers.al, cx, cy, cs * 1.2)
      return `<g><circle cx="${cx}" cy="${cy}" r="${cs * 0.52}" style="fill:#ffc830;opacity:.35"><animate attributeName="opacity" values=".2;.5;.2" dur="2.4s" repeatCount="indefinite"/></circle><circle cx="${cx}" cy="${cy}" r="${cs * 0.4}" style="fill:#3a2a08;stroke:#f5c542;stroke-width:${cs * 0.05}px"/><path d="M${cx} ${cy - cs * 0.3}L${cx + cs * 0.2} ${cy}L${cx} ${cy + cs * 0.3}L${cx - cs * 0.2} ${cy}Z" style="fill:#ffd866;stroke:#fff3b0;stroke-width:${cs * 0.02}px"/></g>`
    })
    .join('')
  const emojiSpot = (key: 'bf' | 'gd', emoji: string) =>
    spots(m[key])
      .map(([x, y]) =>
        p.markers[key]
          ? markerImg(p.markers[key]!, (x + 0.5) * cs, (y + 0.5) * cs, cs * 1.2)
          : `<text x="${(x + 0.5) * cs}" y="${(y + 0.5) * cs}" text-anchor="middle" dy=".35em" style="font-size:${cs * 0.8}px">${emoji}</text>`,
      )
      .join('')
  v += emojiSpot('bf', '🔥')
  v += emojiSpot('gd', '🍺')
  for (const pq of Object.values((m.pn as Record<string, { x: number; y: number; l?: string }>) || {})) {
    if (!dm && fogHidden(g, seers, Math.floor(pq.x), Math.floor(pq.y))) continue
    v += `<text x="${pq.x * cs}" y="${pq.y * cs}" text-anchor="middle" dy=".35em" style="font-size:${cs * 0.8}px">📍</text><text x="${pq.x * cs}" y="${(pq.y + 0.8) * cs}" text-anchor="middle" style="font:700 ${cs * 0.34}px sans-serif;fill:#fff;stroke:#000;stroke-width:${cs * 0.07}px;paint-order:stroke">${esc(pq.l || '')}</text>`
  }
  const en0 = m.en as number[] | undefined
  if (dm && en0) v += `<text x="${en0[0]! * cs}" y="${en0[1]! * cs}" text-anchor="middle" dy=".35em" style="font-size:${cs * 0.7}px">🚩</text>`
  if (m.fog) v += `<path id="fgp" d="${fogPath(g, seers)}" style="fill:#000;fill-opacity:${dm ? 0.55 : 1}"/>`

  const token = (o: Sheet | Enemy, key: string, en: boolean) => {
    if (o.mx == null || (en && !dm && enemyHidden(g, seers, o as Enemy))) return ''
    if ((o.hp as number) <= 0) return tomb(o as Enemy, en, cs)
    const id = key.slice(2)
    const z = en ? (o as Enemy).sz || 1 : 1
    if (p.minis) return `<rect x="${o.mx * cs}" y="${(o.my as number) * cs}" width="${z * cs}" height="${z * cs}" style="fill:#000"/>`
    const x = (o.mx + z / 2) * cs
    const y = ((o.my as number) + z / 2) * cs
    const r = cs * (z === 1 ? 0.4 : z * 0.47)
    const sl = key === p.selected ? '#fff' : en ? 'var(--hp)' : '#000'
    const img = (o as { iv?: unknown }).iv && p.icons[id]
    const ring = `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${en ? 'var(--hp)' : 'var(--ac)'};stroke:${sl};stroke-width:${cs / 10}"/>`
    const body = img
      ? ring +
        `<clipPath id="cp${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><image href="${img}" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp${id})"/><circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:${sl};stroke-width:${cs / 10}"/>`
      : ring + `<text x="${x}" y="${y}" text-anchor="middle" dy=".35em" style="fill:#fff;font:600 ${cs * 0.45 * Math.min(z, 2)}px sans-serif">${esc((o.name || '?')[0])}</text>`
    const ht = (o as { ht?: number }).ht
    const hit = !!ht && p.now - ht < 4500
    const shake = hit
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;${-cs * 0.12} 0;${cs * 0.12} ${cs * 0.05};${-cs * 0.08} 0;${cs * 0.08} 0;0 0" dur=".5s" repeatCount="1"/>`
      : ''
    const hv = (o as { hv?: unknown }).hv
    return `<g>${shake}${body}${effects(o as Enemy, en, x, y, r, cs)}${en ? riders(p, id, x, y, r, cs) : ''}${
      hit
        ? `<circle cx="${x}" cy="${y}" r="${r}" style="fill:#ff2a2a;opacity:0"><animate attributeName="opacity" values=".65;0" dur=".7s" repeatCount="1"/></circle><text x="${x}" y="${y - r}" text-anchor="middle" style="font:700 ${cs * 0.4}px sans-serif;fill:#ff5a4d;stroke:#000;stroke-width:${cs * 0.04}px;paint-order:stroke;opacity:0">-${hv || ''}<animate attributeName="y" values="${y - r * 0.6};${y - r * 1.7}" dur="1.2s" repeatCount="1"/><animate attributeName="opacity" values="1;1;0" dur="1.2s" repeatCount="1"/></text>`
        : ''
    }</g>`
  }
  for (const i in enemies) if (onMap(enemies[i]!, g.id) && enemies[i]!.hd) v += token(enemies[i]!, `e:${i}`, true)
  for (const i in enemies) if (onMap(enemies[i]!, g.id) && !enemies[i]!.hd) v += token(enemies[i]!, `e:${i}`, true)
  for (const i in chars) if (approved(chars[i]!) && onMap(chars[i]!, g.id) && !(chars[i]!.mt && chars[i]!.mon)) v += token(chars[i]!, `c:${i}`, false)
  return v
}
