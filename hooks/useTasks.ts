'use client'

import { useState, useCallback, useRef } from 'react'
import { dummyTasks } from '@/lib/dummyData'
import type { Task, FilterTab } from '@/lib/types'

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(dummyTasks)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [newTaskId, setNewTaskId] = useState<string | null>(null)
  const newTaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addTask = useCallback((title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return

    const id = generateId()
    const newTask: Task = {
      id,
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    setTasks((prev) => [newTask, ...prev])

    // Track the new task ID for the entrance animation trigger
    setNewTaskId(id)
    if (newTaskTimerRef.current) clearTimeout(newTaskTimerRef.current)
    newTaskTimerRef.current = setTimeout(() => setNewTaskId(null), 500)
  }, [])

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    )
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }, [])

  const filteredTasks = (() => {
    const filtered = tasks.filter((task) => {
      if (filter === 'active') return !task.completed
      if (filter === 'completed') return task.completed
      return true
    })

    // In "all" view, push completed tasks to the bottom so active tasks remain prominent.
    // "active" and "completed" filter views keep their original insertion order.
    if (filter === 'all') {
      return [
        ...filtered.filter((t) => !t.completed),
        ...filtered.filter((t) => t.completed),
      ]
    }

    return filtered
  })()

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  const filterCounts = {
    all: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  }

  return {
    tasks,
    filteredTasks,
    filter,
    setFilter,
    addTask,
    toggleTask,
    deleteTask,
    newTaskId,
    completedCount,
    totalCount,
    progress,
    filterCounts,
  }
}
