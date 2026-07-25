import type { Track } from '../types/music'

export class AudioEngine {
  private audio = new Audio()
  private outputVolume = 0.8
  private gain = 1
  private fading = false

  constructor() {
    this.audio.preload = 'metadata'
  }

  get element(): HTMLAudioElement { return this.audio }
  get currentTime(): number { return this.audio.currentTime || 0 }
  get duration(): number { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0 }
  get volume(): number { return this.audio.volume }
  get paused(): boolean { return this.audio.paused }
  get isCrossfading(): boolean { return this.fading }

  load(track: Track): void {
    this.gain = track.normalizationGain ?? 1
    if (this.audio.src !== track.source) {
      this.audio.src = track.source
      this.audio.load()
    }
    this.applyVolume()
  }

  async play(): Promise<void> { await this.audio.play() }
  pause(): void { this.audio.pause() }
  stop(): void { this.audio.pause(); this.audio.currentTime = 0 }
  seek(time: number): void { this.audio.currentTime = Math.max(0, Math.min(time, this.duration || time)) }
  setVolume(volume: number): void { this.outputVolume = Math.max(0, Math.min(volume, 1)); this.applyVolume() }
  async crossfadeTo(track: Track, seconds: number): Promise<void> {
    const outgoing = this.audio
    if (seconds <= 0 || outgoing.paused || outgoing.ended || !outgoing.src) {
      this.load(track)
      await this.play()
      return
    }

    this.fading = true
    const incoming = new Audio(track.source)
    const incomingGain = track.normalizationGain ?? 1
    incoming.preload = 'metadata'
    incoming.volume = 0
    try {
      await incoming.play()
      const duration = Math.max(0.1, seconds) * 1000
      const startedAt = performance.now()
      await new Promise<void>((resolve) => {
        const fade = () => {
          const progress = Math.min(1, (performance.now() - startedAt) / duration)
          outgoing.volume = this.outputVolume * this.gain * (1 - progress)
          incoming.volume = this.outputVolume * incomingGain * progress
          if (progress < 1) requestAnimationFrame(fade)
          else resolve()
        }
        requestAnimationFrame(fade)
      })
      outgoing.pause()
      outgoing.src = ''
      this.audio = incoming
      this.gain = incomingGain
      this.applyVolume()
    } finally {
      this.fading = false
    }
  }
  dispose(): void { this.audio.pause(); this.audio.src = '' }
  private applyVolume(): void { this.audio.volume = Math.max(0, Math.min(this.outputVolume * this.gain, 1)) }
}
