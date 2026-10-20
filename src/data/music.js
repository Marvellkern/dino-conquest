// Music (music brief v2.4): every track is note data, played live by systems/music.js.
// A track:
//   bpm       16 steps per bar (16th notes)
//   leadWave  'square50' | 'square25' | 'square12' | 'triangle'
//   swing     0..0.15: every 2nd 8th note comes late by swing x one step
//   chords    one chord per bar (names in CHORDS)
//   lead      one string per bar, 16 tokens: a note (A4, G#4, C6) starts it, '-' holds the
//             previous note, '.' is a rest
//   bass / arp / drums   pattern ids (BASS, ARP, DRUMS below); drums can also be a list,
//             one pattern per bar ('none' = silent)
//   optional: vibrato { cents, hz } on the lead; detune: cents for a second lead (one
//             voice each side); surf { every, vol, freq }: a noise swell every n bars
//   gain      loudness trim so every track sits at the same level (measured offline,
//             see music.render in systems/music.js)
// To add a track: add it to TRACKS, then pick it in trackFor() (or call music.play(id)).

// Chord tones as pitch classes; the first is the root (bass), the third the fifth.
export const CHORDS = {
  C: ['C', 'E', 'G'], Cm: ['C', 'D#', 'G'], D: ['D', 'F#', 'A'], Dm: ['D', 'F', 'A'],
  E: ['E', 'G#', 'B'], Em: ['E', 'G', 'B'], F: ['F', 'A', 'C'], Fm: ['F', 'G#', 'C'],
  'F#': ['F#', 'A#', 'C#'], G: ['G', 'B', 'D'], Gm: ['G', 'A#', 'D'], Ab: ['G#', 'C', 'D#'],
  A: ['A', 'C#', 'E'], Am: ['A', 'C', 'E'], Bb: ['A#', 'D', 'F'], B: ['B', 'D#', 'F#'], Bm: ['B', 'D', 'F#'],
  Cmaj7: ['C', 'E', 'G', 'B'], Am7: ['A', 'C', 'E', 'G'], Fmaj7: ['F', 'A', 'C', 'E'], G6: ['G', 'B', 'D', 'E'],
  Em7: ['E', 'G', 'B', 'D'], Dm7: ['D', 'F', 'A', 'C']
};

// Envelopes: [attack, decay, sustain level, release] in seconds / 0-1.
export const LEAD = { vol: 0.2, env: [0.004, 0.06, 0.65, 0.05] };

// Bass (triangle). notes: [step, 'root' | 'fifth', octave]; len in steps.
const every = (fn) => Array.from({ length: 16 }, (_, i) => fn(i)).filter(Boolean);
export const BASS = {
  half: { notes: [[0, 'root', 2], [8, 'root', 2]], len: 7.5, vol: 0.42, env: [0.01, 0.2, 0.7, 0.1] },
  drive: {
    notes: [[0, 'root', 2], [2, 'root', 2], [4, 'root', 3], [6, 'root', 2], [8, 'root', 2], [10, 'root', 2], [12, 'root', 3], [14, 'fifth', 2]],
    len: 1.7, vol: 0.5, env: [0.003, 0.05, 0.7, 0.03]
  },
  gallop: { notes: every((i) => i % 4 !== 3 && [i, 'root', i === 4 || i === 12 ? 3 : 2]), len: 0.9, vol: 0.5, env: [0.002, 0.03, 0.6, 0.02] },
  // 8th-note chug, octave 1-2, on a square so the low notes still bite
  chug: { wave: 'square50', notes: every((i) => i % 2 === 0 && [i, 'root', i === 4 || i === 12 ? 2 : 1]), len: 1.2, vol: 0.22, env: [0.002, 0.04, 0.6, 0.02] }
};

// Arps (square12): the chord's tones going up from the root in octave 4, then the root an
// octave up, cycling. every: a note each n steps.
export const ARP = {
  slow: { every: 2, len: 1.8, vol: 0.05, env: [0.004, 0.15, 0.3, 0.1] },
  fast: { every: 1, len: 0.8, vol: 0.045, env: [0.002, 0.05, 0.4, 0.02] }
};

