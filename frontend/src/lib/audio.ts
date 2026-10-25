// Web Audio API emergency sound synthesizer (100% offline, zero audio file dependencies)

class EmergencySoundService {
  private ctx: AudioContext | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private interval: any = null
  private isRinging: boolean = false
  public isMuted: boolean = false

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // Play an emergency phone ringtone / dual-tone alert sequence
  public startIncomingCallRing() {
    if (this.isRinging || this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return
      this.isRinging = true

      const ringTone = () => {
        if (!this.isRinging || !this.ctx || this.isMuted) return

        const now = this.ctx.currentTime
        const osc1 = this.ctx.createOscillator()
        const osc2 = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        // Classic emergency dual tone: 440Hz + 480Hz phone ring
        osc1.frequency.setValueAtTime(440, now)
        osc2.frequency.setValueAtTime(480, now)
        osc1.type = 'sine'
        osc2.type = 'sine'

        // Ring cadence: 1.5 seconds on, 2.5 seconds pause
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05)
        gain.gain.setValueAtTime(0.18, now + 1.4)
        gain.gain.linearRampToValueAtTime(0, now + 1.5)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(this.ctx.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 1.5)
        osc2.stop(now + 1.5)
      }

      ringTone()
      this.interval = setInterval(ringTone, 3500)
    } catch (e) {
      console.warn('AudioContext playback error:', e)
    }
  }

  // Play a quick high-priority alert chime
  public playAlertChime() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return
      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.setValueAtTime(880, now + 0.12) // A5

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.6)
    } catch {}
  }

  public stopIncomingCallRing() {
    this.isRinging = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopIncomingCallRing()
    }
    return this.isMuted
  }
}

export const sound = new EmergencySoundService()
