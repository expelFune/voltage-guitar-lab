"use strict";

const tuning = [40, 45, 50, 55, 59, 64];
const roots = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const letters = "CDEFGAB";
const natural = [0, 2, 4, 5, 7, 9, 11];
const mod = (number, divisor = 12) => ((number % divisor) + divisor) % divisor;
const MAX_FRET = 24;

function spelling(root, semitones, degree) {
  const start = letters.indexOf(roots[root][0]);
  const letter = (start + degree - 1) % 7;
  const offset = mod(root + semitones - natural[letter] + 6) - 6;
  return letters[letter] + (offset < 0 ? "♭".repeat(-offset) : "♯".repeat(offset));
}

function definition(label, suffix, intervals, degrees, formula) {
  return { label, suffix, intervals, degrees, formula };
}
const major = definition("大调", "", [0, 2, 4, 5, 7, 9, 11], [1, 2, 3, 4, 5, 6, 7], "1  2  3  4  5  6  7");
const minor = definition("自然小调", "", [0, 2, 3, 5, 7, 8, 10], [1, 2, 3, 4, 5, 6, 7], "1  2  ♭3  4  5  ♭6  ♭7");
const scales = {
  minorPent: definition("小调五声音阶", "", [0, 3, 5, 7, 10], [1, 3, 4, 5, 7], "1  ♭3  4  5  ♭7"),
  majorPent: definition("大调五声音阶", "", [0, 2, 4, 7, 9], [1, 2, 3, 5, 6], "1  2  3  5  6"),
  blues: definition("小调布鲁斯", "", [0, 3, 5, 6, 7, 10], [1, 3, 4, 5, 5, 7], "1  ♭3  4  ♭5  5  ♭7"),
  major, minor,
  dorian: definition("多利亚", "", [0, 2, 3, 5, 7, 9, 10], [1, 2, 3, 4, 5, 6, 7], "1  2  ♭3  4  5  6  ♭7"),
  phrygian: definition("弗里吉亚", "", [0, 1, 3, 5, 7, 8, 10], [1, 2, 3, 4, 5, 6, 7], "1  ♭2  ♭3  4  5  ♭6  ♭7"),
  lydian: definition("利底亚", "", [0, 2, 4, 6, 7, 9, 11], [1, 2, 3, 4, 5, 6, 7], "1  2  3  ♯4  5  6  7"),
  mixolydian: definition("混合利底亚", "", [0, 2, 4, 5, 7, 9, 10], [1, 2, 3, 4, 5, 6, 7], "1  2  3  4  5  6  ♭7"),
  locrian: definition("洛克里亚", "", [0, 1, 3, 5, 6, 8, 10], [1, 2, 3, 4, 5, 6, 7], "1  ♭2  ♭3  4  ♭5  ♭6  ♭7"),
  harmonic: definition("和声小调", "", [0, 2, 3, 5, 7, 8, 11], [1, 2, 3, 4, 5, 6, 7], "1  2  ♭3  4  5  ♭6  7"),
  melodic: definition("旋律小调（上行）", "", [0, 2, 3, 5, 7, 9, 11], [1, 2, 3, 4, 5, 6, 7], "1  2  ♭3  4  5  6  7")
};
const qualities = {
  major: definition("大三和弦", "", [0, 4, 7], [1, 3, 5], "1  3  5"),
  minor: definition("小三和弦", "m", [0, 3, 7], [1, 3, 5], "1  ♭3  5"),
  power: definition("强力和弦", "5", [0, 7], [1, 5], "1  5"),
  dom7: definition("属七和弦", "7", [0, 4, 7, 10], [1, 3, 5, 7], "1  3  5  ♭7"),
  maj7: definition("大七和弦", "maj7", [0, 4, 7, 11], [1, 3, 5, 7], "1  3  5  7"),
  min7: definition("小七和弦", "m7", [0, 3, 7, 10], [1, 3, 5, 7], "1  ♭3  5  ♭7"),
  sus2: definition("挂二和弦", "sus2", [0, 2, 7], [1, 2, 5], "1  2  5"),
  sus4: definition("挂四和弦", "sus4", [0, 5, 7], [1, 4, 5], "1  4  5"),
  dim: definition("减三和弦", "dim", [0, 3, 6], [1, 3, 5], "1  ♭3  ♭5"),
  aug: definition("增三和弦", "aug", [0, 4, 8], [1, 3, 5], "1  3  ♯5"),
  halfDim: definition("半减七和弦", "m7♭5", [0, 3, 6, 10], [1, 3, 5, 7], "1  ♭3  ♭5  ♭7"),
  dim7: definition("减七和弦", "dim7", [0, 3, 6, 9], [1, 3, 5, 7], "1  ♭3  ♭5  ♭♭7")
};

