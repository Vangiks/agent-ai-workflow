import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TodoInput } from './TodoInput'

describe('TodoInput', () => {
  it('renders an input and a button', () => {
    render(<TodoInput onAdd={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument()
  })

  it('calls onAdd with input value when button clicked', () => {
    const onAdd = vi.fn()
    render(<TodoInput onAdd={onAdd} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'New task' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(onAdd).toHaveBeenCalledWith('New task')
  })

  it('calls onAdd when Enter is pressed', () => {
    const onAdd = vi.fn()
    render(<TodoInput onAdd={onAdd} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Enter task' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onAdd).toHaveBeenCalledWith('Enter task')
  })

  it('clears the input after adding', () => {
    const onAdd = vi.fn()
    render(<TodoInput onAdd={onAdd} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Task to clear' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(input).toHaveValue('')
  })

  it('does not call onAdd for empty input', () => {
    const onAdd = vi.fn()
    render(<TodoInput onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(onAdd).not.toHaveBeenCalled()
  })
})
