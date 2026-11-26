# Fretlab

Serve the repository as a static site, for example with `python3 -m http.server 8000`, and open http://localhost:8000/. Use localhost or HTTPS for microphone and Web MIDI permissions.

## PressboardKit milestone 1

1. Open **Performance capture** in Fretlab, optionally name the take, choose **Audio + notes**, **Audio only**, or **Notes only**, and select **Record take**.
2. Play Fretlab, then select **Finish take** and **Export take**. Each take lasts up to two minutes. The export button holds the last successful take until a new one is ready.
3. Open **Pressboard** and import the `.pressboard.json` file. Press its pad to play it from the beginning. Pads can overlap. Use **Stop all** to silence the board.
4. To add a voice or other live sound, enter a name, select **Record mic**, grant microphone access, then select **Finish recording**. The completed take appears on a pad and can be exported in the same format.

The board saves up to 64 sounds in this browser using IndexedDB. Use **Manage sound** to reorder, export, or remove a pad. The 4-, 8-, and 16-pad bank sizes expose the same library. Export sounds to move them between browsers or devices. The site has no audio upload service.

The Fretlab audio track records the post-mixer, post-effects output, including drums and any playing backing track. Note capture records the pitched voices Fretlab starts during the take, including ones triggered by MIDI, controller gestures, the arpeggiator, or a MIDI backing track. The board renders those notes with a simple synth. To preserve drums, effects, pitch bending, mixer levels, and sounds already playing when capture begins, include audio. v0.1 does not export raw controller messages, transcribe microphone input, or integrate a Stream Deck.

See [Pressboard Object v0.1](pressboard/FORMAT.md) for the interchange format. Run `node --test` for the format and capture tests.
