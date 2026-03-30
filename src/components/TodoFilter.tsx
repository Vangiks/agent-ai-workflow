import type { FilterType } from '../hooks/useTodos'

interface TodoFilterProps {
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
}

const TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
]

export function TodoFilter({ filter, onFilterChange }: TodoFilterProps) {
  return (
    <div className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          data-active={filter === tab.value}
          onClick={() => onFilterChange(tab.value)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            filter === tab.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
