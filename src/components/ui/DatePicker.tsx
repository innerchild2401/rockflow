'use client'

import { useState, useRef, useEffect } from 'react'

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  minDate?: string // ISO date string (YYYY-MM-DD)
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, minDate, placeholder = 'Select date', className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(value || '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const min = minDate ? new Date(minDate) : today
  min.setHours(0, 0, 0, 0)

  const currentMonth = selectedDate ? new Date(selectedDate + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(currentMonth.getMonth())
  const [viewYear, setViewYear] = useState(currentMonth.getFullYear())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDay = firstDay.getDay()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function handleDateClick(day: number) {
    const date = new Date(viewYear, viewMonth, day)
    const dateStr = date.toISOString().split('T')[0]
    if (date >= min) {
      setSelectedDate(dateStr)
      onChange(dateStr)
      setIsOpen(false)
    }
  }

  function handleToday() {
    const todayStr = today.toISOString().split('T')[0]
    setSelectedDate(todayStr)
    onChange(todayStr)
    setIsOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const displayValue = selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : ''

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {displayValue || placeholder}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Previous month"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Next month"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {dayNames.map((d) => (
                <div key={d} className="p-1 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = new Date(viewYear, viewMonth, day)
                const dateStr = date.toISOString().split('T')[0]
                const isSelected = selectedDate === dateStr
                const isToday = dateStr === today.toISOString().split('T')[0]
                const isDisabled = date < min
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={isDisabled}
                    className={`rounded p-1 text-sm transition-colors ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : isToday
                        ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
                        : isDisabled
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleToday}
              className="mt-2 w-full rounded bg-zinc-100 px-2 py-1 text-xs font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
