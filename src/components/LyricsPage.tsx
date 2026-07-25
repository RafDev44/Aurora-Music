import { motion } from 'framer-motion'
import { Captions, Disc3, FileText, Music2, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { LyricLine } from '../types/music'

export function LyricsPage({
  lines,
  onLoad,
  onClose,
}: {
  lines: LyricLine[]
  onLoad: () => void
  onClose?: () => void
}) {
  const { currentTrack, currentTime, isPlaying } = usePlayer()
  const activeIndex = useMemo(
    () => lines.reduce((active, line, index) => (line.time <= currentTime + 0.05 ? index : active), -1),
    [currentTime, lines],
  )
  const activeLine = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    activeLine.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  if (!currentTrack) {
    return (
      <div className="empty-state">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="empty-icon">
            <Music2 size={42} strokeWidth={1.8} />
          </div>
          <div className="chip mb-4">
            <Captions size={12} />
            Synced lyrics
          </div>
          <h1 className="page-title text-gradient">Choose a song.</h1>
          <p className="page-subtitle mx-auto">Lyrics will follow the music in real time once a track is playing.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex min-w-0 items-end gap-5">
          <span className={`art art-lg h-28 w-28 flex-shrink-0 ${isPlaying ? 'art-spin' : ''}`} data-paused={!isPlaying}>
            {currentTrack.artwork ? <img src={currentTrack.artwork} alt="" className="h-full w-full object-cover" /> : <Disc3 size={42} />}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Now playing</p>
            <h1 className="page-title text-gradient">Lyrics</h1>
            <p className="page-subtitle truncate">
              {currentTrack.title} - {currentTrack.artist}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onLoad} className="secondary-button">
            <FileText size={16} />
            Load LRC
          </button>
          {onClose && (
            <button onClick={onClose} className="icon-btn" title="Close lyrics">
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {lines.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lyrics-scroll mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto rounded-[28px] border border-glass-border bg-[var(--glass)] px-8 pb-[42vh] pt-[28vh] shadow-soft backdrop-blur-2xl"
        >
          {lines.map((line, index) => {
            const isActive = index === activeIndex
            const hasPassed = index < activeIndex
            return (
              <motion.p
                ref={isActive ? activeLine : undefined}
                key={`${line.time}-${index}`}
                animate={{
                  opacity: isActive ? 1 : hasPassed ? 0.26 : 0.56,
                  scale: isActive ? 1.025 : 1,
                }}
                transition={{ duration: 0.28 }}
                className={`py-3 text-center text-2xl font-semibold leading-relaxed tracking-tight ${
                  isActive ? 'text-text-primary' : 'text-text-tertiary'
                }`}
              >
                {line.text || '...'}
              </motion.p>
            )
          })}
        </motion.div>
      ) : (
        <div className="empty-state pb-12">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="empty-icon">
              <FileText size={40} strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">No synchronized lyrics found.</h2>
            <p className="page-subtitle mx-auto">
              Choose an LRC file to sync lyrics for this song. Aurora also detects matching LRC files during import.
            </p>
            <button onClick={onLoad} className="btn-primary mt-7">
              <FileText size={16} />
              Choose LRC file
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
