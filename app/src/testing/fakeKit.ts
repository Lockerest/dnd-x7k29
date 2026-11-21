// Test helper (not shipped): picture tools that "encode" to a short text naming
// the canvas size and type, and a way to choose a file in a hidden file box.
import { act, fireEvent, screen } from '@testing-library/react'
import type { ImageKit } from '../ui/images'

export const fakeKit: ImageKit = {
  load: async () => ({ width: 200, height: 100, source: {} as CanvasImageSource }),
  canvas: (w, h) => ({ draw: () => {}, crop: () => {}, toDataURL: (t) => `data:${t};${w}x${h}` }),
}

/** Chooses a picture in the file box labelled "<label> file" and waits for it to be read. */
export async function pickPicture(label: string, nth = 0) {
  fireEvent.change(screen.getAllByLabelText(`${label} file`)[nth]!, { target: { files: [new File(['x'], 'pic.png', { type: 'image/png' })] } })
  await act(async () => void (await new Promise((r) => setTimeout(r, 50))))
}
