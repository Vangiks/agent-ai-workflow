import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTodos } from './useTodos'

describe('useTodos', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns empty array initially', () => {
    const { result } = renderHook(() => useTodos())
    expect(result.current.todos).toEqual([])
  })

  it('adds a todo with correct structure', () => {
    const { result } = renderHook(() => useTodos())
    act(() => {
      result.current.addTodo('Buy milk')
    })
    expect(result.current.todos).toHaveLength(1)
    const todo = result.current.todos[0]
    expect(todo.text).toBe('Buy milk')
    expect(todo.completed).toBe(false)
    expect(typeof todo.id).toBe('string')
    expect(typeof todo.createdAt).toBe('number')
  })

  it('adds new todos to the beginning of the list', () => {
    const { result } = renderHook(() => useTodos())
    act(() => {
      result.current.addTodo('First')
    })
    act(() => {
      result.current.addTodo('Second')
    })
    expect(result.current.todos[0].text).toBe('Second')
    expect(result.current.todos[1].text).toBe('First')
  })

  it('does not add empty string todo', () => {
    const { result } = renderHook(() => useTodos())
    act(() => {
      result.current.addTodo('')
    })
    expect(result.current.todos).toHaveLength(0)
  })

  it('does not add whitespace-only todo', () => {
    const { result } = renderHook(() => useTodos())
    act(() => {
      result.current.addTodo('   ')
    })
    expect(result.current.todos).toHaveLength(0)
  })

  it('persists todos to localStorage', () => {
    const { result } = renderHook(() => useTodos())
    act(() => {
      result.current.addTodo('Persisted todo')
    })
    const stored = JSON.parse(localStorage.getItem('todos') ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].text).toBe('Persisted todo')
  })

  it('loads todos from localStorage on mount', () => {
    const existing = [{ id: '1', text: 'Existing', completed: false, createdAt: 1000 }]
    localStorage.setItem('todos', JSON.stringify(existing))
    const { result } = renderHook(() => useTodos())
    expect(result.current.todos).toHaveLength(1)
    expect(result.current.todos[0].text).toBe('Existing')
  })

  it('toggleTodo flips completed status', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Toggle me') })
    const id = result.current.todos[0].id
    expect(result.current.todos[0].completed).toBe(false)
    act(() => { result.current.toggleTodo(id) })
    expect(result.current.todos[0].completed).toBe(true)
    act(() => { result.current.toggleTodo(id) })
    expect(result.current.todos[0].completed).toBe(false)
  })

  it('toggleTodo persists to localStorage', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Persist toggle') })
    const id = result.current.todos[0].id
    act(() => { result.current.toggleTodo(id) })
    const stored = JSON.parse(localStorage.getItem('todos') ?? '[]')
    expect(stored[0].completed).toBe(true)
  })

  it('deleteTodo removes the todo', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Delete me') })
    act(() => { result.current.addTodo('Keep me') })
    const deleteId = result.current.todos.find((t) => t.text === 'Delete me')!.id
    act(() => { result.current.deleteTodo(deleteId) })
    expect(result.current.todos).toHaveLength(1)
    expect(result.current.todos[0].text).toBe('Keep me')
  })

  it('deleteTodo persists removal to localStorage', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Remove from storage') })
    const id = result.current.todos[0].id
    act(() => { result.current.deleteTodo(id) })
    const stored = JSON.parse(localStorage.getItem('todos') ?? '[]')
    expect(stored).toHaveLength(0)
  })

  describe('filter', () => {
    it('returns "all" as default filter', () => {
      const { result } = renderHook(() => useTodos())
      expect(result.current.filter).toBe('all')
    })

    it('setFilter changes the active filter', () => {
      const { result } = renderHook(() => useTodos())
      act(() => { result.current.setFilter('active') })
      expect(result.current.filter).toBe('active')
      act(() => { result.current.setFilter('completed') })
      expect(result.current.filter).toBe('completed')
      act(() => { result.current.setFilter('all') })
      expect(result.current.filter).toBe('all')
    })

    it('filteredTodos returns all todos when filter is "all"', () => {
      const { result } = renderHook(() => useTodos())
      act(() => { result.current.addTodo('Active') })
      act(() => { result.current.addTodo('Done') })
      act(() => { result.current.toggleTodo(result.current.todos.find(t => t.text === 'Done')!.id) })
      expect(result.current.filteredTodos).toHaveLength(2)
    })

    it('filteredTodos returns only active todos when filter is "active"', () => {
      const { result } = renderHook(() => useTodos())
      act(() => { result.current.addTodo('Active') })
      act(() => { result.current.addTodo('Done') })
      act(() => { result.current.toggleTodo(result.current.todos.find(t => t.text === 'Done')!.id) })
      act(() => { result.current.setFilter('active') })
      expect(result.current.filteredTodos).toHaveLength(1)
      expect(result.current.filteredTodos[0].text).toBe('Active')
    })

    it('filteredTodos returns only completed todos when filter is "completed"', () => {
      const { result } = renderHook(() => useTodos())
      act(() => { result.current.addTodo('Active') })
      act(() => { result.current.addTodo('Done') })
      act(() => { result.current.toggleTodo(result.current.todos.find(t => t.text === 'Done')!.id) })
      act(() => { result.current.setFilter('completed') })
      expect(result.current.filteredTodos).toHaveLength(1)
      expect(result.current.filteredTodos[0].text).toBe('Done')
    })

    it('filter is not saved to localStorage', () => {
      const { result } = renderHook(() => useTodos())
      act(() => { result.current.setFilter('active') })
      // filter should not appear in localStorage
      const stored = localStorage.getItem('todos')
      expect(stored).not.toContain('active')
    })
  })
})
