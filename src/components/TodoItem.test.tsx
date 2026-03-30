import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TodoItem } from './TodoItem'
import type { Todo } from '../hooks/useTodos'

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  text: 'Test todo',
  completed: false,
  createdAt: 1000,
  ...overrides,
})

describe('TodoItem', () => {
  it('renders a checkbox, text, and delete button', () => {
    render(<TodoItem todo={makeTodo()} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByText('Test todo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('checkbox is unchecked for incomplete todo', () => {
    render(<TodoItem todo={makeTodo({ completed: false })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('checkbox is checked for completed todo', () => {
    render(<TodoItem todo={makeTodo({ completed: true })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onToggle with todo id when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(<TodoItem todo={makeTodo({ id: 'abc' })} onToggle={onToggle} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('abc')
  })

  it('calls onDelete with todo id when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<TodoItem todo={makeTodo({ id: 'xyz' })} onToggle={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('xyz')
  })

  it('completed todo has line-through styling', () => {
    render(<TodoItem todo={makeTodo({ completed: true })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const text = screen.getByText('Test todo')
    expect(text).toHaveClass('line-through')
  })
})
