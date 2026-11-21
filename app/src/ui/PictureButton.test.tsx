// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImagesContext } from './imageKit'
import type { ImageKit } from './images'
import { PictureButton } from './PictureButton'

afterEach(cleanup)

const kit: ImageKit = { load: async () => ({ width: 1, height: 1, source: {} as CanvasImageSource }), canvas: () => ({ draw: () => {}, crop: () => {}, toDataURL: () => '' }) }
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 50))))

describe('<PictureButton />', () => {
  it('opens the file box; the chosen picture is processed with the screen kit and handed on', async () => {
    const onPicture = vi.fn()
    const process = vi.fn(async (k: ImageKit, src: string) => `${k === kit}:${src.slice(0, 10)}`)
    render(
      <ImagesContext.Provider value={kit}>
        <PictureButton process={process} onPicture={onPicture} className="pri">
          Icon
        </PictureButton>
      </ImagesContext.Provider>,
    )
    const input = screen.getByLabelText('Icon file') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Icon' }))
    expect(click).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Icon' })).toHaveClass('pri')
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } })
    await flush()
    expect(onPicture).toHaveBeenCalledWith('true:data:image')
    fireEvent.change(input, { target: { files: [] } })
    await flush()
    expect(onPicture).toHaveBeenCalledTimes(1)
  })

  it('a picture that cannot be read says so (quietly without a handler); the browser kit by default', async () => {
    const onError = vi.fn()
    render(
      <PictureButton process={async () => Promise.reject(new Error('bad'))} onPicture={vi.fn()} onError={onError}>
        <b>Boss art</b>
      </PictureButton>,
    )
    fireEvent.change(screen.getByLabelText('Picture file'), { target: { files: [new File(['x'], 'a.png')] } })
    await flush()
    expect(onError).toHaveBeenCalledWith("Couldn't read that image.")
    cleanup()
    render(
      <PictureButton process={async () => Promise.reject(new Error('bad'))} onPicture={vi.fn()}>
        Icon
      </PictureButton>,
    )
    fireEvent.change(screen.getByLabelText('Icon file'), { target: { files: [new File(['x'], 'a.png')] } })
    await flush()
  })
})
