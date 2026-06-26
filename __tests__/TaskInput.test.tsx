import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskInput from '@/components/TaskInput'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => true,
    motion: {
      ...actual.motion,
      button: ({ children, ...props }: React.ComponentProps<'button'>) => (
        <button {...props}>{children}</button>
      ),
    },
  }
})

describe('TaskInput', () => {
  const mockOnAddTask = jest.fn()

  beforeEach(() => {
    mockOnAddTask.mockClear()
  })

  it('renders the input and button', () => {
    render(<TaskInput onAddTask={mockOnAddTask} />)
    expect(screen.getByRole('textbox', { name: /new task title/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
  })

  it('calls onAddTask with the input value when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, 'Buy groceries')
    await user.keyboard('{Enter}')

    expect(mockOnAddTask).toHaveBeenCalledTimes(1)
    expect(mockOnAddTask).toHaveBeenCalledWith('Buy groceries')
  })

  it('calls onAddTask when Add Task button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, 'Write tests')

    const button = screen.getByRole('button', { name: /add task/i })
    await user.click(button)

    expect(mockOnAddTask).toHaveBeenCalledWith('Write tests')
  })

  it('clears the input after task is added', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, 'Clean desk')
    await user.keyboard('{Enter}')

    expect(input).toHaveValue('')
  })

  it('does not call onAddTask when input is empty', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    await user.keyboard('{Enter}')

    expect(mockOnAddTask).not.toHaveBeenCalled()
  })

  it('does not call onAddTask when input is only whitespace', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, '   ')
    await user.keyboard('{Enter}')

    expect(mockOnAddTask).not.toHaveBeenCalled()
  })

  it('trims whitespace from the submitted task title', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, '  Padded task  ')
    await user.keyboard('{Enter}')

    // The component passes the trimmed value to onAddTask only if trimmed is truthy
    expect(mockOnAddTask).toHaveBeenCalledWith('Padded task')
  })

  it('Add Task button is disabled when input is empty', () => {
    render(<TaskInput onAddTask={mockOnAddTask} />)
    const button = screen.getByRole('button', { name: /add task/i })
    expect(button).toBeDisabled()
  })

  it('Add Task button is enabled when input has text', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    await user.type(input, 'Some task')

    const button = screen.getByRole('button', { name: /add task/i })
    expect(button).not.toBeDisabled()
  })

  it('shows character count hint when input is near max length', async () => {
    const user = userEvent.setup()
    render(<TaskInput onAddTask={mockOnAddTask} />)

    const input = screen.getByRole('textbox', { name: /new task title/i })
    // Type 151 characters to trigger the counter (> 150)
    await user.type(input, 'a'.repeat(151))

    expect(screen.getByText('49')).toBeInTheDocument()
  })

  it('has correct accessibility attributes', () => {
    render(<TaskInput onAddTask={mockOnAddTask} />)
    const form = screen.getByRole('form', { name: /add new task/i })
    expect(form).toBeInTheDocument()
  })

  it('input has accessible label', () => {
    render(<TaskInput onAddTask={mockOnAddTask} />)
    expect(screen.getByRole('textbox', { name: /new task title/i })).toBeInTheDocument()
  })
})
