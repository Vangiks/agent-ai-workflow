import { useTodos } from './hooks/useTodos'
import { TodoInput } from './components/TodoInput'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'

function App() {
  const { filteredTodos, activeCount, filter, setFilter, addTodo, toggleTodo, deleteTodo } = useTodos()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Список задач</h1>
        <div className="space-y-4">
          <TodoInput onAdd={addTodo} />
          <TodoList todos={filteredTodos} onToggle={toggleTodo} onDelete={deleteTodo} />
          <TodoFooter activeCount={activeCount} filter={filter} onFilterChange={setFilter} />
        </div>
      </div>
    </div>
  )
}

export default App
