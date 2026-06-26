import { renderHook, act } from '@testing-library/react'
import { useTasks } from '@/hooks/useTasks'

describe('useTasks hook', () => {
  it('initializes with dummy tasks', () => {
    const { result } = renderHook(() => useTasks())
    expect(result.current.tasks.length).toBeGreaterThan(0)
  })

  it('addTask prepends a new task to the list', () => {
    const { result } = renderHook(() => useTasks())
    const initialCount = result.current.tasks.length

    act(() => {
      result.current.addTask('New test task')
    })

    expect(result.current.tasks.length).toBe(initialCount + 1)
    expect(result.current.tasks[0].title).toBe('New test task')
    expect(result.current.tasks[0].completed).toBe(false)
  })

  it('addTask does not add empty title', () => {
    const { result } = renderHook(() => useTasks())
    const initialCount = result.current.tasks.length

    act(() => {
      result.current.addTask('   ')
    })

    expect(result.current.tasks.length).toBe(initialCount)
  })

  it('addTask trims whitespace from title', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask('  trimmed task  ')
    })

    expect(result.current.tasks[0].title).toBe('trimmed task')
  })

  it('toggleTask flips the completed state', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask('Toggle me')
    })

    const taskId = result.current.tasks[0].id
    expect(result.current.tasks[0].completed).toBe(false)

    act(() => {
      result.current.toggleTask(taskId)
    })

    expect(result.current.tasks[0].completed).toBe(true)

    act(() => {
      result.current.toggleTask(taskId)
    })

    expect(result.current.tasks[0].completed).toBe(false)
  })

  it('deleteTask removes the task', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask('Delete me')
    })

    const taskId = result.current.tasks[0].id
    const countBefore = result.current.tasks.length

    act(() => {
      result.current.deleteTask(taskId)
    })

    expect(result.current.tasks.length).toBe(countBefore - 1)
    expect(result.current.tasks.find((t) => t.id === taskId)).toBeUndefined()
  })

  it('filteredTasks returns only active tasks when filter is active', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.setFilter('active')
    })

    const filtered = result.current.filteredTasks
    expect(filtered.every((t) => !t.completed)).toBe(true)
  })

  it('filteredTasks returns only completed tasks when filter is completed', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.setFilter('completed')
    })

    const filtered = result.current.filteredTasks
    expect(filtered.every((t) => t.completed)).toBe(true)
  })

  it('progress is 0 when no tasks exist', () => {
    const { result } = renderHook(() => useTasks())

    // Delete all tasks
    act(() => {
      const ids = result.current.tasks.map((t) => t.id)
      ids.forEach((id) => result.current.deleteTask(id))
    })

    expect(result.current.progress).toBe(0)
  })

  it('newTaskId is set after addTask and cleared after timeout', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask('Animated task')
    })

    expect(result.current.newTaskId).not.toBeNull()

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(result.current.newTaskId).toBeNull()
    jest.useRealTimers()
  })

  it('filterCounts are accurate', () => {
    const { result } = renderHook(() => useTasks())
    const { tasks, filterCounts } = result.current

    expect(filterCounts.all).toBe(tasks.length)
    expect(filterCounts.active).toBe(tasks.filter((t) => !t.completed).length)
    expect(filterCounts.completed).toBe(tasks.filter((t) => t.completed).length)
  })
})
