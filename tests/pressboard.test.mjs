import test from 'node:test';
import assert from 'node:assert/strict';
import { makeObject, readObject, validateObject } from '../pressboard/object.mjs';
import { captureNotes } from '../pressboard/notes.mjs';

const note = { atMs: 20, durationMs: 150, pitch: 60, velocity: 0.7 };
const take = {
  format: 'pressboard-object', version: '0.1', name: 'First take', durationMs: 500,
  notes: [note]
};

test('a note-only take survives export serialization and reimport', async () => {
  const object = await makeObject(take);
  assert.deepEqual(await readObject(new Blob([JSON.stringify(object)])), take);
});

test('audio-only takes are valid and preserve the codec', () => {
  const audio = { mimeType: 'audio/webm;codecs=opus', base64: 'AQID' };
  assert.deepEqual(validateObject({ ...take, notes: [], audio }).audio, audio);
});

test('invalid and empty takes are rejected', async () => {
  for (const change of [
    { version: '2' }, { name: ' ' }, { durationMs: Infinity }, { notes: [] },
    { notes: [{ ...note, pitch: 128 }] }, { notes: [{ ...note, durationMs: 1000 }] },
    { audio: { mimeType: 'text/html', base64: 'AQID' } },
    { audio: { mimeType: 'audio/mp4', base64: 'A===' } }
  ]) assert.throws(() => validateObject({ ...take, ...change }));
  await assert.rejects(readObject(new Blob(['not JSON'])), /valid JSON/);
});

test('polyphonic capture clips held notes and drops canceled future voices', () => {
  const capture = captureNotes(12);
  const first = {}, held = {}, future = {}, timed = {};
  capture.on(future, 65, 12.4, 0.2, 0.18);
  capture.on(first, 60, 12.05, Infinity, 0.09);
  capture.on(held, 64, 12.02, Infinity, 0.18);
  capture.on(timed, 57, 12.1, 0.04, 0.18);
  capture.off(first, 12.15);
  capture.off(future, 12.17);
  capture.ended(timed);
  assert.deepEqual(capture.finish(250), [
    { atMs: 20, durationMs: 230, pitch: 64, velocity: 1 },
    { atMs: 50, durationMs: 100, pitch: 60, velocity: 0.5 },
    { atMs: 100, durationMs: 40, pitch: 57, velocity: 1 }
  ]);
});
