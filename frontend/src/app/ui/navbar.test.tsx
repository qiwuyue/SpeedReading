import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Navbar from './navbar'

describe('Navbar', () => {
  it('toggles mobile menu state from the hamburger button', () => {
    render(<Navbar />)

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })

  it('applies scrolled styles after window scroll', () => {
    const { container } = render(<Navbar />)
    const header = container.querySelector('header')

    expect(header).toHaveClass('bg-transparent')

    Object.defineProperty(window, 'scrollY', {
      value: 50,
      configurable: true,
    })
    fireEvent.scroll(window)

    expect(header?.className).toContain('bg-[rgba(9,9,11,0.82)]')
  })

  it('closes the mobile menu on desktop resize', () => {
    render(<Navbar />)

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(menuButton)

    Object.defineProperty(window, 'innerWidth', {
      value: 800,
      configurable: true,
    })
    fireEvent(window, new Event('resize'))

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
