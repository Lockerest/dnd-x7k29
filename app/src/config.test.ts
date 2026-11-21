import { describe, expect, it } from 'vitest'
import { APP_VERSION, DB_URL, LEGACY_URL } from './config'
import legacy from '../../classic/index.html?raw'

describe('config', () => {
  it('points at the same Firebase database as the live page', () => {
    const m = legacy.match(/const DB_URL="([^"]+)"/)
    expect(m?.[1]).toBe(DB_URL)
  })
  it('uses an https Firebase Realtime Database URL without a trailing slash', () => {
    expect(DB_URL).toMatch(/^https:\/\/[a-z0-9-]+\.firebaseio\.com$/)
  })
  it('has a semantic version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
  it('links to the backup page next to the app', () => {
    expect(LEGACY_URL).toBe('classic/')
  })
})
