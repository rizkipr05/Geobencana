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

export function playEarthquakeRumble(duration = 4.5) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    // Sub-bass oscillator (38 - 55 Hz)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(42, ctx.currentTime);

    // Random frequency modulation for realistic ground tremor
    const lfo = ctx.createOscillator();
    lfo.type = "sawtooth";
    lfo.frequency.setValueAtTime(8, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(15, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.4);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start();
    lfo.start();
    osc.stop(ctx.currentTime + duration);
    lfo.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}

export function playVolcanoBlast(duration = 4.0) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    // Deep explosive low rumble
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(65, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + duration);

    // Blast noise buffer simulation
    const bufferSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + duration);
    noise.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}

export function playTsunamiSurge(duration = 5.0) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    // Ocean surge roaring filter sweep
    const bufferSize = ctx.sampleRate * Math.min(duration, 5.0);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(120, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(450, ctx.currentTime + 2.0);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.8);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}

export function playTransformerSparks() {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime); // 60Hz/120Hz mains buzz

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore
  }
}

export function getSirenState() {
  return isPlaying;
}
