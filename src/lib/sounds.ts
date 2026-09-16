"use client";

// Subtle, synthesized UI sound effects (Web Audio API — no audio files to
// ship or license). Kept deliberately quiet and short, matching the app's
// restrained, Apple-inspired interaction style rather than a "gamey" feel.

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext) sharedContext = new AudioContextClass();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

interface Tone {
  frequency: number;
  startOffset: number; // seconds from the call
  duration: number; // seconds
  gain: number; // peak volume, 0-1
  type?: OscillatorType;
}

function playTones(tones: Tone[]) {
  const ctx = getContext();
  if (!ctx) return;

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.value = tone.frequency;

    const start = ctx.currentTime + tone.startOffset;
    const end = start + tone.duration;

    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(tone.gain, start + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** A trade was saved / closed successfully — soft ascending two-note chime. */
export function playSuccessSound() {
  playTones([
    { frequency: 740, startOffset: 0, duration: 0.1, gain: 0.08 },
    { frequency: 988, startOffset: 0.08, duration: 0.14, gain: 0.09 },
  ]);
}

/** A blocking validation error — short, low, single tone. */
export function playErrorSound() {
  playTones([{ frequency: 220, startOffset: 0, duration: 0.16, gain: 0.08, type: "triangle" }]);
}

/** A new notification arrived — light, single pop. */
export function playNotificationSound() {
  playTones([{ frequency: 880, startOffset: 0, duration: 0.09, gain: 0.06 }]);
}

/** Generic interactive click (buttons, links, toggles) — very short, quiet tick. */
export function playClickSound() {
  playTones([{ frequency: 1400, startOffset: 0, duration: 0.035, gain: 0.035 }]);
}
