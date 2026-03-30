import type { Todo } from '../hooks/useTodos'

interface TodoListProps {
  todos: Todo[]
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">Задач нет</p>
    )
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground"
        >
          {todo.text}
        </li>
      ))}
    </ul>
  )
}
