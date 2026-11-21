// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Zoom } from './Zoom'

afterEach(cleanup)

describe('a picture that opens big', () => {
  it('opens on click with the sharper copy and its name; a click or Escape closes it', () => {
    render(<Zoom src="data:small" full="https://x/big.jpg" name="Rot Claw" className="bai" />)
    expect(screen.getByRole('button', { name: 'View Rot Claw larger' }).querySelector('img')).toHaveAttribute('src', 'data:small')
    fireEvent.click(screen.getByRole('button', { name: 'View Rot Claw larger' }))
    const big = screen.getByRole('dialog', { name: 'Rot Claw' })
    expect(screen.getByRole('img', { name: 'Rot Claw' })).toHaveAttribute('src', 'https://x/big.jpg')
    fireEvent.keyDown(window, { key: 'a' })
    expect(big).toBeInTheDocument()
    fireEvent.click(big)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View Rot Claw larger' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('without a sharper copy it shows the same picture big', () => {
    render(<Zoom src="data:small" name="Cleave" />)
    fireEvent.click(screen.getByRole('button', { name: 'View Cleave larger' }))
    expect(screen.getByRole('img', { name: 'Cleave' })).toHaveAttribute('src', 'data:small')
  })
})