function scalePositions(root, type) {
  const scale = type === "blues" ? scales.minorPent : scales[type];
  const count = scale.intervals.length;
  const perString = count === 5 ? 2 : 3;
  const positions = [];
  scale.intervals.forEach((interval, index) => {
    const first = mod(root + interval - tuning[0]);
    for (let start = first - 12; start <= MAX_FRET; start += 12) {
      const notes = tuning.map((open, string) => {
        const row = Array.from({ length: perString }, (_, step) => {
          const degree = index + string * perString + step;
          return tuning[0] + start + Math.floor(degree / count) * 12 + scale.intervals[degree % count] - interval - open;
        });
        if (type === "blues") {
          const [low, high] = row;
          const blue = low + mod(root + 6 - open - low);
          if (blue > low && blue < high) row.splice(1, 0, blue);
        }
        return row;
      });
      const min = Math.min(...notes.flat());
      const max = Math.max(...notes.flat());
      if (min >= 0 && max <= MAX_FRET) positions.push({ number: index + 1, notes, min, max });
    }
  });
  return positions.sort((a, b) => a.min - b.min || a.number - b.number);
}

const openVoicings = [
  [0,"major", [null,3,2,0,1,0], [0,3,2,0,1,0]],
  [2,"major", [null,null,0,2,3,2], [0,0,0,1,3,2]],
  [4,"major", [0,2,2,1,0,0], [0,2,3,1,0,0]],
  [7,"major", [3,2,0,0,0,3], [2,1,0,0,0,3]],
  [9,"major", [null,0,2,2,2,0], [0,0,1,2,3,0]],
  [2,"minor", [null,null,0,2,3,1], [0,0,0,2,3,1]],
  [4,"minor", [0,2,2,0,0,0], [0,2,3,0,0,0]],
  [9,"minor", [null,0,2,2,1,0], [0,0,2,3,1,0]],
  [4,"power", [0,2,2,null,null,null], [0,1,3,0,0,0]],
  [9,"power", [null,0,2,2,null,null], [0,0,1,3,0,0]],
  // This common open C7 omits the perfect fifth.
  [0,"dom7", [null,3,2,3,1,0], [0,3,2,4,1,0]],
  [2,"dom7", [null,null,0,2,1,2], [0,0,0,2,1,3]],
  [4,"dom7", [0,2,0,1,0,0], [0,2,0,1,0,0]],
  [7,"dom7", [3,2,0,0,0,1], [3,2,0,0,0,1]],
  [9,"dom7", [null,0,2,0,2,0], [0,0,1,0,2,0]],
  [0,"maj7", [null,3,2,0,0,0], [0,3,2,0,0,0]],
  [9,"min7", [null,0,2,0,1,0], [0,0,2,0,1,0]],
  [4,"min7", [0,2,0,0,0,0], [0,2,0,0,0,0]],
  [9,"sus2", [null,0,2,2,0,0], [0,0,1,2,0,0]],
  [2,"sus4", [null,null,0,2,3,3], [0,0,0,1,2,3]]
];

// Each movable shape starts at the root fret of the named bass string.
const movable = {
  major: [[0,[0,2,2,1,0,0],[1,3,4,2,1,1]], [1,[null,0,2,2,2,0],[0,1,2,3,4,1]], [2,[null,null,0,2,3,2],[0,0,1,2,4,3]]],
  minor: [[0,[0,2,2,0,0,0],[1,3,4,1,1,1]], [1,[null,0,2,2,1,0],[0,1,3,4,2,1]], [2,[null,null,0,2,3,1],[0,0,1,3,4,2]]],
  power: [[0,[0,2,2,null,null,null],[1,3,4,0,0,0]], [1,[null,0,2,2,null,null],[0,1,3,4,0,0]], [2,[null,null,0,2,3,null],[0,0,1,3,4,0]]],
  dom7: [[0,[0,2,0,1,0,0],[1,3,1,2,1,1]], [1,[null,0,2,0,2,0],[0,1,3,1,4,1]], [2,[null,null,0,2,1,2],[0,0,1,3,2,4]]],
  maj7: [[0,[0,null,1,1,0,null],[1,0,3,4,2,0]], [1,[null,0,2,1,2,0],[0,1,3,2,4,1]], [2,[null,null,0,2,2,2],[0,0,1,3,3,3]]],
  min7: [[0,[0,2,0,0,0,0],[1,3,1,1,1,1]], [1,[null,0,2,0,1,0],[0,1,3,1,2,1]], [2,[null,null,0,2,1,1],[0,0,1,3,2,2]]],
  sus2: [[1,[null,0,2,2,0,0],[0,1,3,4,1,1]], [2,[null,null,0,2,3,0],[0,0,1,3,4,1]]],
  sus4: [[0,[0,2,2,2,0,0],[1,2,3,4,1,1]], [1,[null,0,2,2,3,0],[0,1,2,3,4,1]], [2,[null,null,0,2,3,3],[0,0,1,2,3,4]]],
  dim: [[0,[0,1,2,0,null,null],[1,2,3,1,0,0]], [1,[null,0,1,2,1,null],[0,1,2,4,3,0]]],
  aug: [[0,[0,3,2,1,null,null],[1,4,3,2,0,0]], [1,[null,0,3,2,2,null],[0,1,4,2,3,0]], [2,[null,null,0,3,3,2],[0,0,1,3,4,2]]],
  halfDim: [[0,[0,null,0,0,-1,null],[2,0,3,4,1,0]], [1,[null,0,1,0,1,null],[0,1,3,2,4,0]], [2,[null,null,0,1,1,1],[0,0,1,3,3,3]]],
  dim7: [[0,[0,null,-1,0,-1,null],[2,0,1,3,1,0]], [1,[null,0,1,-1,1,null],[0,2,3,1,4,0]], [2,[null,null,0,1,0,1],[0,0,1,3,2,4]]]
};

