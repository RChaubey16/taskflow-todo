'use client'

import { AnimatePresence } from 'framer-motion'
import TaskItem from './TaskItem'
import type { Task } from '@/lib/types'

interface TaskListProps {
  tasks: Task[]
  newTaskId: string | null
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TaskList({ tasks, newTaskId, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <ul
      role="list"
      aria-label="Task list"
      className="flex flex-col gap-2"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isNew={task.id === newTaskId}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </ul>
  )
}
