function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(encoded);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function createPlayer(onState, onError) {
  const playing = new Map();
  let context;

  function stop(id) {
    const run = playing.get(id);
    if (!run) return;
    playing.delete(id);
    run.cleanup?.();
    onState(id, false);
  }

  async function playNotes(id, object, run) {
    context ??= new AudioContext();
    await context.resume();
    if (playing.get(id) !== run) return;
    const start = context.currentTime + 0.02;
    const end = start + object.durationMs / 1000;
    const voices = new Set();
    const bus = context.createGain();
    bus.connect(context.destination);
    const notes = [...object.notes].sort((a, b) => a.atMs - b.atMs);
    let index = 0;
    function schedule() {
      const now = context.currentTime;
      if (now >= end) { stop(id); return; }
      while (index < notes.length && start + notes[index].atMs / 1000 < now + 0.1) {
        const note = notes[index++];
        const onset = start + note.atMs / 1000;
        const until = onset + note.durationMs / 1000;
        const at = Math.max(onset, now);
        if (until <= at || voices.size >= 64 || !note.velocity) continue;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(note.velocity * 0.13, at + Math.min(0.01, (until - at) / 2));
        gain.gain.linearRampToValueAtTime(0, until);
        oscillator.connect(gain);
        gain.connect(bus);
        voices.add(oscillator);
        oscillator.onended = () => {
          voices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(at);
        oscillator.stop(until);
      }
    }
    const timer = setInterval(schedule, 25);
    run.cleanup = () => {
      clearInterval(timer);
      bus.disconnect();
      for (const oscillator of voices) oscillator.stop();
    };
    schedule();
  }

  async function play(id, object) {
    stop(id);
    const run = {};
    playing.set(id, run);
    onState(id, true);
    try {
      if (object.audio) {
        const bytes = decodeBase64(object.audio.base64);
        const url = URL.createObjectURL(new Blob([bytes], { type: object.audio.mimeType }));
        const audio = new Audio(url);
        const cleanup = () => {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          URL.revokeObjectURL(url);
        };
        run.cleanup = cleanup;
        audio.onended = () => { if (playing.get(id) === run) stop(id); };
        try {
          await audio.play();
          audio.onerror = () => {
            if (playing.get(id) !== run) return;
            stop(id);
            onError(`Playback stopped because “${object.name}” could not be decoded.`);
          };
        } catch (error) {
          if (playing.get(id) !== run) return;
          if (!object.notes?.length) throw error;
          cleanup();
          run.cleanup = undefined;
          await playNotes(id, object, run);
        }
      } else {
        await playNotes(id, object, run);
      }
    } catch {
      if (playing.get(id) !== run) return;
      stop(id);
      onError(`Could not play “${object.name}”. This browser may not support its audio codec.`);
    }
  }
  return { play, stop, isPlaying: id => playing.has(id), stopAll: () => [...playing.keys()].forEach(stop) };
}
