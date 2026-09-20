import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AuroraLogo } from './AuroraLogo'
import { AuroraShader } from './AuroraShader'

const IDLE_DELAY = 17_000
const STARTUP_DURATION = 1_250

export function AuroraAmbient({
  isReady,
  activePage,
  startupEnabled = false,
}: {
  isReady: boolean
  activePage: string
  startupEnabled?: boolean
}) {
  const [showStartup, setShowStartup] = useState(startupEnabled)
  const [isIdle, setIsIdle] = useState(false)

  useEffect(() => {
    if (!startupEnabled || !isReady) return
    const startupTimer = window.setTimeout(
      () => setShowStartup(false),
      STARTUP_DURATION,
    )
    return () => window.clearTimeout(startupTimer)
  }, [isReady, startupEnabled])

  useEffect(() => {
    let idleTimer = 0
    const scheduleIdle = () => {
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => setIsIdle(true), IDLE_DELAY)
    }
    const onActivity = () => {
      setIsIdle(false)
      scheduleIdle()
    }
    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart',
    ]
    events.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    )
    scheduleIdle()
    return () => {
      window.clearTimeout(idleTimer)
      events.forEach((event) => window.removeEventListener(event, onActivity))
    }
  }, [])

  const showStartupLayer =
    startupEnabled && showStartup && activePage !== 'Library'

  return (
    <AnimatePresence>
      {(showStartupLayer || isIdle) && (
        <motion.div
          key={showStartupLayer ? 'startup' : 'idle'}
          initial={{ opacity: showStartupLayer ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className={`aurora-ambient ${showStartupLayer ? 'aurora-ambient-startup' : ''}`}
          aria-hidden
        >
          <AuroraShader
            className="aurora-ambient-shader"
            amplitude={showStartupLayer ? 1.65 : 1.15}
            blend={0.82}
            speed={0.45}
          />
          <div className="aurora-ambient-glow aurora-ambient-glow-one" />
          <div className="aurora-ambient-glow aurora-ambient-glow-two" />
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 22,
              delay: 0.08,
            }}
            className="aurora-ambient-logo"
          >
            <AuroraLogo size={showStartupLayer ? 76 : 56} />
            <span className="aurora-ambient-label">
              {showStartupLayer ? 'Aurora Player' : 'Still listening?'}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