// Drums: [step, volume] per sound (kick, snare, hat = closed, open = open hat).
// fill: extra hits on some bars ('last' = the loop's last bar, or a list of 1-based bars).
const steps = (list, vol) => list.map((s) => [s, typeof vol === 'function' ? vol(s) : vol]);
export const DRUMS = {
  soft: { kick: [[0, 0.5], [8, 0.4]], hat: steps([2, 6, 10, 14], 0.06) },
  groove: {
    kick: [[0, 0.6], [6, 0.45], [8, 0.6], [11, 0.45]],
    snare: steps([4, 12], 0.4),
    hat: steps([0, 2, 4, 6, 8, 10, 12], (s) => (s % 4 === 2 ? 0.1 : 0.07)),
    open: [[14, 0.09]],
    fill: { bars: 'last', snare: [[13, 0.3], [14, 0.35], [15, 0.4]] }
  },
  hard: {
    kick: steps([0, 3, 6, 8, 10, 11, 14], 0.6),
    snare: steps([4, 12], 0.5),
    hat: steps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], (s) => (s % 2 ? 0.07 : 0.11)),
    fill: { bars: [4, 8], snare: [[14, 0.45], [15, 0.5]] }
  },
  // Swamp: bloops instead of hats
  bloop: {
    kick: [[0, 0.55], [7, 0.35], [10, 0.45]],
    snare: steps([4, 12], 0.28),
    bloop: [[2, 0.3], [6, 0.22], [11, 0.28], [14, 0.22]]
  },
  // Volcano: heavy, tom rolls on the fills
  heavy: {
    kick: steps([0, 3, 8, 10], 0.6),
    snare: steps([4, 12], 0.5),
    hat: steps([0, 2, 4, 6, 8, 10, 12, 14], (s) => (s % 4 === 2 ? 0.1 : 0.07)),
    fill: { bars: [4, 8], tom: [[12, 0.5], [13, 0.5], [14, 0.55], [15, 0.6]] }
  },
  // Coast: light, rolling
  tide: {
    kick: [[0, 0.55], [6, 0.35], [8, 0.5]],
    snare: steps([4, 12], 0.3),
    hat: steps([2, 6, 10, 14], 0.07)
  }
};

