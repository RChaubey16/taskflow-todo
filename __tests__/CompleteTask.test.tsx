import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import TaskItem from '@/components/TaskItem'
import { useTasks } from '@/hooks/useTasks'

// Mock framer-motion — strip animation props that are invalid on plain DOM elements
jest.mock('framer-motion', () => {
  const React = require('react')

  function stripMotionProps(props: Record<string, unknown>) {
    const {
      initial: _i,
      animate: _a,
      exit: _e,
      variants: _v,
      transition: _t,
      whileHover: _wh,
      whileTap: _wt,
      whileFocus: _wf,
      layout: _l,
      layoutId: _lid,
      ...rest
    } = props
    return rest
  }

  return {
    __esModule: true,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          // eslint-disable-next-line react/display-name
          React.forwardRef(
            (
              { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
              ref: React.Ref<unknown>
            ) =>
              React.createElement(
                tag,
                { ...stripMotionProps(props), ref },
                children
              )
          ),
      }
    ),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => true,
  }
})

const baseTask = {
  id: 'test-1',
  title: 'Test task',
  completed: false,
  createdAt: '2026-06-26T00:00:00Z',
}

describe('TaskItem — complete task', () => {
  const onToggle = jest.fn()
  const onDelete = jest.fn()

  beforeEach(() => {
    onToggle.mockClear()
    onDelete.mockClear()
  })

  it('renders the checkbox button', () => {
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />)
    expect(
      screen.getByRole('button', { name: /mark "Test task" as complete/i })
    ).toBeInTheDocument()
  })

  it('checkbox has aria-pressed=false when task is not completed', () => {
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />)
    const btn = screen.getByRole('button', { name: /mark "Test task" as complete/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('checkbox has aria-pressed=true when task is completed', () => {
    render(
      <TaskItem task={{ ...baseTask, completed: true }} onToggle={onToggle} onDelete={onDelete} />
    )
    const btn = screen.getByRole('button', { name: /mark "Test task" as incomplete/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onToggle with task id when checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /mark "Test task" as complete/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('test-1')
  })

  it('completed task title has line-through class', () => {
    render(
      <TaskItem task={{ ...baseTask, completed: true }} onToggle={onToggle} onDelete={onDelete} />
    )
    const title = screen.getByText('Test task')
    expect(title.className).toMatch(/line-through/)
  })

  it('active task title does not have line-through class', () => {
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />)
    const title = screen.getByText('Test task')
    expect(title.className).not.toMatch(/line-through/)
  })

  it('completed item has reduced opacity via class', () => {
    const { container } = render(
      <TaskItem task={{ ...baseTask, completed: true }} onToggle={onToggle} onDelete={onDelete} />
    )
    // The li element should contain opacity-70 when completed
    const li = container.querySelector('li')
    expect(li?.className).toMatch(/opacity-70/)
  })

  it('active item does not have opacity-70 class', () => {
    const { container } = render(
      <TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />
    )
    const li = container.querySelector('li')
    expect(li?.className).not.toMatch(/opacity-70/)
  })

  it('checkmark SVG is rendered when task is completed', () => {
    const { container } = render(
      <TaskItem task={{ ...baseTask, completed: true }} onToggle={onToggle} onDelete={onDelete} />
    )
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('checkmark SVG is not rendered when task is active', () => {
    // With AnimatePresence mocked as passthrough, the SVG should not be present
    // when completed is false (AnimatedCheckmark only renders when completed=true)
    const { container } = render(
      <TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />
    )
    // The only SVG in an active task should be the delete button trash icon
    const svgs = container.querySelectorAll('svg[aria-hidden="true"]')
    // Delete button svg has no polyline with checkmark points
    const checkmarkSvgs = Array.from(svgs).filter((svg) =>
      svg.querySelector('polyline[points="2,6 5,9 10,3"]')
    )
    expect(checkmarkSvgs.length).toBe(0)
  })

  it('is keyboard accessible — checkbox can be activated with Enter', async () => {
    const user = userEvent.setup()
    render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={onDelete} />)
    const btn = screen.getByRole('button', { name: /mark "Test task" as complete/i })
    btn.focus()
    await user.keyboard('{Enter}')
    expect(onToggle).toHaveBeenCalledWith('test-1')
  })
})

describe('useTasks — complete task + ordering', () => {
  it('toggleTask marks an active task as completed', () => {
    const { result } = renderHook(() => useTasks())

    // Add a fresh task so we control its initial state
    act(() => {
      result.current.addTask('Brand new task')
    })

    const taskId = result.current.tasks[0].id
    expect(result.current.tasks[0].completed).toBe(false)

    act(() => {
      result.current.toggleTask(taskId)
    })

    const toggled = result.current.tasks.find((t) => t.id === taskId)
    expect(toggled?.completed).toBe(true)
  })

  it('toggleTask marks a completed task back to active', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask('Toggle back task')
    })

    const taskId = result.current.tasks[0].id

    act(() => {
      result.current.toggleTask(taskId)
    })
    expect(result.current.tasks.find((t) => t.id === taskId)?.completed).toBe(true)

    act(() => {
      result.current.toggleTask(taskId)
    })
    expect(result.current.tasks.find((t) => t.id === taskId)?.completed).toBe(false)
  })

  it('filteredTasks in "all" view places active tasks before completed tasks', () => {
    const { result } = renderHook(() => useTasks())

    // Default filter is 'all'
    expect(result.current.filter).toBe('all')

    const filtered = result.current.filteredTasks
    // Find the index where completed tasks start
    const firstCompletedIndex = filtered.findIndex((t) => t.completed)
    const lastActiveIndex = filtered.reduce(
      (idx, t, i) => (!t.completed ? i : idx),
      -1
    )

    // If both exist, all active tasks must come before all completed tasks
    if (firstCompletedIndex !== -1 && lastActiveIndex !== -1) {
      expect(lastActiveIndex).toBeLessThan(firstCompletedIndex)
    }
  })

  it('completing a task moves it to the bottom in "all" view', () => {
    const { result } = renderHook(() => useTasks())

    // Add two active tasks
    act(() => {
      result.current.addTask('Task A')
      result.current.addTask('Task B')
    })

    // Task B is at index 0 (prepended), Task A at index 1
    const taskBId = result.current.tasks[0].id

    // Toggle Task B (now at top) to completed
    act(() => {
      result.current.toggleTask(taskBId)
    })

    // In "all" filtered view, Task B (completed) should appear after all active tasks
    const filtered = result.current.filteredTasks
    const activeTasks = filtered.filter((t) => !t.completed)
    const completedTasks = filtered.filter((t) => t.completed)

    // All active tasks appear first in the filtered list
    activeTasks.forEach((t) => {
      const activeIdx = filtered.findIndex((f) => f.id === t.id)
      completedTasks.forEach((c) => {
        const completedIdx = filtered.findIndex((f) => f.id === c.id)
        expect(activeIdx).toBeLessThan(completedIdx)
      })
    })
  })

  it('filteredTasks in "active" view never contains completed tasks', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.setFilter('active')
    })

    expect(result.current.filteredTasks.every((t) => !t.completed)).toBe(true)
  })

  it('filteredTasks in "completed" view never contains active tasks', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.setFilter('completed')
    })

    expect(result.current.filteredTasks.every((t) => t.completed)).toBe(true)
  })

  it('progress updates correctly after toggling tasks', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      // Remove all tasks and add 2 fresh ones for predictable math
      const ids = result.current.tasks.map((t) => t.id)
      ids.forEach((id) => result.current.deleteTask(id))
    })

    act(() => {
      result.current.addTask('Task 1')
      result.current.addTask('Task 2')
    })

    expect(result.current.progress).toBe(0)

    const firstTaskId = result.current.tasks[0].id
    act(() => {
      result.current.toggleTask(firstTaskId)
    })

    expect(result.current.progress).toBe(50)
  })
})
