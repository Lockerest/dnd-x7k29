import { expect, it } from 'vitest'
import { errorText } from './errors'

it('reads Error messages and anything else as text', () => {
  expect(errorText(new TypeError('Failed to fetch'))).toBe('Failed to fetch')
  expect(errorText('offline')).toBe('offline')
  expect(errorText(404)).toBe('404')
})
