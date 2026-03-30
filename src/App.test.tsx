import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agent AI Workflow')
  })

  it('renders the subtitle', () => {
    render(<App />)
    expect(screen.getByText('Ready to build')).toBeInTheDocument()
  })
})
