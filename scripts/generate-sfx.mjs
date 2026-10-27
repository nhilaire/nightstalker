#!/usr/bin/env node
// Synthesises the game's sounds into assets/sfx/*.wav (mono, 22.05 kHz, 16-bit PCM), ported from the prototype's
// run-time synth (src/game/synth.ts). No samples, no third-party audio. Deterministic (seeded noise): re-running it
// produces identical files. Usage: node scripts/generate-sfx.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');

let seed = 20261027;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff - 0.5;
};

const buffer = (seconds) => new Float32Array(Math.floor(RATE * seconds));
const add = (samples, i, v) => {
  if (i < samples.length) samples[i] = Math.max(-1, Math.min(1, samples[i] + v));
};

// Heartbeat thump: dark fundamental + quiet octave for phone speakers, slow decay.
function thump(samples, startSec, durSec, fundamental, vol) {
  const start = Math.floor(startSec * RATE);
  const len = Math.floor(durSec * RATE);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 5);
    const v = (Math.sin(2 * Math.PI * fundamental * t) + Math.sin(2 * Math.PI * fundamental * 2 * t) * 0.22 + noise() * 0.08) * env * vol;
    add(samples, start + i, v);
  }
}

// Short sine blip with a tiny fade-in/out so it does not click.
function blip(samples, startSec, durSec, freq, vol) {
  const start = Math.floor(startSec * RATE);
  const len = Math.floor(durSec * RATE);
  const attack = Math.min(110, Math.floor(len * 0.15));
  const release = Math.min(220, Math.floor(len * 0.4));
  for (let i = 0; i < len; i++) {
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > len - release) env = Math.max(0, (len - i) / release);
    add(samples, start + i, Math.sin((2 * Math.PI * freq * i) / RATE) * env * vol);
  }
}

// lub-dub pair at a fixed offset; only the trailing silence shrinks as the tempo rises.
function heartbeat(period) {
  const s = buffer(period);
  thump(s, 0, 0.32, 38, 0.95);
  thump(s, 0.34, 0.32, 28, 0.75);
  return s;
}

const sounds = {
  // Two rising notes: a weapon is available.
  gun_spawn: () => {
    const s = buffer(0.18);
    blip(s, 0, 0.06, 700, 0.55);
    blip(s, 0.07, 0.1, 1050, 0.55);
    return s;
  },
  // Three faster, higher notes: a power-up appeared.
  bonus_spawn: () => {
    const s = buffer(0.16);
    blip(s, 0, 0.035, 900, 0.45);
    blip(s, 0.045, 0.035, 1300, 0.45);
    blip(s, 0.09, 0.045, 1700, 0.5);
    return s;
  },
  // Noise over a sine sliding from 110 Hz to 35 Hz, exponential decay.
  explosion: () => {
    const s = buffer(0.32);
    let phase = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      phase += (2 * Math.PI * (110 - 75 * (i / s.length))) / RATE;
      add(s, i, (Math.sin(phase) * 0.55 + noise() * 2 * 0.55) * Math.exp(-t * 7) * 0.7);
    }
    return s;
  },
  // "Boing": falling pitch, square overtone and tremolo.
  shield_bounce: () => {
    const s = buffer(0.26);
    let phase = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      const f = 1900 - 1450 * Math.min(1, i / s.length / 0.65);
      phase += (2 * Math.PI * f) / RATE;
      const wobble = 1 + Math.sin(2 * Math.PI * 35 * t) * 0.3;
      add(s, i, (Math.sin(phase) + Math.sign(Math.sin(phase * 2)) * 0.3) * wobble * Math.exp(-t * 5) * 0.95);
    }
    return s;
  },
};

// One heartbeat loop per main-robot tempo (seconds): heartbeat_180.wav ... heartbeat_105.wav.
export const HEARTBEAT_TEMPOS = [1.8, 1.65, 1.5, 1.35, 1.2, 1.05];
for (const tempo of HEARTBEAT_TEMPOS) sounds[`heartbeat_${Math.round(tempo * 100)}`] = () => heartbeat(tempo);

function wav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buf;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  const file = path.join(OUT, `${name}.wav`);
  fs.writeFileSync(file, wav(make()));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
