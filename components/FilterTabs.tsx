'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { FilterTab } from '@/lib/types'

interface FilterTabsProps {
  activeFilter: FilterTab
  onFilterChange: (filter: FilterTab) => void
  counts: {
    all: number
    active: number
    completed: number
  }
}

const tabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

export default function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      role="tablist"
      aria-label="Filter tasks"
      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl"
    >
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls="task-list-panel"
            id={`tab-${tab.id}`}
            onClick={() => onFilterChange(tab.id)}
            className={`
              relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
              transition-colors duration-150 outline-none
              focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1
              ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {isActive && (
              <motion.span
                layoutId="filter-tab-bg"
                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 35 }
                }
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            <span
              className={`
                relative z-10 min-w-[20px] text-center text-xs px-1.5 py-0.5 rounded-full
                ${
                  isActive
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }
              `}
            >
              {counts[tab.id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
