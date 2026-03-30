import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TodoFooter } from './TodoFooter'

describe('TodoFooter', () => {
  it('shows active task count', () => {
    render(<TodoFooter activeCount={3} filter="all" onFilterChange={vi.fn()} />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('shows 0 active tasks', () => {
    render(<TodoFooter activeCount={0} filter="all" onFilterChange={vi.fn()} />)
    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it('renders the filter component inside', () => {
    render(<TodoFooter activeCount={1} filter="active" onFilterChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Активные' })).toBeInTheDocument()
  })
})
