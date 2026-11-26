import { MAX_MS } from './object.mjs';

export function recordStream(stream) {
  if (typeof MediaRecorder === 'undefined') throw Error('Audio recording is unavailable in this browser.');
  const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find(type => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 128_000 });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => reject(event.error || Error('Audio recording failed.'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chunks[0]?.type || recorder.mimeType });
      if (blob.size) resolve(blob);
      else reject(Error('No audio was recorded.'));
    };
  });
  recorder.start(1000);
  const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
  const deadline = setTimeout(stop, MAX_MS);
  const result = finished.finally(() => clearTimeout(deadline));
  return { stop, result };
}
