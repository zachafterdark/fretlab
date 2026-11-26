import { downloadObject, makeObject, MAX_MS } from './object.mjs';
import { captureNotes } from './notes.mjs';
import { recordStream } from './record.mjs';

export function installCapture(getAudio) {
  const start = document.getElementById('pressboard-start');
  const stop = document.getElementById('pressboard-stop');
  const save = document.getElementById('pressboard-export');
  const mode = document.getElementById('pressboard-mode');
  const status = document.getElementById('pressboard-status');
  let take;
  let capture;
  let finish;
  let notes;
  start.onclick = async () => {
    start.disabled = mode.disabled = true;
    let destination;
    let output;
    let deadline;
    try {
      ({ context: output, mix: destination } = await getAudio());
      const recordAudio = mode.value !== 'notes';
      const recordNotes = mode.value !== 'audio';
      let recorder;
      let tap;
      const startedAt = output.currentTime;
      if (recordAudio) {
        tap = output.createMediaStreamDestination();
        destination.connect(tap);
        capture = tap;
        recorder = recordStream(tap.stream);
      }
      if (recordNotes) notes = captureNotes(startedAt);
      let resolveStop;
      const stopped = new Promise(resolve => { resolveStop = resolve; });
      finish = () => {
        stop.disabled = true;
        recorder?.stop();
        resolveStop(Math.min(MAX_MS, Math.max(1, Math.round((output.currentTime - startedAt) * 1000))));
      };
      deadline = setTimeout(finish, MAX_MS);
      stop.disabled = false;
      status.textContent = 'Recording…';
      // MediaRecorder can also stop independently, for example if the stream ends.
      recorder?.result.then(finish, finish);
      const durationMs = await stopped;
      const recordedNotes = notes?.finish(durationMs);
      notes = undefined;
      const blob = await recorder?.result;
      take = await makeObject({
        name: document.getElementById('pressboard-name').value.trim() || 'Fretlab performance',
        durationMs, blob, notes: recordedNotes
      });
      save.disabled = false;
      status.textContent = `${take.name} ready to export.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      clearTimeout(deadline);
      if (capture) {
        destination.disconnect(capture);
        capture.stream.getTracks().forEach(track => track.stop());
      }
      capture = notes = finish = undefined;
      stop.disabled = true;
      start.disabled = mode.disabled = false;
    }
  };
  stop.onclick = () => finish?.();
  save.onclick = () => downloadObject(take);
  return {
    on: (...args) => notes?.on(...args),
    off: (...args) => notes?.off(...args),
    ended: (...args) => notes?.ended(...args)
  };
}
