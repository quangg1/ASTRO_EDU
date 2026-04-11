/**
 * Procedural engine audio (Web Audio API) — low gain + compressor to avoid crackle.
 */

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return sharedCtx
}

export async function resumeCockpitAudio(): Promise<void> {
  const ctx = getCtx()
  if (ctx?.state === 'suspended') await ctx.resume()
}

export const COCKPIT_ENGINE_VOLUME_KEY = 'galaxies-cockpit-engine-volume'

export function loadCockpitEngineVolume(): number {
  if (typeof window === 'undefined') return 1
  try {
    const v = window.localStorage.getItem(COCKPIT_ENGINE_VOLUME_KEY)
    if (v == null) return 1
    const n = parseFloat(v)
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1
  } catch {
    return 1
  }
}

export function saveCockpitEngineVolume(volume: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COCKPIT_ENGINE_VOLUME_KEY, String(Math.max(0, Math.min(1, volume))))
  } catch {
    /* ignore */
  }
}

/** One shared output chain: compressor → destination (reduces clipping / harsh peaks). */
function getOutputChain(ctx: AudioContext): { input: GainNode } {
  const master = ctx.createGain()
  master.gain.value = 0.35
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -28
  comp.knee.value = 18
  comp.ratio.value = 6
  comp.attack.value = 0.003
  comp.release.value = 0.12
  master.connect(comp)
  comp.connect(ctx.destination)
  return { input: master }
}

export class CockpitEngineController {
  private ctx: AudioContext | null
  private outMaster: GainNode | null = null
  private rumbleOsc: OscillatorNode | null = null
  private rumbleGain: GainNode | null = null
  private lastStartupAt = 0
  /** User mix 0…1 (engine + rumble + SFX). */
  private userVolume = 1

  constructor(initialVolume = 1) {
    this.ctx = getCtx()
    this.userVolume = Math.max(0, Math.min(1, initialVolume))
  }

  getUserVolume(): number {
    return this.userVolume
  }

  /** 0 = tắt hoàn toàn tiếng động cơ; 1 = mức chuẩn. */
  setUserVolume(volume: number): void {
    this.userVolume = Math.max(0, Math.min(1, volume))
    this.applyUserVolumeToMaster()
    if (this.userVolume < 0.001) {
      this.stopRumble()
    }
  }

  private applyUserVolumeToMaster(): void {
    const ctx = this.ctx
    if (!this.outMaster || !ctx) return
    const now = ctx.currentTime
    const g = 0.35 * this.userVolume
    try {
      this.outMaster.gain.cancelScheduledValues(now)
      this.outMaster.gain.setTargetAtTime(g, now, 0.03)
    } catch {
      this.outMaster.gain.value = g
    }
  }

  async ensureRunning(): Promise<boolean> {
    const ctx = getCtx()
    if (!ctx) return false
    if (ctx.state === 'suspended') await ctx.resume()
    if (!this.outMaster) {
      const chain = getOutputChain(ctx)
      this.outMaster = chain.input
      this.applyUserVolumeToMaster()
    }
    return ctx.state === 'running'
  }

  private out(): GainNode | null {
    return this.outMaster
  }

  /** Short ignition — single soft layer (no overlapping loud bursts = less crackle). */
  playStartup(): void {
    if (this.userVolume < 0.001) return
    const ctx = this.ctx
    if (!ctx) return
    const now = performance.now()
    if (now - this.lastStartupAt < 450) return
    this.lastStartupAt = now
    void this.ensureRunning().then(() => {
      const master = this.out()
      if (!master || !this.ctx) return
      this.playStartupOsc(this.ctx, master)
    })
  }

  private playStartupOsc(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(55, t)
    osc.frequency.linearRampToValueAtTime(95, t + 0.28)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.001, t)
    g.gain.linearRampToValueAtTime(0.045, t + 0.04)
    g.gain.linearRampToValueAtTime(0.001, t + 0.42)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    osc.connect(lp)
    lp.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.45)
  }

  playShutdown(): void {
    const ctx = this.ctx
    if (!ctx) return
    void this.ensureRunning().then(() => {
      const master = this.out()
      if (!master || !this.ctx) return
      this.playShutdownOsc(this.ctx, master)
    })
  }

  private playShutdownOsc(ctx: AudioContext, master: GainNode): void {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(85, t)
    osc.frequency.linearRampToValueAtTime(38, t + 0.38)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.04, t)
    g.gain.linearRampToValueAtTime(0.001, t + 0.42)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.44)
    this.stopRumble()
  }

  /** Single low saw — no looping noise buffer (was a main crackle source). */
  updateRumble(normalizedSpeed: number): void {
    if (this.userVolume < 0.001) return
    const ctx = this.ctx
    if (!ctx) return
    if (!this.outMaster) {
      void this.ensureRunning()
    }
    const master = this.out()
    if (!master) return
    const gain = Math.min(0.12, Math.max(0, normalizedSpeed * 0.14))

    if (gain < 0.018) {
      this.stopRumble()
      return
    }

    if (!this.rumbleOsc) {
      this.rumbleOsc = ctx.createOscillator()
      this.rumbleOsc.type = 'sawtooth'
      this.rumbleOsc.frequency.value = 48
      this.rumbleGain = ctx.createGain()
      this.rumbleGain.gain.value = 0
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 220
      lp.Q.value = 0.7
      this.rumbleOsc.connect(lp)
      lp.connect(this.rumbleGain)
      this.rumbleGain.connect(master)
      this.rumbleOsc.start()
    }

    const now = ctx.currentTime
    this.rumbleGain!.gain.cancelScheduledValues(now)
    this.rumbleGain!.gain.setTargetAtTime(gain, now, 0.05)
    this.rumbleOsc!.frequency.cancelScheduledValues(now)
    this.rumbleOsc!.frequency.setTargetAtTime(44 + normalizedSpeed * 22, now, 0.08)
  }

  stopRumble(): void {
    const ctx = this.ctx
    if (!this.rumbleOsc || !this.rumbleGain || !ctx) return
    const now = ctx.currentTime
    try {
      this.rumbleGain.gain.cancelScheduledValues(now)
      this.rumbleGain.gain.setTargetAtTime(0, now, 0.04)
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        this.rumbleOsc?.stop()
      } catch {
        /* ignore */
      }
      this.rumbleOsc = null
      this.rumbleGain = null
    }, 120)
  }

  dispose(): void {
    this.stopRumble()
  }
}
