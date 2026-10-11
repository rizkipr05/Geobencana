// Web Audio API Emergency Tsunami & Earthquake Early Warning Siren Synthesizer

let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenModulator: OscillatorNode | null = null;
let isPlaying = false;

export function initAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function startEmergencySiren() {
  if (typeof window === "undefined" || isPlaying) return;

  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    // Master volume gain
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.connect(ctx.destination);
    sirenGain = gainNode;

    // Carrier oscillator (main siren pitch oscillating around 800 Hz)
    const carrier = ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.setValueAtTime(750, ctx.currentTime);

    // LFO Modulator for pitch rising and falling (sweeping 600Hz - 950Hz at 0.4 Hz rate)
    const modulator = ctx.createOscillator();
    modulator.type = "sine";
    modulator.frequency.setValueAtTime(0.35, ctx.currentTime); // 1 sweep every ~3 seconds

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(200, ctx.currentTime); // Frequency variation amplitude

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrier.connect(gainNode);

    carrier.start();
    modulator.start();

    sirenOscillator = carrier;
    sirenModulator = modulator;
    isPlaying = true;
  } catch (err) {
    console.error("Failed to start emergency audio siren:", err);
  }
}

export function stopEmergencySiren() {
  if (!isPlaying) return;

  try {
    if (sirenOscillator) {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
      sirenOscillator = null;
    }
    if (sirenModulator) {
      sirenModulator.stop();
      sirenModulator.disconnect();
      sirenModulator = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
    isPlaying = false;
  } catch (err) {
    console.error("Failed to stop emergency audio siren:", err);
  }
}

export function playSingleBeep(freq = 880, duration = 0.25) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}

export function getSirenState() {
  return isPlaying;
}
