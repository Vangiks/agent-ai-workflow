import type { FilterType } from '../hooks/useTodos'
import { TodoFilter } from './TodoFilter'

interface TodoFooterProps {
  activeCount: number
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
}

export function TodoFooter({ activeCount, filter, onFilterChange }: TodoFooterProps) {
  return (
    <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
      <span>{activeCount} задач осталось</span>
      <TodoFilter filter={filter} onFilterChange={onFilterChange} />
    </div>
  )
}
