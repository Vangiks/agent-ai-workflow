import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Список задач')
  })

  it('renders TodoInput and empty state', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument()
    expect(screen.getByText('Задач нет')).toBeInTheDocument()
  })
})
