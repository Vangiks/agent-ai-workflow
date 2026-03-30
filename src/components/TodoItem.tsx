import type { Todo } from '../hooks/useTodos'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="group flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
      <span className={todo.completed ? 'flex-1 line-through text-muted-foreground' : 'flex-1'}>
        {todo.text}
      </span>
      <button
        aria-label="Delete todo"
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
      >
        ✕
      </button>
    </li>
  )
}