export const TRACKS = {
  nest: {
    bpm: 92, leadWave: 'triangle', swing: 0.08, gain: 0.95,
    chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G6', 'Cmaj7', 'Em7', 'Dm7', 'G6'],
    lead: [
      'E5 - - - G5 - - - E5 - D5 - C5 - - -',
      '. . A4 - C5 - E5 - D5 - - - . . . .',
      'F5 - - - E5 - - - C5 - A4 - C5 - - -',
      'D5 - - - - - - - B4 - - - . . . .',
      'E5 - - - G5 - - - C6 - B5 - G5 - - -',
      'E5 - - - D5 - E5 - G5 - - - . . . .',
      'F5 - - - A5 - - - G5 - F5 - D5 - - -',
      'D5 - - - - - - - - - - - . . . .'
    ],
    bass: 'half', arp: 'slow', drums: 'soft'
  },
  jungle: {
    bpm: 132, leadWave: 'square50', swing: 0, gain: 0.73,
    chords: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E'],
    lead: [
      'A4 - - C5 E5 - D5 - C5 - B4 - A4 - - .',
      'F4 - A4 - C5 - F5 - E5 - D5 - C5 - - .',
      'D5 - - B4 G4 - B4 - D5 - G5 - F5 - E5 -',
      'E5 - - - B4 - - - G4 - A4 - B4 - - .',
      'E5 - - A5 G5 - E5 - D5 - C5 - D5 - E5 -',
      'F5 - - E5 C5 - A4 - C5 - F5 - A5 - - .',
      'G5 - F5 - D5 - B4 - G4 - B4 - D5 - F5 -',
      'E5 - - - - - D5 - B4 - G#4 - E4 - - .'
    ],
    bass: 'drive', arp: 'fast', drums: 'groove'
  },
  boss: {
    bpm: 164, leadWave: 'square25', swing: 0, gain: 0.75,
    chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Gm', 'Bb', 'A'],
    lead: [
      'D5 - D5 F5 A5 - G5 F5 E5 - F5 - D5 - - .',
      'D5 - D5 F5 A5 - C6 - A5 - G5 - F5 - E5 -',
      'F5 - - D5 A#4 - D5 - F5 - A#5 - A5 - G5 -',
      'G5 - - E5 C5 - E5 - G5 - C6 - A#5 - A5 -',
      'A5 - - - D6 - C6 - A5 - - - F5 - A5 -',
      'A#5 - - - G5 - - - D5 - G5 - A#5 - D6 -',
      'D6 - C6 - A#5 - A5 - F5 - A#5 - D6 - F6 -',
      'E6 - - - C#6 - - - A5 - - - E5 - C#5 -'
    ],
    bass: 'gallop', arp: 'fast', drums: 'hard'
  },

  // Composed for v2.4 step 3 (same format and style as the three above).
  // Swamp, E phrygian: murky and bouncy. Motif E-G-F-E (the phrygian half step).
  swamp: {
    bpm: 104, leadWave: 'triangle', swing: 0.1, gain: 0.9, vibrato: { cents: 15, hz: 5 },
    chords: ['Em', 'F', 'Em', 'D', 'Em', 'C', 'D', 'B'],
    lead: [
      'E4 - G4 - F4 E4 - . B4 - - - G4 - E4 -',
      'F4 - A4 - C5 - A4 - F4 - E4 - F4 - - .',
      'E4 - G4 - F4 E4 - . B4 - D5 - B4 - G4 -',
      'F#4 - A4 - D5 - - - A4 - F#4 - D4 - - .',
      'E5 - - D5 B4 - G4 - E4 - G4 - B4 - - .',
      'C5 - - B4 G4 - E4 - G4 - C5 - E5 - - .',
      'D5 - - C5 A4 - F#4 - A4 - D5 - F#5 - E5 -',
      'D#5 - - - B4 - - - F#4 - A4 - G4 - F4 -'
    ],
    bass: 'half', arp: 'slow', drums: 'bloop'
  },
  // Volcano, C minor: heavy. Motif C-C-Eb-D-C, chugging bass, tom fills.
  volcano: {
    bpm: 140, leadWave: 'square25', swing: 0, gain: 1,
    chords: ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G'],
    lead: [
      'C5 - C5 - D#5 - D5 C5 - - G4 - C5 - D#5 -',
      'D#5 - D5 - C5 - - - G#4 - C5 - D#5 - - .',
      'D5 - D5 - F5 - D#5 D5 - - A#4 - D5 - F5 -',
      'G5 - - - F5 - D#5 - D5 - - - B4 - - .',
      'C6 - - G5 D#5 - G5 - C6 - D6 - D#6 - D6 C6',
      'G#5 - - D#5 C5 - D#5 - G#5 - G5 - F5 - D#5 -',
      'F5 - - C5 G#4 - C5 - F5 - G5 - G#5 - G5 F5',
      'G5 - - - D5 - - - B4 - - - G4 - B4 -'
    ],
    bass: 'chug', arp: 'fast', drums: 'heavy'
  },
  // Tidal Coast, D dorian: wide and windy. Long notes, motif D-A-G-F-E, surf swells.
  coast: {
    bpm: 120, leadWave: 'square12', swing: 0, gain: 0.94, surf: { every: 4, vol: 0.12, freq: 900 },
    chords: ['Dm7', 'G', 'Dm7', 'C', 'Bb', 'F', 'C', 'A'],
    lead: [
      'D5 - - - A5 - - - G5 - F5 - E5 - - -',
      'D5 - - - - - - - B4 - - - G4 - - -',
      'D5 - - - A5 - - - C6 - A5 - G5 - - -',
      'E5 - - - - - - - G5 - - - E5 - - .',
      'F5 - - - D5 - - - A#4 - - - D5 - F5 -',
      'A5 - - - - - - - C6 - A5 - F5 - - -',
      'G5 - - - E5 - - - C5 - E5 - G5 - - -',
      'E5 - - - - - - - C#5 - - - A4 - - -'
    ],
    bass: 'half', arp: 'slow', drums: 'tide'
  },
  // Meteor Crater, B minor: eerie and cosmic. Two detuned leads; sparse for 4 bars (soft
  // drums), then the motif B-F#-D opens up with full drums.
  crater: {
    bpm: 116, leadWave: 'square50', swing: 0, gain: 0.76, detune: 7,
    chords: ['Bm', 'G', 'Em', 'F#', 'Bm', 'G', 'D', 'F#'],
    lead: [
      'B4 - - - - - - - F#5 - - - D5 - - -',
      'G5 - - - - - - - - - - - . . . .',
      'E5 - - - G5 - - - B5 - - - - - - -',
      'A#5 - - - - - - - C#6 - - - . . . .',
      'B5 - - F#5 D5 - F#5 - B5 - C#6 - D6 - C#6 -',
      'B5 - - G5 D5 - G5 - B5 - D6 - E6 - D6 -',
      'F#6 - - D6 A5 - D6 - F#6 - E6 - D6 - C#6 -',
      'C#6 - - - A#5 - - - F#5 - - - C#5 - - -'
    ],
    bass: 'drive', arp: 'slow', drums: ['soft', 'soft', 'soft', 'soft', 'groove', 'groove', 'groove', 'groove']
  },
  // Meteor Titan, the final boss: D minor like boss, the lead quoting the Nest motif
  // (E-G-E-D-C) in minor, F-A-F-E-D.
  titan: {
    bpm: 172, leadWave: 'square25', swing: 0, gain: 0.73,
    chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'C', 'A'],
    lead: [
      'F5 - - - A5 - - - F5 - E5 - D5 - - -',
      'D5 - F5 - A#5 - D6 - C6 - A#5 - A5 - F5 -',
      'G5 - - - A#5 - - - G5 - F5 - D5 - - -',
      'E5 - - - C#5 - E5 - A5 - - - G5 - E5 -',
      'A5 - - - D6 - - - A5 - G5 - F5 - - -',
      'F5 - - - D5 - F5 - A#5 - - - . . A5 -',
      'G5 - - - C6 - - - A#5 - A5 - G5 - E5 -',
      'E5 - - - - - - - C#5 - E5 - A5 - C#6 -'
    ],
    bass: 'gallop', arp: 'fast', drums: 'hard'
  }
};

