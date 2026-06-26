'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface ProgressBarProps {
  completed: number
  total: number
  progress: number
}

export default function ProgressBar({ completed, total, progress }: ProgressBarProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="space-y-2" aria-label={`Progress: ${completed} of ${total} tasks completed`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          {completed} of {total} tasks done
        </span>
        <span className="text-violet-600 dark:text-violet-400 font-semibold tabular-nums">
          {progress}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress}% complete`}
        className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full w-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full origin-left"
          initial={shouldReduceMotion ? undefined : { scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.4, ease: 'easeOut' }
          }
        />
      </div>
    </div>
  )
}
