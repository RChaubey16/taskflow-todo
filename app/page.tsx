'use client'

import TaskInput from '@/components/TaskInput'
import TaskList from '@/components/TaskList'
import FilterTabs from '@/components/FilterTabs'
import ProgressBar from '@/components/ProgressBar'
import EmptyState from '@/components/EmptyState'
import { useTasks } from '@/hooks/useTasks'

export default function HomePage() {
  const {
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
  } = useTasks()

  return (
    <main className="min-h-screen px-4 py-12" aria-label="TaskFlow application">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            TaskFlow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stay organised. Get things done.
          </p>
        </header>

        {/* Progress */}
        {totalCount > 0 && (
          <ProgressBar
            completed={completedCount}
            total={totalCount}
            progress={progress}
          />
        )}

        {/* Add task input */}
        <TaskInput onAddTask={addTask} />

        {/* Filter tabs */}
        <div className="flex items-center justify-between">
          <FilterTabs
            activeFilter={filter}
            onFilterChange={setFilter}
            counts={filterCounts}
          />
        </div>

        {/* Task list or empty state */}
        <section id="task-list-panel" role="tabpanel" aria-labelledby={`tab-${filter}`}>
          {filteredTasks.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <TaskList
              tasks={filteredTasks}
              newTaskId={newTaskId}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          )}
        </section>
      </div>
    </main>
  )
}
