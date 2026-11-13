class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'triangle', volume = 0.08, delay = 0, slideTo?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    this.tone(520, 0.045, 'sine', 0.04, 0, 620);
  }

  public playJump() {
    this.tone(240, 0.14, 'triangle', 0.07, 0, 480);
  }

  public playCoinCollect() {
    this.tone(987.77, 0.08, 'square', 0.045, 0);
    this.tone(1318.51, 0.16, 'square', 0.05, 0.065);
  }

  public playCodeSuccess() {
    this.tone(523.25, 0.1, 'triangle', 0.07, 0);
    this.tone(659.25, 0.1, 'triangle', 0.07, 0.08);
    this.tone(783.99, 0.18, 'triangle', 0.08, 0.16);
  }

  public playCodeError() {
    this.tone(220, 0.12, 'sawtooth', 0.045, 0, 175);
    this.tone(175, 0.16, 'sawtooth', 0.045, 0.1, 140);
  }

  public playObstacleUnlocked() {
    this.tone(392.0, 0.11, 'triangle', 0.08, 0);
    this.tone(523.25, 0.11, 'triangle', 0.08, 0.09);
    this.tone(659.25, 0.12, 'triangle', 0.08, 0.18);
    this.tone(1046.5, 0.28, 'sine', 0.09, 0.27);
  }

  public playAchievementUnlock() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      this.tone(n, 0.16, 'triangle', 0.075, idx * 0.07);
    });
  }

  public playMissionVictory() {
    const notes = [440, 554.37, 659.25, 880, 659.25, 880, 1108.73];
    const delays = [0, 0.09, 0.18, 0.28, 0.42, 0.52, 0.64];
    notes.forEach((n, idx) => {
      this.tone(n, idx === notes.length - 1 ? 0.36 : 0.12, 'triangle', 0.085, delays[idx]);
    });
  }

  public playConstructionStage(stage: number) {
    const base = 330 + stage * 65;
    this.tone(base, 0.09, 'square', 0.05, 0, base * 1.15);
    this.tone(base * 1.25, 0.11, 'triangle', 0.07, 0.08);
    this.tone(base * 1.5, 0.22, 'sine', 0.08, 0.16);
  }

  public playWorldRestorationFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98];
    const delays = [0, 0.1, 0.2, 0.32, 0.48, 0.6, 0.74, 0.9];
    notes.forEach((n, idx) => {
      this.tone(n, idx === notes.length - 1 ? 0.55 : 0.15, 'triangle', 0.09, delays[idx]);
    });
  }

  public playTreasureChestOpen() {
    // Creaking latch + sparkling golden crystal chord
    this.tone(293.66, 0.08, 'triangle', 0.06, 0, 349.23);
    const sparkleNotes = [587.33, 739.99, 880, 1174.66, 1479.98];
    sparkleNotes.forEach((freq, idx) => {
      this.tone(freq, idx === sparkleNotes.length - 1 ? 0.38 : 0.14, 'triangle', 0.08, 0.08 + idx * 0.065);
    });
  }
}

export const soundFX = new SoundSynthesizer();