function chordVoicings(root, quality) {
  const result = openVoicings.filter(([note, type]) => note === root && type === quality)
    .map(([, , frets, fingers]) => ({ frets, fingers, label: "开放指法" }));
  for (const [bass, offsets, fingers] of movable[quality]) {
    for (let fret = mod(root - tuning[bass]); fret <= MAX_FRET; fret += 12) {
      const frets = offsets.map((offset) => offset === null ? null : fret + offset);
      if (frets.some((value) => value !== null && (value < 0 || value > MAX_FRET))) continue;
      if (result.some((shape) => shape.frets.join(",") === frets.join(","))) continue;
      result.push({
        frets, fingers, label: fret === 0 ? (6 - bass) + " 弦根音 · 开放" : (6 - bass) + " 弦根音 · " + fret + " 品"
      });
    }
  }
  return result;
}

function chordLabel(root, quality) {
  return roots[root] + qualities[quality].suffix;
}

const keyHarmony = {
  major: ["major", "minor", "minor", "major", "major", "minor", "dim"],
  minor: ["minor", "dim", "major", "minor", "minor", "major", "major"]
};

const MAX_MEASURES = 32;
const inputQualities = new Map(Object.entries(qualities).map(([type, chord]) => [
  chord.suffix.replaceAll("♭", "b"), type
]));
for (const [suffix, type] of Object.entries({
  maj: "major", min: "minor", min7: "min7", dom7: "dom7", sus: "sus4", "°": "dim", "°7": "dim7", "+": "aug"
})) inputQualities.set(suffix, type);

function parseChordQuality(suffix) {
  if (suffix === "M") return "major";
  if (suffix === "M7") return "maj7";
  return inputQualities.get(suffix.toLowerCase().replaceAll("♭", "b"));
}

function parseNoteRoot(text) {
  const match = /^([A-Ga-g])([#♯]{1,2}|[b♭]{1,2})?$/.exec(text);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = (match[2] || "").replaceAll("#", "♯").replaceAll("b", "♭");
  const offset = accidental.startsWith("♭") ? -accidental.length : accidental.length;
  return { tonic: mod(natural[letters.indexOf(letter)] + offset), note: letter + accidental };
}

function parseProgression(input, tonic, mode) {
  const normalized = input.normalize("NFKC").trim();
  const tokens = normalized.split(/[\s,、;|→–—−-]+/).filter(Boolean)
    .flatMap((token) => /^[1-7]+$/.test(token) ? [...token] : [token]);
  if (!tokens.length) throw new Error("请输入和弦，例如 C G Am F，或输入级数 1645。");
  if (tokens.length > MAX_MEASURES) throw new Error("最多可以排 " + MAX_MEASURES + " 小节。");

  let relative = true;
  const measures = tokens.map((token) => {
    const degree = /^([1-7])(?:\(([^()]+)\)|([^()]*))$/.exec(token);
    if (degree) {
      const index = Number(degree[1]) - 1;
      const suffix = degree[2] ?? degree[3];
      const type = suffix ? parseChordQuality(suffix) : keyHarmony[mode][index];
      if (type) {
        const interval = scales[mode].intervals[index];
        return { tonic: mod(tonic + interval), type, index: 0, note: spelling(tonic, interval, index + 1) };
      }
    } else {
      const chord = /^([A-Ga-g](?:[#♯]{1,2}|[b♭]{1,2})?)(.*)$/.exec(token);
      if (chord) {
        const type = parseChordQuality(chord[2]);
        if (type) {
          relative = false;
          return { ...parseNoteRoot(chord[1]), type, index: 0 };
        }
      }
    }
    throw new Error("识别不了「" + token + "」。试试 Am7、Bbmaj7、1645 或 5(7)。");
  });
  if (!relative && tokens.some((token) => /^[1-7]/.test(token))) {
    throw new Error("请在同一组里使用和弦名，或统一使用级数。");
  }
  return { measures, relative };
}
