// A button that opens the file box for a picture, resizes it (the way the live
// page does for that kind of picture) and hands it on to be saved.
import { useContext, useRef } from 'react'
import { readFile, type ImageKit } from './images'
import { ImagesContext, kitOr } from './imageKit'

export type PictureButtonProps = {
  /** The button's text. */
  children: React.ReactNode
  /** Resizes and encodes the picture (a data URL in, a data URL out). */
  process: (kit: ImageKit, src: string) => Promise<string>
  onPicture: (data: string) => unknown
  /** Shown when the picture cannot be read. */
  onError?: (text: string) => void
  className?: string
}

export function PictureButton({ children, process, onPicture, onError = () => {}, className }: PictureButtonProps) {
  const kit = kitOr(useContext(ImagesContext))
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className={className} onClick={() => input.current!.click()}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={`${typeof children === 'string' ? children : 'Picture'} file`}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            await onPicture(await process(kit, await readFile(f, 'dataUrl')))
          } catch {
            onError("Couldn't read that image.")
          }
        }}
      />
    </>
  )
}
