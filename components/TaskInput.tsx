'use client'

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface TaskInputProps {
  onAddTask: (title: string) => void
}

export default function TaskInput({ onAddTask }: TaskInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAddTask(trimmed)
    setValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const buttonVariants = {
    initial: { opacity: 0.7 },
    hover: { opacity: 1, scale: shouldReduceMotion ? 1 : 1.05 },
    tap: { scale: shouldReduceMotion ? 1 : 0.95 },
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="form"
      aria-label="Add new task"
      className="flex items-center gap-3 w-full"
    >
      <div
        className={`
          flex-1 relative flex items-center rounded-xl border-2 transition-colors duration-150
          bg-white dark:bg-gray-800
          ${
            isFocused
              ? 'border-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]'
              : 'border-gray-200 dark:border-gray-700'
          }
        `}
      >
        <span
          className="pl-4 text-gray-400 dark:text-gray-500 select-none pointer-events-none"
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          id="task-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Add a new task and press Enter..."
          maxLength={200}
          aria-label="New task title"
          className="
            flex-1 py-3.5 px-3 bg-transparent text-gray-800 dark:text-gray-100
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            text-sm font-medium outline-none
          "
        />
        {value.length > 150 && (
          <span
            className="pr-3 text-xs text-gray-400 tabular-nums"
            aria-live="polite"
            aria-label={`${200 - value.length} characters remaining`}
          >
            {200 - value.length}
          </span>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={!value.trim()}
        variants={buttonVariants}
        initial="initial"
        whileHover={value.trim() ? 'hover' : 'initial'}
        whileTap={value.trim() ? 'tap' : 'initial'}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
        aria-label="Add task"
        className="
          flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm
          bg-violet-600 text-white
          hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-150 outline-none
          whitespace-nowrap
        "
      >
        <span aria-hidden="true">+</span>
        <span>Add Task</span>
      </motion.button>
    </form>
  )
}
