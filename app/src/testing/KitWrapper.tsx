// Test helper (not shipped): wraps a screen with the fake picture tools.
import { ImagesContext } from '../ui/imageKit'
import { fakeKit } from './fakeKit'

export function FakeKit({ children }: { children: React.ReactNode }) {
  return <ImagesContext.Provider value={fakeKit}>{children}</ImagesContext.Provider>
}
