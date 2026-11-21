// The picture tools the screens use (the browser's by default; tests give their own).
import { createContext } from 'react'
import { browserImages, type ImageKit } from './images'

export const ImagesContext = createContext<ImageKit | null>(null)

/** The kit from context, or the browser's. */
export const kitOr = (k: ImageKit | null) => k ?? browserImages()
