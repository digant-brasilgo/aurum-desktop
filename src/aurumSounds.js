// ─────────────────────────────────────────────────────────────
// AURUM Sound System — Web Audio API tone synthesis
// No audio files needed. Pure JS. Classy, soft, professional.
// ─────────────────────────────────────────────────────────────

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Core tone builder
// freq: Hz, duration: seconds, type: oscillator type, volume: 0–1
// attack/release: seconds for fade in/out (prevents clicks)
function tone(freq, duration, { type='sine', volume=0.18, attack=0.01, release=0.08, delay=0 } = {}) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    const start = ctx.currentTime + delay;
    const end   = start + duration;

    // Smooth envelope — no clicks or pops
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.setValueAtTime(volume, end - release);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.start(start);
    osc.stop(end + 0.01);
  } catch(e) {
    // Silently ignore — audio should never crash the app
  }
}

// ── Sound definitions ─────────────────────────────────────────

const sounds = {

  // Soft ascending two-note chime — success, saved, confirmed
  success() {
    tone(880, 0.15, { volume: 0.14, attack: 0.01, release: 0.08 });
    tone(1108, 0.25, { volume: 0.12, attack: 0.01, release: 0.12, delay: 0.12 });
  },

  // Low soft descending thud — error, validation fail
  error() {
    tone(280, 0.18, { type: 'triangle', volume: 0.15, attack: 0.005, release: 0.12 });
    tone(220, 0.15, { type: 'triangle', volume: 0.10, attack: 0.005, release: 0.10, delay: 0.10 });
  },

  // Single warm bell — bag issued to department
  issued() {
    tone(740, 0.05, { volume: 0.20, attack: 0.005, release: 0.04 });         // sharp attack
    tone(740, 0.45, { type: 'sine', volume: 0.13, attack: 0.005, release: 0.35, delay: 0.02 }); // bell decay
  },

  // Gentle ascending 3-note chime — bag received / QC pass
  received() {
    tone(660, 0.18, { volume: 0.13, attack: 0.01, release: 0.10 });
    tone(880, 0.18, { volume: 0.13, attack: 0.01, release: 0.10, delay: 0.14 });
    tone(1047, 0.28, { volume: 0.12, attack: 0.01, release: 0.18, delay: 0.28 });
  },

  // Soft descending tone — QC fail, rejection
  qcFail() {
    tone(523, 0.18, { type: 'triangle', volume: 0.14, attack: 0.01, release: 0.10 });
    tone(392, 0.25, { type: 'triangle', volume: 0.12, attack: 0.01, release: 0.18, delay: 0.15 });
  },

  // Warm double chime — backup complete
  backup() {
    tone(784, 0.18, { volume: 0.14, attack: 0.01, release: 0.10 });
    tone(988, 0.18, { volume: 0.13, attack: 0.01, release: 0.10, delay: 0.20 });
    tone(1175, 0.30, { volume: 0.11, attack: 0.01, release: 0.22, delay: 0.40 });
  },

  // Gentle ascending sweep — data restored
  restore() {
    [523, 622, 740, 880].forEach((f, i) => {
      tone(f, 0.18, { volume: 0.12, attack: 0.01, release: 0.12, delay: i * 0.10 });
    });
  },

  // Very subtle welcome — app startup
  startup() {
    tone(392, 0.20, { volume: 0.10, attack: 0.02, release: 0.14 });
    tone(523, 0.20, { volume: 0.10, attack: 0.02, release: 0.14, delay: 0.22 });
    tone(659, 0.35, { volume: 0.09, attack: 0.02, release: 0.28, delay: 0.44 });
  },

  // Barely-there soft click — tab navigation
  nav() {
    tone(1200, 0.06, { type: 'triangle', volume: 0.07, attack: 0.005, release: 0.04 });
  },

  // Soft single ding — save confirmed, data written
  save() {
    tone(1047, 0.22, { volume: 0.12, attack: 0.005, release: 0.18 });
  },

  // Gentle alert tone — toast warning appears
  warn() {
    tone(440, 0.14, { type: 'triangle', volume: 0.13, attack: 0.01, release: 0.10 });
  },

  // Extra metal issued — warm mid tone
  extraMetal() {
    tone(587, 0.16, { volume: 0.13, attack: 0.01, release: 0.10 });
    tone(740, 0.22, { volume: 0.11, attack: 0.01, release: 0.16, delay: 0.14 });
  },

};

export default sounds;
export { sounds };
