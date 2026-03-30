import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TodoList } from './TodoList'
import type { Todo } from '../hooks/useTodos'

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  text: 'Test todo',
  completed: false,
  createdAt: 1000,
  ...overrides,
})

describe('TodoList', () => {
  it('shows empty state when no todos', () => {
    render(<TodoList todos={[]} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Задач нет')).toBeInTheDocument()
  })

  it('renders todos when provided', () => {
    const todos = [makeTodo({ id: '1', text: 'First' }), makeTodo({ id: '2', text: 'Second' })]
    render(<TodoList todos={todos} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('does not show empty state when todos exist', () => {
    render(<TodoList todos={[makeTodo()]} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('Задач нет')).not.toBeInTheDocument()
  })
})
