export const MAX_MS = 120_000;
export const MAX_BYTES = 32 * 1024 * 1024;
export const MAX_NOTES = 20_000;
// Codec parameters are optional, but v0.1 only accepts these audio containers.
const audioType = /^audio\/(webm|ogg|mp4|wav|mpeg)(?:;codecs=[a-z0-9., "()-]+)?$/i;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
const range = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

export function validateObject(value) {
  if (value?.format !== 'pressboard-object' || value.version !== '0.1') {
    throw Error('Expected a Pressboard Object v0.1 file.');
  }
  const { name, durationMs, audio, notes = [] } = value;
  if (typeof name !== 'string' || !name.trim() || name.length > 80 ||
      !range(durationMs, 1, MAX_MS)) throw Error('Invalid sound name or duration.');
  if (!Array.isArray(notes) || notes.length > MAX_NOTES) throw Error('Invalid note list.');
  for (const note of notes) {
    if (!note || !range(note.atMs, 0, durationMs) ||
        !range(note.durationMs, 1, durationMs - note.atMs) ||
        !Number.isInteger(note.pitch) || !range(note.pitch, 0, 127) ||
        !range(note.velocity, 0, 1)) throw Error('Invalid performance note.');
  }
  if (audio !== undefined && (!audio || typeof audio.mimeType !== 'string' ||
      !audioType.test(audio.mimeType) || typeof audio.base64 !== 'string' ||
      audio.base64.length > MAX_BYTES || audio.base64.length % 4 || !base64.test(audio.base64))) {
    throw Error('Invalid or oversized embedded audio.');
  }
  if (!audio && !notes.length) throw Error('No audio or notes were captured.');
  const object = {
    format: 'pressboard-object', version: '0.1', name: name.trim(), durationMs,
    ...(audio && { audio: { mimeType: audio.mimeType, base64: audio.base64 } }),
    ...(notes.length && { notes: notes.map(({ atMs, durationMs, pitch, velocity }) =>
      ({ atMs, durationMs, pitch, velocity })) })
  };
  if (new TextEncoder().encode(JSON.stringify(object)).length > MAX_BYTES) {
    throw Error('Pressboard files are limited to 32 MiB.');
  }
  return object;
}

export async function makeObject({ name, durationMs, blob, notes }) {
  let audio;
  if (blob) {
    if (blob.size > (MAX_BYTES - 1024) * 0.75) throw Error('Recording is too large to export.');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    audio = { mimeType: blob.type, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  }
  return validateObject({ format: 'pressboard-object', version: '0.1', name, durationMs, audio, notes });
}

export async function readObject(file) {
  if (file.size > MAX_BYTES) throw Error('Pressboard files are limited to 32 MiB.');
  let value;
  try { value = JSON.parse(await file.text()); }
  catch { throw Error('This file is not valid JSON.'); }
  return validateObject(value);
}

export function downloadObject(object) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(object)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = (object.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') ||
    'performance') + '.pressboard.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
