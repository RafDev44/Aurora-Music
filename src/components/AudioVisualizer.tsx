import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  className?: string
  frequencyData?: number[]
  isPlaying?: boolean
}

export function AudioVisualizer({
  className = '',
  frequencyData = [],
  isPlaying = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frequencyDataRef = useRef(frequencyData)
  const isPlayingRef = useRef(isPlaying)
  const drawRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    frequencyDataRef.current = frequencyData
  }, [frequencyData])

  useEffect(() => {
    isPlayingRef.current = isPlaying
    drawRef.current?.()
  }, [isPlaying])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let width = 0
    let height = 0
    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      width = Math.max(1, Math.floor(bounds.width * pixelRatio))
      height = Math.max(1, Math.floor(bounds.height * pixelRatio))
      canvas.width = width
      canvas.height = height
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const draw = () => {
      context.clearRect(0, 0, width, height)
      const styles = getComputedStyle(document.documentElement)
      const accent = styles.getPropertyValue('--accent').trim()
      const accentLight = styles.getPropertyValue('--accent-light').trim()
      const muted = styles.getPropertyValue('--text-muted').trim()
      const data = frequencyDataRef.current
      const bars = 18
      const gap = Math.max(2, Math.round(width * 0.02))
      const barWidth = (width - gap * (bars - 1)) / bars

      for (let index = 0; index < bars; index += 1) {
        const dataLength = data.length
        const dataIndex = Math.min(
          Math.max(0, dataLength - 1),
          Math.floor(((index + 1) / bars) ** 1.75 * Math.max(1, dataLength)),
        )
        const amplitude = dataLength ? data[dataIndex] / 255 : 0
        const idle = 0.16 + Math.sin(index * 1.7) * 0.025
        const level = isPlayingRef.current ? Math.max(idle, amplitude) : idle
        const barHeight = Math.max(3, level * height)
        const x = index * (barWidth + gap)
        const y = height - barHeight
        const fill = context.createLinearGradient(0, y, 0, height)
        fill.addColorStop(0, accentLight || accent)
        fill.addColorStop(1, isPlayingRef.current ? accent : muted)
        context.fillStyle = fill
        context.beginPath()
        context.roundRect(x, y, barWidth, barHeight, Math.min(barWidth / 2, 4))
        context.fill()
      }
      if (isPlayingRef.current) frame = window.requestAnimationFrame(draw)
      else frame = 0
    }

    drawRef.current = () => {
      if (!frame) draw()
    }
    draw()
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      drawRef.current = null
    }
  }, [])

  return (
    <div
      className={`rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 shadow-[0_10px_28px_-18px_var(--accent-glow)] ${className}`}
      title="Live audio visualizer"
      aria-label="Live audio visualizer"
    >
      <canvas ref={canvasRef} className="block h-7 w-20" aria-hidden />
    </div>
  )
}
