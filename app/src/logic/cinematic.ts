// The cinematic script: one beat per line, with effects in brackets at the start,
// e.g. "[stagger][glow] His chest begins to glow" or "[wait=3] ...".
import { freshRolls, type RollEntry } from './dice'

export const CINEMATIC_TAGS = ['portrait', 'stagger', 'glow', 'flash', 'shake', 'slam', 'crack', 'collapse', 'black', 'big', 'wait'] as const
export type CinematicTag = (typeof CINEMATIC_TAGS)[number]

export type Beat = {
  /** Tags on this line; a number for [tag=N], otherwise 1. */
  tags: Record<string, number>
  text: string
  /** When the beat starts and how long it holds, in ms. */
  at: number
  duration: number
}

const MAX_LENGTH = 1200

/** Splits a script into beats with their timing. */
export function parseCinematic(script: unknown): Beat[] {
  // The live page starts the first beat at 0.6 ms (almost certainly meant as 0.6 s).
  // Kept identical here for parity; revisit when the cinematic screen moves over.
  let at = 0.6
  return String(script || '')
    .slice(0, MAX_LENGTH)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const tags: Record<string, number> = {}
      const text = line
        .replace(/\[([a-z]+)(?:=([\d.]+))?\]\s*/gi, (_m, a: string, b?: string) => {
          tags[a.toLowerCase()] = b ? Number(b) : 1
          return ''
        })
        .trim()
      const duration = Math.round(tags.wait ? tags.wait * 1000 : Math.max(text ? 2300 : 1200, 1100 + text.length * 55))
      const beat = { tags, text, at, duration }
      at += duration
      return beat
    })
}

/** Total length of the cinematic in seconds (at least 6). */
export function cinematicSeconds(beats: Beat[]): number {
  const end = beats.length ? beats[beats.length - 1]!.at + beats[beats.length - 1]!.duration : 0.6
  return Math.max(6, end / 1000 + 1.8)
}

/** Tags in a script that the player does not know (typos like [glwo]). */
export function unknownTags(script: string): string[] {
  const used = [...script.matchAll(/\[([a-z]+)(?:=[\d.]+)?\]/gi)].map((m) => m[1]!.toLowerCase())
  return [...new Set(used.filter((t) => !(CINEMATIC_TAGS as readonly string[]).includes(t)))]
}

/** A cinematic as it is shared: script, boss name and token key ("e:<id>") for the portrait. */
export type CinematicEvent = { t: string; n: string; k: string }

/** A cinematic someone else started in the last 20 seconds (it plays here too). */
export const othersCinematic = (e: { cin?: CinematicEvent; by?: string; ts?: number }, me: string, now: number): e is { cin: CinematicEvent } => !!e.cin && e.by !== me && now - (e.ts ?? 0) < 20000

/** New cinematics since the last look (see freshRolls), oldest first. */
export function freshCinematics(
  rolls: Record<string, { cin?: CinematicEvent; by?: string; ts?: number } | null | undefined>,
  seen: Set<string>,
  seeded: boolean,
  me: string,
  now: number,
): CinematicEvent[] {
  return freshRolls(rolls as Record<string, RollEntry | null>, seen, seeded)
    .filter((e) => othersCinematic(e as { cin?: CinematicEvent }, me, now))
    .map((e) => e.cin as CinematicEvent)
}
