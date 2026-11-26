# Pressboard Object v0.1

A Pressboard file is a UTF-8 JSON object, typically named `<sound>.pressboard.json`. A single file contains everything needed to play one sound. Files have a 32 MiB limit, and takes have a 120,000 ms limit.

```json
{
  "format": "pressboard-object",
  "version": "0.1",
  "name": "Green chord",
  "durationMs": 500,
  "notes": [
    { "atMs": 0, "durationMs": 450, "pitch": 60, "velocity": 0.8 },
    { "atMs": 0, "durationMs": 450, "pitch": 64, "velocity": 0.7 }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `format`, `version` | Required literal strings `pressboard-object` and `0.1`. |
| `name` | Required nonblank display name, up to 80 UTF-16 code units. |
| `durationMs` | Required take length in milliseconds, from 1 through 120,000. |
| `audio` | Optional object with `mimeType` and `base64` strings. Base64 uses the standard alphabet and padding, with no data URL prefix. Supported containers are WebM, MP4, Ogg, WAV, and MPEG audio. Codec parameters may be present. |
| `notes` | Optional array of up to 20,000 notes. Notes may overlap and can appear in any order. |

Include at least one playable representation. Note `atMs` is the onset relative to the take start, `durationMs` is at least 1 ms, and a note must end within the take. `pitch` is an integer MIDI note number from 0 through 127. `velocity` is a normalized value from 0 through 1. The board prefers embedded audio and uses notes if audio cannot start. Audio playback depends on the browser supporting the embedded codec. `durationMs` describes the take timeline. Encoders may add padding to the audio.

Importers should ignore unknown fields and reject unsupported versions. A format-valid file can still contain undecodable audio. The file conveys no board position or library identity.
