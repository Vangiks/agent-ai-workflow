import { useState, useEffect } from 'react'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

const STORAGE_KEY = 'todos'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (JSON.parse(stored) as Todo[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  function addTodo(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const todo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    }
    setTodos((prev) => [todo, ...prev])
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  return { todos, addTodo, toggleTodo, deleteTodo }
}
