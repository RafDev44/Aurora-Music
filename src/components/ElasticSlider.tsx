import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const MAX_OVERFLOW = 42

interface ElasticSliderProps {
  value: number
  min?: number
  max: number
  step?: number
  onValueChange: (value: number) => void
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  ariaLabel: string
  className?: string
}

export function ElasticSlider({
  value,
  min = 0,
  max,
  step = 1,
  onValueChange,
  leftIcon,
  rightIcon,
  ariaLabel,
  className = '',
}: ElasticSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [region, setRegion] = useState<'left' | 'middle' | 'right'>('middle')
  const pointerX = useMotionValue(0)
  const overflow = useMotionValue(0)
  const scale = useMotionValue(1)

  const overflowScale = useTransform(overflow, (amount) => {
    const width = sliderRef.current?.getBoundingClientRect().width ?? 1
    return 1 + amount / width
  })
  const railHeight = useTransform(scale, [1, 1.16], [6, 10])
  const railOpacity = useTransform(scale, [1, 1.16], [0.72, 1])

  const clampValue = (nextValue: number) => {
    const snapped = Math.round(nextValue / step) * step
    return Math.min(max, Math.max(min, snapped))
  }

  const setValueFromPointer = (clientX: number) => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    if (!bounds) return

    const progress = (clientX - bounds.left) / bounds.width
    onValueChange(clampValue(min + progress * (max - min)))
    pointerX.set(clientX)
  }

  useMotionValueEvent(pointerX, 'change', (latest) => {
    const bounds = sliderRef.current?.getBoundingClientRect()
    if (!bounds || !isDragging.current) return

    const amount =
      latest < bounds.left
        ? bounds.left - latest
        : latest > bounds.right
          ? latest - bounds.right
          : 0
    setRegion(
      latest < bounds.left
        ? 'left'
        : latest > bounds.right
          ? 'right'
          : 'middle',
    )
    overflow.set(decay(amount, MAX_OVERFLOW))
  })

  useEffect(
    () => () => {
      overflow.stop()
      scale.stop()
    },
    [overflow, scale],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    animate(scale, 1.16, { duration: 0.16 })
    setValueFromPointer(event.clientX)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) setValueFromPointer(event.clientX)
  }

  const finishDragging = () => {
    isDragging.current = false
    setRegion('middle')
    animate(overflow, 0, { type: 'spring', bounce: 0.35, duration: 0.38 })
    animate(scale, 1, { type: 'spring', bounce: 0.15, duration: 0.26 })
  }

  const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div className={`flex w-full items-center gap-3 ${className}`}>
      {leftIcon && (
        <motion.span
          animate={{ scale: region === 'left' ? [1, 1.18, 1] : 1 }}
          transition={{ duration: 0.22 }}
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[var(--glass-strong)] text-text-secondary"
        >
          {leftIcon}
        </motion.span>
      )}

      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="relative flex h-10 min-w-0 flex-1 touch-none select-none items-center cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
        onLostPointerCapture={finishDragging}
        onKeyDown={(event) => {
          const amount = event.shiftKey ? step * 2 : step
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            onValueChange(clampValue(value - amount))
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            onValueChange(clampValue(value + amount))
          }
          if (event.key === 'Home') {
            event.preventDefault()
            onValueChange(min)
          }
          if (event.key === 'End') {
            event.preventDefault()
            onValueChange(max)
          }
        }}
      >
        <motion.div
          style={{
            scaleX: overflowScale,
            height: railHeight,
            opacity: railOpacity,
          }}
          className="relative w-full overflow-hidden rounded-full bg-[var(--glass-strong)]"
        >
          <motion.div
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, var(--accent-light), var(--accent))',
              boxShadow: '0 0 18px var(--accent-glow-soft)',
            }}
          />
        </motion.div>
        <motion.span
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="absolute h-4 w-4 -translate-x-1/2 rounded-full border border-[var(--glass-border-strong)] bg-[var(--text-primary)] shadow-sm"
        />
      </div>

      {rightIcon && (
        <motion.span
          animate={{ scale: region === 'right' ? [1, 1.18, 1] : 1 }}
          transition={{ duration: 0.22 }}
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[var(--glass-strong)] text-text-secondary"
        >
          {rightIcon}
        </motion.span>
      )}
    </div>
  )
}

function decay(value: number, max: number) {
  if (max <= 0) return 0
  const ratio = value / max
  return (2 / (1 + Math.exp(-ratio)) - 1) * max
}
