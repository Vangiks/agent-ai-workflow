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

  it('toggleTodo переключает completed', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Task') })
    const id = result.current.todos[0].id
    act(() => { result.current.toggleTodo(id) })
    expect(result.current.todos[0].completed).toBe(true)
    act(() => { result.current.toggleTodo(id) })
    expect(result.current.todos[0].completed).toBe(false)
  })

  it('toggleTodo сохраняет изменение в localStorage', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Persist toggle') })
    const id = result.current.todos[0].id
    act(() => { result.current.toggleTodo(id) })
    const stored = JSON.parse(localStorage.getItem('todos') ?? '[]')
    expect(stored[0].completed).toBe(true)
  })

  it('deleteTodo удаляет задачу из списка', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('To delete') })
    const id = result.current.todos[0].id
    act(() => { result.current.deleteTodo(id) })
    expect(result.current.todos).toHaveLength(0)
  })

  it('deleteTodo удаляет задачу из localStorage', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('To delete') })
    const id = result.current.todos[0].id
    act(() => { result.current.deleteTodo(id) })
    const stored = JSON.parse(localStorage.getItem('todos') ?? '[]')
    expect(stored).toHaveLength(0)
  })

  it('deleteTodo удаляет только нужную задачу', () => {
    const { result } = renderHook(() => useTodos())
    act(() => { result.current.addTodo('Keep') })
    act(() => { result.current.addTodo('Delete') })
    const idToDelete = result.current.todos[0].id // 'Delete' prepended
    act(() => { result.current.deleteTodo(idToDelete) })
    expect(result.current.todos).toHaveLength(1)
    expect(result.current.todos[0].text).toBe('Keep')
  })
})
