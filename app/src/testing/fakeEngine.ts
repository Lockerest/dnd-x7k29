// Test helper (not shipped): a sound engine that records what it is asked to play.
import { vi } from 'vitest'

export function fakeEngine(live = true) {
  const clips = new Set<string>()
  return {
    unlock: vi.fn(() => (live ? ({} as AudioContext) : null)),
    live: vi.fn(() => live),
    sfx: vi.fn(),
    wave: vi.fn(),
    boss: vi.fn(),
    bgStart: vi.fn((_b: unknown, _id: string) => true),
    bgStop: vi.fn(),
    bgId: vi.fn((): string | null => null),
    playTheme: vi.fn((_b: unknown, _d: number) => true),
    playClip: vi.fn((_k: string) => true),
    preview: vi.fn(),
    volumeTest: vi.fn(),
    setReverb: vi.fn(),
    cinematic: { thunk: vi.fn(), glow: vi.fn(), slam: vi.fn(), crack: vi.fn(), collapse: vi.fn() },
    decode: vi.fn(async () => ({ tag: 'buf' }) as unknown as AudioBuffer),
    setClip: vi.fn((k: string, b: AudioBuffer | null) => (b ? clips.add(k) : clips.delete(k))),
    hasClip: vi.fn((k: string) => clips.has(k)),
    clearSlots: vi.fn(() => clips.clear()),
    clearAbilities: vi.fn(),
  }
}
