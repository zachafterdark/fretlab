import { downloadObject, makeObject, MAX_MS, readObject } from './object.mjs';
import { openLibrary, loadLibrary, updateLibrary } from './library.mjs';
import { createPlayer } from './player.mjs';
import { recordStream } from './record.mjs';

const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message; };
const colors = ['#ff9d97', '#ffc783', '#fae682', '#a9edab', '#8fe7de', '#9dd9ff', '#c9bbff', '#f5b3e6'];
const player = createPlayer((id, playing) => {
  $('pads').querySelector(`[data-id="${id}"]`)?.toggleAttribute('data-playing', playing);
}, status);
let library = [];
let database;
let selected;
let bank = 0;
let busy = false;
let recorder;
const size = () => Number($('size').value);

function render() {
  const banks = Math.max(1, Math.ceil(library.length / size()));
  bank = Math.min(bank, banks - 1);
  $('bank').textContent = `Bank ${bank + 1} of ${banks}`;
  $('previous').disabled = bank === 0;
  $('next').disabled = bank >= banks - 1;
  $('record').disabled = busy;
  $('import').disabled = busy;
  $('pads').replaceChildren(...Array.from({ length: size() }, (_, i) => {
    const item = library[bank * size() + i];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pad';
    button.style.setProperty('--pad', colors[i % colors.length]);
    button.textContent = item?.object.name || 'Empty';
    button.disabled = !item;
    if (item) {
      button.dataset.id = item.id;
      button.toggleAttribute('data-playing', player.isPlaying(item.id));
      button.onclick = () => {
        selected = item.id;
        $('sound').value = selected;
        renderActions();
        player.play(item.id, item.object);
      };
    }
    return button;
  }));
  if (!library.some(item => item.id === selected)) selected = library[0]?.id;
  $('sound').replaceChildren(...library.map(item => new Option(item.object.name, item.id)));
  $('sound').value = selected ?? '';
  renderActions();
}

function renderActions() {
  const index = library.findIndex(item => item.id === selected);
  $('sound').disabled = index < 0;
  $('earlier').disabled = busy || index <= 0;
  $('later').disabled = busy || index < 0 || index >= library.length - 1;
  $('export').disabled = $('remove').disabled = index < 0 || busy;
}

async function change(update) {
  if (database) library = await updateLibrary(database, update);
  else library = update(library);
}

async function add(object) {
  const id = crypto.randomUUID();
  await change(items => {
    if (items.length >= 64) throw Error('The library is full. Export or remove a sound to make room.');
    return [...items, { id, object }];
  });
  selected = id;
  bank = Math.floor(library.findIndex(item => item.id === id) / size());
  status(database ? `Added “${object.name}”.` : `Added “${object.name}”. Export it before leaving this page.`);
}

async function task(action) {
  if (busy) return;
  busy = true;
  $('record').disabled = $('import').disabled = true;
  renderActions();
  try { await action(); }
  catch (error) { status(error.message); }
  finally { busy = false; render(); }
}

$('record').onclick = () => task(async () => {
  if (!navigator.mediaDevices?.getUserMedia) throw Error('Microphone recording requires HTTPS or localhost.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const name = $('name').value.trim() || 'Mic take';
  let blob;
  let durationMs;
  try {
    recorder = recordStream(stream);
    const started = performance.now();
    $('finish').disabled = false;
    status('Recording microphone…');
    blob = await recorder.result;
    durationMs = Math.min(MAX_MS, Math.max(1, Math.round(performance.now() - started)));
  } finally {
    recorder = undefined;
    $('finish').disabled = true;
    stream.getTracks().forEach(track => track.stop());
  }
  await add(await makeObject({ name, durationMs, blob }));
});
$('finish').onclick = () => { $('finish').disabled = true; recorder?.stop(); };
$('import').onchange = event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (file) task(async () => add(await readObject(file)));
};
$('size').onchange = () => { bank = 0; render(); };
$('previous').onclick = () => { bank--; render(); };
$('next').onclick = () => { bank++; render(); };
$('stop').onclick = player.stopAll;
$('sound').onchange = () => { selected = $('sound').value; renderActions(); };
$('export').onclick = () => {
  const item = library.find(item => item.id === selected);
  if (item) downloadObject(item.object);
};
$('remove').onclick = () => {
  const id = selected;
  const item = library.find(item => item.id === id);
  if (!item || !confirm(`Remove “${item.object.name}” from this board?`)) return;
  task(async () => {
    await change(items => items.filter(item => item.id !== id));
    player.stop(id);
    status(`Removed “${item.object.name}”.`);
  });
};
for (const [button, step] of [['earlier', -1], ['later', 1]]) {
  $(button).onclick = () => {
    const id = selected;
    task(async () => {
      await change(items => {
        const index = items.findIndex(item => item.id === id);
        const target = index + step;
        if (index < 0 || target < 0 || target >= items.length) return items;
        const ordered = [...items];
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
        return ordered;
      });
      const index = library.findIndex(item => item.id === id);
      if (index >= 0) bank = Math.floor(index / size());
    });
  };
}

task(async () => {
  try {
    database = await openLibrary();
    library = await loadLibrary(database);
    status(library.length ? '' : 'Import a Pressboard file or record the microphone to fill your first pad.');
  } catch {
    database = undefined;
    status('Browser storage is unavailable. Export sounds before leaving this page.');
  }
});
