import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SpeedDemo from './speed-demo'

describe('SpeedDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders with default controls and WPM', () => {
    render(<SpeedDemo />)

    expect(screen.getByText('400 WPM')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try it live' })).toBeInTheDocument()
  })

  it('updates WPM when selecting a preset', () => {
    render(<SpeedDemo />)

    fireEvent.click(screen.getByRole('button', { name: '500' }))

    expect(screen.getByText('500 WPM')).toBeInTheDocument()
  })

  it('starts playback and advances words over time', () => {
    render(<SpeedDemo />)

    expect(screen.getByText('The')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try it live' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(151)
    })

    expect(screen.getByText('key')).toBeInTheDocument()
  })

  it('automatically stops and resets after reaching the end of the demo', () => {
    render(<SpeedDemo />)

    fireEvent.click(screen.getByRole('button', { name: 'Try it live' }))

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByRole('button', { name: 'Try it live' })).toBeInTheDocument()
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
  })
})
