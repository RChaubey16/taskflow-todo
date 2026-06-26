'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { FilterTab } from '@/lib/types'

interface EmptyStateProps {
  filter: FilterTab
}

const messages: Record<FilterTab, { heading: string; subtext: string }> = {
  all: {
    heading: 'No tasks yet',
    subtext: 'Add your first task above to get started.',
  },
  active: {
    heading: 'No active tasks',
    subtext: 'All your tasks are completed. Great work!',
  },
  completed: {
    heading: 'Nothing completed yet',
    subtext: 'Complete a task to see it here.',
  },
}

export default function EmptyState({ filter }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion()
  const { heading, subtext } = messages[filter]

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400 dark:text-gray-500"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {heading}
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">{subtext}</p>
    </motion.div>
  )
}
