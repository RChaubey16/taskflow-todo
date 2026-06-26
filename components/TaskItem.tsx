'use client'

import { motion, useReducedMotion, AnimatePresence, type Transition } from 'framer-motion'
import type { Task } from '@/lib/types'

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  isNew?: boolean
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

// Approximate path length for polyline "2,6 5,9 10,3" in a 12x12 viewBox:
// segment 1: (2,6) -> (5,9) = sqrt(9+9) ≈ 4.24
// segment 2: (5,9) -> (10,3) = sqrt(25+36) ≈ 7.81
// total ≈ 12.05 — round up to 13 for reliable coverage
const CHECKMARK_PATH_LENGTH = 13

function formatDueDate(dueDate: string): { text: string; isOverdue: boolean } {
  const due = new Date(dueDate)
  const now = new Date()
  const isOverdue = due < now

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return {
    text: due.toLocaleDateString('en-US', options),
    isOverdue,
  }
}

interface AnimatedCheckmarkProps {
  completed: boolean
  reduceMotion: boolean
}

function AnimatedCheckmark({ completed, reduceMotion }: AnimatedCheckmarkProps) {
  // Draw-on animation: start fully hidden (dashoffset = pathLength), animate to 0
  const checkmarkVariants = {
    hidden: {
      strokeDashoffset: CHECKMARK_PATH_LENGTH,
      opacity: reduceMotion ? 1 : 0,
    },
    visible: {
      strokeDashoffset: 0,
      opacity: 1,
    },
  }

  const checkmarkTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeOut' }

  return (
    <AnimatePresence>
      {completed && (
        <motion.svg
          key="checkmark"
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={checkmarkTransition}
        >
          <motion.polyline
            points="2,6 5,9 10,3"
            strokeDasharray={CHECKMARK_PATH_LENGTH}
            variants={checkmarkVariants}
            transition={checkmarkTransition}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  )
}

export default function TaskItem({ task, onToggle, onDelete, isNew = false }: TaskItemProps) {
  const shouldReduceMotion = useReducedMotion() ?? false

  const itemVariants = {
    initial: shouldReduceMotion
      ? {}
      : { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion
      ? {}
      : { opacity: 0, x: -20 },
  }

  const transition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : isNew
    ? { duration: 0.2, ease: 'easeOut' as const }
    : { duration: 0.3, ease: 'easeIn' as const }

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null

  return (
    <motion.li
      layout={!shouldReduceMotion}
      variants={itemVariants}
      initial={isNew ? 'initial' : false}
      animate="animate"
      exit="exit"
      transition={transition}
      className={`
        group flex items-start gap-3 px-4 py-3.5 rounded-xl border
        bg-white dark:bg-gray-800
        ${
          task.completed
            ? 'border-gray-100 dark:border-gray-700/50 opacity-70'
            : 'border-gray-200 dark:border-gray-700'
        }
        hover:border-violet-200 dark:hover:border-violet-800
        transition-colors duration-150
      `}
      aria-label={`Task: ${task.title}${task.completed ? ', completed' : ''}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
        aria-pressed={task.completed}
        className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
          transition-colors duration-150
          focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 outline-none
          ${
            task.completed
              ? 'border-violet-500 bg-violet-500 dark:border-violet-400 dark:bg-violet-400'
              : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-400'
          }
        `}
      >
        <AnimatedCheckmark completed={task.completed} reduceMotion={shouldReduceMotion} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            text-sm font-medium leading-snug break-words
            ${
              task.completed
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-100'
            }
          `}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-2 mt-1.5">
          {task.priority && (
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}
            >
              {priorityConfig[task.priority].label}
            </span>
          )}
          {dueDateInfo && (
            <span
              className={`text-xs font-medium ${
                dueDateInfo.isOverdue && !task.completed
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              aria-label={`Due date: ${dueDateInfo.text}${dueDateInfo.isOverdue && !task.completed ? ', overdue' : ''}`}
            >
              {dueDateInfo.isOverdue && !task.completed ? 'Overdue · ' : ''}
              {dueDateInfo.text}
            </span>
          )}
          {task.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs text-gray-400 dark:text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete task "${task.title}"`}
        className="
          flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center
          text-gray-300 dark:text-gray-600
          hover:text-red-500 dark:hover:text-red-400
          hover:bg-red-50 dark:hover:bg-red-900/20
          opacity-0 group-hover:opacity-100 focus-visible:opacity-100
          transition-all duration-150
          focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 outline-none
        "
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3,6 5,6 21,6" />
          <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
          <path d="M10,11v6M14,11v6" />
          <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" />
        </svg>
      </button>
    </motion.li>
  )
}
