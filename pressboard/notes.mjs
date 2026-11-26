import { MAX_NOTES } from './object.mjs';

export function captureNotes(startTime) {
  const notes = [];
  const active = new Map();
  return {
    on(voice, pitch, time, duration, amplitude) {
      if (notes.length >= MAX_NOTES || !Number.isInteger(pitch) || pitch < 0 ||
          pitch > 127 || amplitude <= 0) return;
      const note = {
        atMs: Math.max(0, Math.round((time - startTime) * 1000)),
        durationMs: duration === Infinity ? Infinity : Math.max(1, Math.round(duration * 1000)),
        pitch,
        velocity: Math.min(1, amplitude / 0.18)
      };
      notes.push(note);
      active.set(voice, note);
    },
    off(voice, time) {
      const note = active.get(voice);
      if (!note) return;
      // A scheduled note stopped before its onset should never play back.
      note.durationMs = Math.min(note.durationMs, Math.round((time - startTime) * 1000) - note.atMs);
      active.delete(voice);
    },
    ended(voice) { active.delete(voice); },
    finish(durationMs) {
      return notes.map(note => ({ ...note, durationMs: Math.min(note.durationMs, durationMs - note.atMs) }))
        .filter(note => note.durationMs >= 1)
        .sort((a, b) => a.atMs - b.atMs);
    }
  };
}
