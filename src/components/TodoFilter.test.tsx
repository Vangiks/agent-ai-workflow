import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TodoFilter } from './TodoFilter'
import type { FilterType } from '../hooks/useTodos'

describe('TodoFilter', () => {
  it('renders three tabs: Все, Активные, Выполненные', () => {
    render(<TodoFilter filter="all" onFilterChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Активные' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выполненные' })).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    const { rerender } = render(<TodoFilter filter="all" onFilterChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Все' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button', { name: 'Активные' })).toHaveAttribute('data-active', 'false')

    rerender(<TodoFilter filter="active" onFilterChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Активные' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button', { name: 'Все' })).toHaveAttribute('data-active', 'false')
  })

  it('calls onFilterChange with correct value on click', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<TodoFilter filter="all" onFilterChange={onFilterChange} />)

    await user.click(screen.getByRole('button', { name: 'Активные' }))
    expect(onFilterChange).toHaveBeenCalledWith<[FilterType]>('active')

    await user.click(screen.getByRole('button', { name: 'Выполненные' }))
    expect(onFilterChange).toHaveBeenCalledWith<[FilterType]>('completed')

    await user.click(screen.getByRole('button', { name: 'Все' }))
    expect(onFilterChange).toHaveBeenCalledWith<[FilterType]>('all')
  })
})
