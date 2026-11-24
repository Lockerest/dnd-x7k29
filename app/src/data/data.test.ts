// Sanity checks on the game data, so a typo in a table fails the build.
import { describe, expect, it } from 'vitest'
import { isUtilitySkill } from '../logic/skills'
import { abilitySlug, parseDice } from '../logic/text'
import { ABILITY_SOUNDS, AUDIO_BASE, THEME_GROUPS, THEMES, themeUrl } from './audio'
import { CLASSES } from './classes'
import { EFFECT_EMOJI, EFFECT_KEYWORDS } from './effects'
import { ABILITY_DAMAGE, ABILITY_HEAL, CLASS_STAT, SC, WEAPON_REACH } from './rules'
import { SKILL_ICONS } from './icons'
import { SKILL_SETS } from './skillSets'
import { CLASS_RULES } from './classRules'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('classes and rules', () => {
  const ids = Object.keys(CLASSES)
  it('has the eleven classes, each with a stat, a reach and its class rules', () => {
    expect(ids).toHaveLength(11)
    expect(Object.keys(CLASS_RULES).sort()).toEqual([...ids].sort())
    for (const r of Object.values(CLASS_RULES).flat()) expect(r.text.length, r.name).toBeGreaterThan(10)
    expect(Object.keys(CLASS_STAT).sort()).toEqual([...ids].sort())
    expect(Object.keys(WEAPON_REACH).sort()).toEqual([...ids].sort())
  })
  it('every class has positive stats and abilities with a cost and text', () => {
    for (const [id, c] of Object.entries(CLASSES)) {
      expect(c.hp * c.stamina * c.regen, id).toBeGreaterThan(0)
      expect(c.abilities.length, id).toBeGreaterThanOrEqual(3)
      for (const a of c.abilities) {
        expect(a.cost, a.name).toBeGreaterThanOrEqual(1)
        expect(a.text.length, a.name).toBeGreaterThan(5)
      }
    }
  })
  it('damage and healing tables use valid dice and real ability names', () => {
    const names = Object.values(CLASSES).flatMap((c) => c.abilities.map((a) => a.name))
    for (const [n, v] of Object.entries({ ...ABILITY_DAMAGE, ...ABILITY_HEAL })) {
      expect(parseDice(v.dice).length, n).toBeGreaterThan(0)
      expect(names, n).toContain(n)
    }
  })
  it('SC is 10', () => expect(SC).toBe(10))
})

describe('skill sets', () => {
  it('52 sets of valid skills with unique names', () => {
    expect(Object.keys(SKILL_SETS)).toHaveLength(52)
    for (const [set, rows] of Object.entries(SKILL_SETS)) {
      expect(new Set(rows.map((r) => r.name)).size, set).toBe(rows.length)
      for (const r of rows) {
        expect(isUtilitySkill(r.dice) || parseDice(r.dice).length > 0, `${set}: ${r.name}`).toBe(true)
        expect(r.range, r.name).toBeGreaterThanOrEqual(1)
        expect(['s', 'a']).toContain(r.target)
      }
    }
  })
  it('every built-in boss icon is for a boss skill', () => {
    const slugs = new Set(
      Object.values(SKILL_SETS)
        .flat()
        .map((r) => abilitySlug(r.name)),
    )
    expect(Object.keys(SKILL_ICONS).filter((k) => !slugs.has(k))).toEqual([])
  })
  it('every boss skill has a sound', () => {
    const missing = Object.values(SKILL_SETS)
      .flat()
      .map((r) => abilitySlug(r.name))
      .filter((s) => !ABILITY_SOUNDS[s])
    expect(missing).toEqual([])
  })
})

describe('audio', () => {
  it('themes have unique keys and file ids', () => {
    expect(new Set(THEMES.map((t) => t.key)).size).toBe(THEMES.length)
    for (const t of THEMES) expect(t.id, t.key).toMatch(UUID)
  })
  it('ability sound ids are file ids', () => {
    for (const [k, id] of Object.entries(ABILITY_SOUNDS)) {
      expect(id, k).toMatch(UUID)
      expect(k).toBe(abilitySlug(k))
    }
  })
  it('theme URLs', () => {
    expect(AUDIO_BASE).toMatch(/^https:\/\/.+\/$/)
    expect(themeUrl('abc')).toBe(`${AUDIO_BASE}abc.mp3`)
  })
  it('every phase-1 theme in the groups exists', () => {
    const keys = THEMES.map((t) => t.key)
    for (const [boss, g] of Object.entries(THEME_GROUPS)) expect(keys, boss).toContain(g[0])
  })
})

describe('effects', () => {
  it('six keyword groups, each case-insensitive, emoji only for elements', () => {
    expect(EFFECT_KEYWORDS).toHaveLength(6)
    for (const [re] of EFFECT_KEYWORDS) expect(re.flags).toContain('i')
    expect(Object.keys(EFFECT_EMOJI).sort()).toEqual(['bash', 'bolt', 'fire', 'ice', 'poison'])
  })
})
