import type { Track } from '../types/music'

export type EqualizerBand = 'bass' | 'mid' | 'treble'
export type EqualizerSettings = Record<EqualizerBand, number>

const equalizerFrequencies: Record<EqualizerBand, number> = {
  bass: 160,
  mid: 1000,
  treble: 5600,
}

export class AudioEngine {
  private audio = new Audio()
  private outputVolume = 0.8
  private gain = 1
  private fading = false
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private equalizerInput: GainNode | null = null
  private equalizerFilters: Partial<Record<EqualizerBand, BiquadFilterNode>> =
    {}
  private sourceNodes = new WeakMap<
    HTMLAudioElement,
    MediaElementAudioSourceNode
  >()
  private frequencyData: Uint8Array<ArrayBuffer> | null = null
  private audioGraphUnavailable = false
  private equalizer: EqualizerSettings = { bass: 0, mid: 0, treble: 0 }
  private equalizerEnabled = true

  constructor() {
    this.audio.preload = 'metadata'
  }

  get element(): HTMLAudioElement {
    return this.audio
  }
  get currentTime(): number {
    return this.audio.currentTime || 0
  }
  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0
  }
  get volume(): number {
    return this.audio.volume
  }
  get paused(): boolean {
    return this.audio.paused
  }
  get isCrossfading(): boolean {
    return this.fading
  }

  load(track: Track): void {
    this.gain = track.normalizationGain ?? 1
    if (this.audio.src !== track.source) {
      this.audio.src = track.source
      this.audio.load()
    }
    this.applyVolume()
  }

  async play(): Promise<void> {
    await this.prepareAudioGraph(this.audio)
    await this.audio.play()
  }
  pause(): void {
    this.audio.pause()
  }
  stop(): void {
    this.audio.pause()
    this.audio.currentTime = 0
  }
  seek(time: number): void {
    this.audio.currentTime = Math.max(0, Math.min(time, this.duration || time))
  }
  setVolume(volume: number): void {
    this.outputVolume = Math.max(0, Math.min(volume, 1))
    this.applyVolume()
  }
  setEqualizer(settings: EqualizerSettings, enabled: boolean): void {
    this.equalizer = settings
    this.equalizerEnabled = enabled
    this.applyEqualizer()
  }
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.frequencyData) return null
    this.analyser.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }
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
      await this.prepareAudioGraph(incoming)
      await incoming.play()
      const duration = Math.max(0.1, seconds) * 1000
      const startedAt = performance.now()
      await new Promise<void>((resolve) => {
        const fade = () => {
          const progress = Math.min(
            1,
            (performance.now() - startedAt) / duration,
          )
          outgoing.volume = this.outputVolume * this.gain * (1 - progress)
          incoming.volume = this.outputVolume * incomingGain * progress
          // Timers continue to run for minimized windows when Electron's
          // background throttling is disabled, unlike rAF in hidden tabs.
          if (progress < 1) window.setTimeout(fade, 16)
          else resolve()
        }
        window.setTimeout(fade, 0)
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
  dispose(): void {
    this.audio.pause()
    this.audio.src = ''
    void this.audioContext?.close()
  }
  private applyVolume(): void {
    this.audio.volume = Math.max(0, Math.min(this.outputVolume * this.gain, 1))
  }
  private async prepareAudioGraph(element: HTMLAudioElement): Promise<void> {
    if (!this.ensureAudioGraph() || !this.audioContext || !this.equalizerInput)
      return
    if (!this.sourceNodes.has(element)) {
      try {
        const source = this.audioContext.createMediaElementSource(element)
        source.connect(this.equalizerInput)
        this.sourceNodes.set(element, source)
      } catch {
        this.audioGraphUnavailable = true
        return
      }
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch {
        this.audioGraphUnavailable = true
      }
    }
  }
  private ensureAudioGraph(): boolean {
    if (this.audioGraphUnavailable) return false
    if (this.audioContext) return true
    try {
      const context = new AudioContext()
      const input = context.createGain()
      const bass = context.createBiquadFilter()
      const mid = context.createBiquadFilter()
      const treble = context.createBiquadFilter()
      bass.type = 'lowshelf'
      mid.type = 'peaking'
      treble.type = 'highshelf'
      bass.frequency.value = equalizerFrequencies.bass
      mid.frequency.value = equalizerFrequencies.mid
      mid.Q.value = 0.9
      treble.frequency.value = equalizerFrequencies.treble

      const analyser = context.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.82
      input
        .connect(bass)
        .connect(mid)
        .connect(treble)
        .connect(analyser)
        .connect(context.destination)

      this.audioContext = context
      this.equalizerInput = input
      this.equalizerFilters = { bass, mid, treble }
      this.analyser = analyser
      this.frequencyData = new Uint8Array(analyser.frequencyBinCount)
      this.applyEqualizer()
      return true
    } catch {
      this.audioGraphUnavailable = true
      return false
    }
  }
  private applyEqualizer(): void {
    for (const band of Object.keys(equalizerFrequencies) as EqualizerBand[]) {
      const filter = this.equalizerFilters[band]
      if (filter)
        filter.gain.value = this.equalizerEnabled ? this.equalizer[band] : 0
    }
  }
}
