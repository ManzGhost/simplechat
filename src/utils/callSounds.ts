// Web Audio API Sound Synthesizer for Voice & Video Calling tones
// No external assets required; fully self-contained and browser-native.

class CallSoundPlayer {
  private ctx: AudioContext | null = null;
  private currentInterval: number | null = null;
  private activeOscillators: OscillatorNode[] = [];

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Ringback tone for outgoing calls (Dual-tone frequency pulses)
  playOutgoingRing(): void {
    this.stopAll();
    const ctx = this.getAudioContext();

    const ringPulse = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = ctx.currentTime;

      // 440 Hz + 480 Hz standard ringback
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.6);
      gain.gain.linearRampToValueAtTime(0, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.85);
      osc2.stop(now + 1.85);

      this.activeOscillators.push(osc1, osc2);
    };

    ringPulse();
    this.currentInterval = window.setInterval(ringPulse, 3500);
  }

  // Pleasant melodic chime for incoming calls
  playIncomingRing(): void {
    this.stopAll();
    const ctx = this.getAudioContext();

    const notes = [
      { freq: 587.33, start: 0, dur: 0.18 },   // D5
      { freq: 659.25, start: 0.2, dur: 0.18 }, // E5
      { freq: 880.00, start: 0.4, dur: 0.28 }, // A5
      { freq: 783.99, start: 0.7, dur: 0.35 }, // G5
    ];

    const ringPattern = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const baseTime = ctx.currentTime;

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, baseTime + note.start);

        gain.gain.setValueAtTime(0, baseTime + note.start);
        gain.gain.linearRampToValueAtTime(0.12, baseTime + note.start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, baseTime + note.start + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(baseTime + note.start);
        osc.stop(baseTime + note.start + note.dur + 0.05);
        this.activeOscillators.push(osc);
      });
    };

    ringPattern();
    this.currentInterval = window.setInterval(ringPattern, 2200);
  }

  // Soft ascending chime when call connects
  playCallConnected(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  // Quick soft descending tone when call ends
  playCallEnded(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  stopAll(): void {
    if (this.currentInterval !== null) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeOscillators = [];
  }
}

export const callSounds = new CallSoundPlayer();