// Stingers: one-shots over the music (music.stinger), which ducks under them. Each part is
// a voice with its own note line (same tokens as a lead, any length); held chords are
// several parts. vol / env default to the lead's.
const HOLD = { env: [0.004, 0.08, 0.7, 0.35] }; // long release so held chords ring out
export const STINGERS = {
  // Run cleared: a rising C major arpeggio, then the chord held.
  victory: {
    bpm: 150, ...HOLD,
    parts: [
      { wave: 'square50', line: 'C5 - E5 - G5 - C6 - - - - - - - - - - - - - - - - .' },
      { wave: 'square25', vol: 0.11, line: '. . . . . . E5 - - - - - - - - - - - - - - - - .' },
      { wave: 'square25', vol: 0.11, line: '. . . . . . G5 - - - - - - - - - - - - - - - - .' },
      { wave: 'triangle', vol: 0.4, line: 'C3 - - - - - C3 - - - - - - - - - - - - - - - - .' }
    ]
  },
  // The run is over: a slow falling A minor line on triangle, no drums.
  defeat: {
    bpm: 84, ...HOLD,
    parts: [
      { wave: 'triangle', vol: 0.24, line: 'A4 - - - G4 - - - E4 - - - C4 - - - - - - - - - - .' },
      { wave: 'triangle', vol: 0.36, line: 'A2 - - - - - - - F2 - - - - - - - - - - - - - - .' }
    ]
  },
  // Evolution: started with the flicker, a fast arp climbing two octaves lands its bright
  // held C6 on the flash (8 steps at 125 BPM, about as long as the flicker).
  evolve: {
    bpm: 125, ...HOLD,
    parts: [
      { wave: 'square12', vol: 0.14, line: 'C4 E4 G4 B4 C5 E5 G5 B5 . . . . . . . . . . . . . . . .' },
      { wave: 'square25', vol: 0.2, line: '. . . . . . . . C6 - - - - - - - - - - - - - - .' },
      { wave: 'square50', vol: 0.1, line: '. . . . . . . . G5 - - - - - - - - - - - - - - .' },
      { wave: 'triangle', vol: 0.4, line: '. . . . . . . . C3 - - - - - - - - - - - - - - .' }
    ]
  },
  // Zone cleared: a one-bar fanfare.
  zoneClear: {
    bpm: 140, ...HOLD,
    parts: [
      { wave: 'square50', line: 'G4 - G4 C5 - - E5 - G5 - - - C6 - - .' },
      { wave: 'square25', vol: 0.1, line: 'E4 - E4 G4 - - C5 - E5 - - - E5 - - .' },
      { wave: 'triangle', vol: 0.4, line: 'C3 - - - - - - - G2 - - - C3 - - .' }
    ]
  },
  // The egg cracks open: a quick sparkle up high.
  hatch: {
    bpm: 200,
    parts: [
      { wave: 'square12', vol: 0.12, line: 'C6 E6 G6 C7 E7 - - - .' },
      { wave: 'square12', vol: 0.06, line: '. . C6 E6 G6 C7 - - .' }
    ]
  }
};

// Which track a zone plays: its own, or in a boss fight the boss track (the Meteor Titan,
// the final boss, gets titan).
export const trackFor = (zone, { boss = false } = {}) => (boss ? (zone === 'crater' ? 'titan' : 'boss') : TRACKS[zone] ? zone : 'jungle');
