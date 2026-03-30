import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TodoItem } from './TodoItem'
import type { Todo } from '../hooks/useTodos'

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  text: 'Test task',
  completed: false,
  createdAt: 1000,
  ...overrides,
})

describe('TodoItem', () => {
  it('отображает текст задачи', () => {
    render(<TodoItem todo={makeTodo()} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Test task')).toBeInTheDocument()
  })

  it('отображает чекбокс в состоянии unchecked для незавершённой задачи', () => {
    render(<TodoItem todo={makeTodo({ completed: false })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('отображает чекбокс в состоянии checked для завершённой задачи', () => {
    render(<TodoItem todo={makeTodo({ completed: true })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('вызывает onToggle с id при клике на чекбокс', () => {
    const onToggle = vi.fn()
    render(<TodoItem todo={makeTodo({ id: 'abc' })} onToggle={onToggle} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('abc')
  })

  it('отображает кнопку удаления', () => {
    render(<TodoItem todo={makeTodo()} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /удалить/i })).toBeInTheDocument()
  })

  it('вызывает onDelete с id при клике на кнопку удаления', () => {
    const onDelete = vi.fn()
    render(<TodoItem todo={makeTodo({ id: 'xyz' })} onToggle={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))
    expect(onDelete).toHaveBeenCalledWith('xyz')
  })

  it('завершённая задача имеет зачёркнутый текст', () => {
    render(<TodoItem todo={makeTodo({ completed: true })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const text = screen.getByText('Test task')
    expect(text).toHaveClass('line-through')
  })

  it('незавершённая задача не имеет зачёркнутого текста', () => {
    render(<TodoItem todo={makeTodo({ completed: false })} onToggle={vi.fn()} onDelete={vi.fn()} />)
    const text = screen.getByText('Test task')
    expect(text).not.toHaveClass('line-through')
  })
})
