"use strict";

const $ = (id) => document.getElementById(id);
const rootOptions = roots.map((name, index) => [index, name]);
const qualityOptions = Object.entries(qualities).map(([type, value]) => [type, tr(value.label, value.labelEn)]);
const mobile = matchMedia("(max-width: 600px)");
let mode = "scale";
let root = 0;
let scaleType = "major";
let chordRoot = 0;
let chordNote = roots[chordRoot];
let quality = "major";
let shapeIndex = 0;
let positions = [];
let activePosition;
let focusFret = null;
let selected;
const heldFretNotes = new Map();
let scalePlayback = null;
let scalePlayRequest = 0;
const rootLabel = (midi) => roots[mod(midi)] + (Math.floor(midi / 12) - 1);

function options(select, items, current) {
  select.replaceChildren(...items.map(([value, text]) => new Option(text, value)));
  select.value = current;
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $("toast").hidden = true; }, 2500);
}

let audio;
let guitarWave;
async function unlockAudio() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audio ||= new Audio();
    if (audio.state !== "running") await audio.resume();
    guitarWave ||= audio.createPeriodicWave(new Float32Array(8), Float32Array.from([0, 1, .48, .27, .19, .08, .06, .03]));
    return audio.state === "running";
  } catch {
    toast(tr("此浏览器暂时无法播放示范音。", "Audio playback is unavailable in this browser."));
    return false;
  }
}

function pluck(midi, start, volume, destination = audio.destination) {
  const oscillator = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  oscillator.setPeriodicWave(guitarWave);
  oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3300, start);
  filter.frequency.exponentialRampToValueAtTime(850, start + .55);
  gain.gain.setValueAtTime(.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .009);
  gain.gain.exponentialRampToValueAtTime(.001, start + .83);
  oscillator.connect(filter).connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + .86);
}

function strum(shape, start, volume, destination) {
  shape.frets.forEach((fret, string) => {
    if (fret !== null) pluck(tuning[string] + fret, start + string * .028, volume, destination);
  });
}

function renderTones(target, tonic, info, note) {
  target.replaceChildren(...info.intervals.map((interval, index) => {
    const label = document.createElement("span");
    label.textContent = spelling(tonic, interval, info.degrees[index], note);
    return label;
  }));
}

const shapeList = () => chordVoicings(chordRoot, quality);
const activeShape = () => shapeList()[shapeIndex];
const selectedChordLabel = () => chordLabel(chordRoot, quality, chordNote);
const chordRootOptions = () => rootOptions.map(([index, name]) => [index, index === chordRoot ? chordNote : name]);
const shapeBounds = (shape) => {
  const frets = shape.frets.filter((fret) => fret !== null);
  return [Math.min(...frets), Math.max(...frets)];
};

function focusRange(min) {
  focusFret = Math.max(0, min - 1);
}

function fretButton(string, fret, info, tonic, shape) {
  const midi = tuning[string] + fret;
  const interval = mod(midi - tonic);
  const degreeIndex = info?.intervals.indexOf(interval) ?? -1;
  const isTone = degreeIndex >= 0;
  const inPosition = mode === "chord" ? shape.frets[string] === fret
    : !activePosition || activePosition.notes[string].includes(fret);
  const note = isTone ? spelling(tonic, interval, info.degrees[degreeIndex], mode === "chord" ? chordNote : undefined) : roots[mod(midi)];
  const label = isTone && $("note-label").value === "degrees" ? info.formula.split(/ +/)[degreeIndex] : note;
  const positionZh = (6 - string) + " 弦 · " + fret + " 品";
  const positionEn = "String " + (6 - string) + " · Fret " + fret;
  const positionLabel = tr(positionZh, positionEn);
  const positionKey = string + ":" + fret;
  const pitch = note + (Math.floor(midi / 12) - 1);
  const cell = document.createElement("button");
  cell.className = "fret";
  cell.dataset.midi = midi;
  cell.dataset.string = 6 - string;
  cell.dataset.fret = fret;
  cell.dataset.pitch = pitch;
  if (fret % 2) cell.classList.add("alt");
  if (fret === 0) cell.classList.add("open");
  if (info) cell.classList.add(isTone ? (inPosition ? (interval === 0 ? "root" : "tone") : "ghost") : "dim");
  cell.classList.toggle("selected", selected === positionKey);
  cell.style.setProperty("--gauge", (1 + (5 - string) * .21) + "px");
  cell.setAttribute("aria-label", tr(positionZh + " · " + pitch, positionEn + " · " + pitch));
  const badge = document.createElement("span");
  badge.textContent = label;
  cell.append(badge);
  async function sound() {
    if (await unlockAudio()) pluck(midi, audio.currentTime + .01, .15);
  }
  function showHeldNotes() {
    const entries = [...heldFretNotes.values()];
    $("note-readout").textContent = tr(
      entries.map((entry) => entry.pitch + " / " + entry.positionZh).join(" ＋ ") || pitch + " / " + positionZh,
      entries.map((entry) => entry.pitch + " / " + entry.positionEn).join(" ＋ ") || pitch + " / " + positionEn
    );
  }
  cell.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || heldFretNotes.has(event.pointerId)) return;
    if (event.pointerType === "mouse") event.preventDefault();
    heldFretNotes.set(event.pointerId, { cell, pitch, position: positionLabel, positionZh, positionEn });
    cell.setPointerCapture(event.pointerId);
    cell.classList.add("held");
    showHeldNotes();
    void sound();
  });
  function release(event) {
    if (!heldFretNotes.has(event.pointerId)) return;
    heldFretNotes.delete(event.pointerId);
    if (![...heldFretNotes.values()].some((entry) => entry.cell === cell)) cell.classList.remove("held");
    if (cell.hasPointerCapture(event.pointerId)) cell.releasePointerCapture(event.pointerId);
    showHeldNotes();
  }
  cell.addEventListener("pointerup", release);
  cell.addEventListener("pointercancel", release);
  cell.addEventListener("lostpointercapture", release);
  cell.addEventListener("click", (event) => {
    if (event.detail !== 0) return;
    selected = positionKey;
    $("fretboard").querySelector(".selected")?.classList.remove("selected");
    cell.classList.add("selected");
    $("note-readout").textContent = tr(pitch + "  /  " + positionZh, pitch + "  /  " + positionEn);
    void sound();
  });
  return cell;
}

function renderBoard() {
  stopScalePlayback();
  heldFretNotes.clear();
  const first = 0, last = MAX_FRET;
  const info = mode === "scale" ? scales[scaleType] : mode === "chord" ? qualities[quality] : null;
  const tonic = mode === "chord" ? chordRoot : root;
  const shape = mode === "chord" ? activeShape() : null;
  const board = $("fretboard");
  board.style.setProperty("--fret-count", last - first + 1);
  board.style.setProperty("--fret-width", mobile.matches ? "38px" : "34px");
  board.style.minWidth = (31 + (last + 1) * (mobile.matches ? 38 : 34)) + "px";
  const cells = [document.createElement("span")];
  for (let fret = first; fret <= last; fret++) {
    const number = document.createElement("span");
    number.className = "fret-number";
    if ([3,5,7,9,12,15,17,19,21,24].includes(fret)) number.classList.add("marked");
    number.textContent = fret;
    cells.push(number);
  }
  for (let string = 5; string >= 0; string--) {
    const label = document.createElement("span");
    label.className = "string-label";
    label.textContent = (6 - string) + roots[mod(tuning[string])];
    cells.push(label);
    for (let fret = first; fret <= last; fret++) cells.push(fretButton(string, fret, info, tonic, shape));
  }
  board.replaceChildren(...cells);
  $("board-summary").hidden = !info;
  $("legend").hidden = !info;
  if (info) {
    $("board-name").textContent = mode === "scale" ? tr(roots[root] + " " + info.label, roots[root] + " " + info.labelEn)
      : tr(selectedChordLabel() + " · " + shape.label, selectedChordLabel() + " · " + shape.labelEn);
    $("board-formula").textContent = info.formula;
    renderTones($("board-tones"), tonic, info, mode === "chord" ? chordNote : undefined);
  }
  $("board-hint").textContent = mode === "scale" ? (scaleType === "blues"
    ? tr("布鲁斯音阶沿用五个小调五声把位，在指型内加入降五级。全指板显示每个降五级位置。", "The blues scale uses five minor pentatonic positions with an added flat fifth. All flat-fifth positions are shown across the neck.")
    : scales[scaleType].intervals.length === 5 ? tr("五个两音一弦把位。把位编号从 6 弦根音开始，同一个把位每 12 品重复。", "Five positions with two notes per string. Positions are numbered from the root on string 6 and repeat every 12 frets.")
    : tr("七个三音一弦把位。把位编号从 6 弦根音开始，同一个把位每 12 品重复。", "Seven positions with three notes per string. Positions are numbered from the root on string 6 and repeat every 12 frets."))
    : mode === "chord" ? tr("实心亮点是当前指法要弹的位置，描边亮点是指板上的其他和弦音。", "Solid highlights show the selected voicing. Outlined highlights show other chord tones across the neck.")
      : tr("0 品是空弦。往琴桥每移动一品，音高升一个半音。", "Fret 0 is the open string. Each fret toward the bridge raises the pitch by one semitone.");
  if (focusFret !== null) {
    const fretWidth = (board.getBoundingClientRect().width - 31) / (last + 1);
    board.parentElement.scrollLeft = focusFret * fretWidth;
    focusFret = null;
  }
}

function positionOptions(reset = false) {
  if (mode === "scale") {
    positions = scalePositions(root, scaleType);
    const current = !reset && activePosition ? positions.findIndex((item) => item.number === activePosition.number && item.min === activePosition.min) : -1;
    activePosition = positions[current];
    options($("position"), [["all", tr("所有把位", "All positions")], ...positions.map((item, index) => [
      index, tr("把位 " + item.number + " · " + item.min + "–" + item.max + " 品", "Position " + item.number + " · Frets " + item.min + "–" + item.max)
    ])], current < 0 ? "all" : current);
  } else if (mode === "chord") {
    options($("position"), shapeList().map((shape, index) => [index, tr(shape.label, shape.labelEn)]), shapeIndex);
  }
}

function setMode(next) {
  mode = next;
  document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  $("root-control").hidden = mode === "all";
  options($("root"), mode === "chord" ? chordRootOptions() : rootOptions, mode === "chord" ? chordRoot : root);
  $("scale-control").hidden = mode !== "scale";
  $("board-quality-control").hidden = mode !== "chord";
  $("board-quality").value = quality;
  $("position-control").hidden = mode === "all";
  $("label-control").hidden = mode === "all";
  $("play-scale").hidden = mode !== "scale";
  positionOptions();
  if (mode === "chord") focusRange(...shapeBounds(activeShape()));
  if (mode === "scale" && activePosition) focusRange(activePosition.min, activePosition.max);
  renderBoard();
}

function chooseChord(tonic, type, index = 0, note = tonic === chordRoot ? chordNote : roots[tonic]) {
  chordRoot = tonic;
  chordNote = note;
  quality = type;
  shapeIndex = index;
  options($("chord-root"), chordRootOptions(), chordRoot);
  $("quality").value = quality;
  renderChords();
  setInputStatus("chord", "");
  if (mode === "chord") setMode("chord");
}

document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
$("root").addEventListener("change", (event) => {
  const tonic = Number(event.target.value);
  if (mode === "chord") return chooseChord(tonic, quality);
  root = tonic;
  positionOptions(true);
  renderBoard();
});
$("scale").addEventListener("change", (event) => {
  scaleType = event.target.value;
  positionOptions(true);
  renderBoard();
});
$("board-quality").addEventListener("change", (event) => chooseChord(chordRoot, event.target.value));
$("position").addEventListener("change", (event) => {
  if (mode === "chord") return chooseChord(chordRoot, quality, Number(event.target.value));
  activePosition = positions[event.target.value];
  if (activePosition) focusRange(activePosition.min, activePosition.max);
  renderBoard();
});
$("note-label").addEventListener("change", renderBoard);
mobile.addEventListener("change", renderBoard);
function stopScalePlayback() {
  scalePlayRequest++;
  if (scalePlayback) {
    cancelAnimationFrame(scalePlayback.frame);
    scalePlayback.cell?.classList.remove("playing");
    scalePlayback.bus.disconnect();
    scalePlayback = null;
  }
  $("play-scale").textContent = tr("▷ 试听音阶", "▷ Play scale");
  $("play-scale").setAttribute("aria-pressed", "false");
}

function scalePlaybackSteps(notes) {
  const cells = [...$("fretboard").querySelectorAll(".fret")];
  let previous;
  return notes.map((midi) => {
    const candidates = cells.filter((cell) => Number(cell.dataset.midi) === midi && (!activePosition || !cell.classList.contains("ghost")));
    // One playable path, staying in the selected position and near the previous string.
    candidates.sort((a, b) => {
      const cost = (cell) => Number(cell.dataset.fret) + (previous ? Math.abs(Number(cell.dataset.string) - Number(previous.dataset.string)) * 2 : 0);
      return cost(a) - cost(b);
    });
    const cell = candidates[0];
    if (cell) previous = cell;
    return { midi, cell };
  });
}

function highlightScaleStep(playback, step) {
  playback.cell?.classList.remove("playing");
  playback.cell = step.cell;
  if (!step.cell) return;
  const cell = step.cell;
  cell.classList.add("playing");
  $("note-readout").textContent = tr(cell.dataset.pitch + " / " + cell.dataset.string + " 弦 · " + cell.dataset.fret + " 品",
    cell.dataset.pitch + " / String " + cell.dataset.string + " · Fret " + cell.dataset.fret);
  const viewport = $("fretboard").parentElement;
  const bounds = cell.getBoundingClientRect(), frame = viewport.getBoundingClientRect();
  // Scroll only the fretboard horizontally; keep the page at the user's reading position.
  if (bounds.left < frame.left + 34) viewport.scrollLeft -= frame.left + 34 - bounds.left;
  else if (bounds.right > frame.right - 4) viewport.scrollLeft += bounds.right - frame.right + 4;
}

$("play-scale").addEventListener("click", async () => {
  if (scalePlayback) { stopScalePlayback(); return; }
  const request = ++scalePlayRequest;
  const first = tuning[0] + mod(root - tuning[0]);
  const notes = activePosition
    ? [...new Set(activePosition.notes.flatMap((frets, string) => frets.map((fret) => fret + tuning[string])))].sort((a,b) => a-b)
    : [...scales[scaleType].intervals, 12].map((interval) => first + interval);
  if (!await unlockAudio() || request !== scalePlayRequest) return;
  const start = audio.currentTime + .02;
  const bus = audio.createGain();
  bus.connect(audio.destination);
  const steps = scalePlaybackSteps(notes);
  const playback = scalePlayback = { bus, steps, index: -1, cell: null, frame: null };
  $("play-scale").textContent = tr("■ 停止试听", "■ Stop scale");
  $("play-scale").setAttribute("aria-pressed", "true");
  steps.forEach((step, index) => pluck(step.midi, start + .16 * index, .16, bus));
  playback.index = 0;
  highlightScaleStep(playback, steps[0]);
  function followAudio() {
    if (scalePlayback !== playback) return;
    const elapsed = audio.currentTime - start;
    if (elapsed >= (steps.length - 1) * .16 + .86) { stopScalePlayback(); return; }
    const index = Math.min(steps.length - 1, Math.floor(elapsed / .16));
    if (index >= 0 && index !== playback.index) {
      playback.index = index;
      highlightScaleStep(playback, steps[index]);
    }
    playback.frame = requestAnimationFrame(followAudio);
  }
  playback.frame = requestAnimationFrame(followAudio);
});

function renderKey() {
  const tonic = Number($("key-root").value);
  const type = $("key-mode").value;
  const romans = ["I","II","III","IV","V","VI","VII"];
  const buttons = scales[type].intervals.map((interval, index) => {
    const note = mod(tonic + interval);
    const chordType = keyHarmony[type][index];
    const name = spelling(tonic, interval, index + 1) + qualities[chordType].suffix;
    const numeral = chordType === "major" ? romans[index] : romans[index].toLowerCase() + (chordType === "dim" ? "°" : "");
    const button = document.createElement("button");
    button.className = "secondary";
    button.innerHTML = "<small>" + numeral + "</small>" + name;
    button.setAttribute("aria-label", tr(name + " · 查看和弦指法", name + " · View chord voicings"));
    button.addEventListener("click", () => {
      chooseChord(note, chordType);
      window.location.hash = "chords";
    });
    return button;
  });
  $("key-chords").replaceChildren(...buttons);
}
$("key-root").addEventListener("change", renderKey);
$("key-mode").addEventListener("change", renderKey);

function diagram(shape) {
  const fretted = shape.frets.filter((fret) => fret > 0);
  const start = Math.max(1, Math.min(...fretted));
  const first = Math.max(...fretted) <= 4 ? 1 : start;
  const x = (index) => 28 + 17 * index;
  const y = (fret) => 31 + 19 * (fret - first);
  const rows = Array.from({ length: 5 }, (_, index) => {
    const row = 21.5 + 19 * index;
    const nut = index === 0 && first === 1;
    return '<path d="M28 ' + row + 'H113" stroke="' + (nut ? "#f2e8f6" : "#786b88") + '" stroke-width="' + (nut ? 3 : 1) + '"/>';
  });
  const strings = shape.frets.map((fret, index) => '<path d="M' + x(index) + ' 22v76" stroke="#aca0bb" stroke-width="' + (1.5 - index * .13) + '"/>');
  const barres = [];
  for (let finger = 1; finger <= 4; finger++) {
    const indexes = shape.fingers.flatMap((assigned, index) => assigned === finger && shape.frets[index] > 0 ? [index] : []);
    if (indexes.length < 2) continue;
    const left = indexes[0];
    const right = indexes.at(-1);
    if (!indexes.every((index) => shape.frets[index] === shape.frets[left])) continue;
    const line = y(shape.frets[left]);
    barres.push('<path d="M' + x(left) + ' ' + line + 'H' + x(right) + '" stroke="#bba5f7" stroke-width="6" stroke-linecap="round"/>');
  }
  const marks = shape.frets.map((fret, index) => {
    const center = x(index);
    if (fret === null || fret === 0) return '<text x="' + center + '" y="16" fill="' + (fret === 0 ? "#d8fb7c" : "#c6b6db") + '">' + (fret === 0 ? "○" : "×") + '</text>';
    return '<circle cx="' + center + '" cy="' + y(fret) + '" r="7" fill="' + fingerColors[shape.fingers[index]] + '"/><text x="' + center + '" y="' + (y(fret) + 3.2) + '" fill="#20251b" font-size="9" font-weight="700">' + shape.fingers[index] + '</text>';
  });
  const labels = shape.frets.map((_, index) => '<text x="' + x(index) + '" y="110" fill="#c0b4cf" font-size="9">' + (6 - index) + '</text>');
  return '<svg viewBox="0 0 128 114" aria-hidden="true" text-anchor="middle" font-family="monospace">' + rows.join("") + strings.join("") + barres.join("") + marks.join("") + labels.join("") + '<text x="13" y="34" fill="#bca9fb" font-size="9">' + tr(first + '品', first + 'fr') + '</text></svg>';
}

function renderChords() {
  $("chord-name").textContent = tr(selectedChordLabel() + " · " + qualities[quality].label, selectedChordLabel() + " · " + qualities[quality].labelEn);
  renderTones($("chord-tones"), chordRoot, qualities[quality], chordNote);
  renderChordNeck();
  const buttons = shapeList().map((shape, index) => {
    const button = document.createElement("button");
    button.className = "shape-card";
    button.setAttribute("aria-pressed", String(index === shapeIndex));
    const frets = shape.frets.map((fret, string) => (6 - string) + " 弦 " + (fret === null ? "不弹" : fret === 0 ? "空弦" : fret + " 品"));
    const fretsEn = shape.frets.map((fret, string) => "String " + (6 - string) + ": " + (fret === null ? "Muted" : fret === 0 ? "Open" : "Fret " + fret));
    button.setAttribute("aria-label", tr(shape.label + "，" + frets.join("，"), shape.labelEn + ", " + fretsEn.join(", ")));
    button.innerHTML = diagram(shape) + "<strong>" + tr(shape.label, shape.labelEn) + "</strong>";
    button.addEventListener("click", () => {
      shapeIndex = index;
      for (const [i, sibling] of [...$("chord-shapes").children].entries()) sibling.setAttribute("aria-pressed", String(i === shapeIndex));
      renderChordNeck();
      if (mode === "chord") setMode("chord");
    });
    return button;
  });
  $("chord-shapes").replaceChildren(...buttons);
}

function renderChordNeck() {
  $("neck-chord-label").textContent = selectedChordLabel();
  renderNeck($("chord-neck"), { tonic: chordRoot, type: quality, index: shapeIndex, note: chordNote });
}

function bindNeckPlucking(container, getMeasure) {
  let pointer, previous, lastString, ready, nextAudioTime = 0, generation = 0, direction = 0;
  function reset() {
    generation++;
    pointer = undefined;
    previous = undefined;
    lastString = undefined;
    direction = 0;
    container.classList.remove("is-picking");
    container.querySelector(".neck-pick")?.setAttribute("visibility", "hidden");
  }
  neckInteractions.set(container, reset);
  function canPlay() {
    return getMeasure() && !(container.id === "practice-neck" && running);
  }
  async function playString(string, audioReady) {
    const measure = getMeasure();
    if (!measure || !canPlay()) return;
    const shape = chordVoicings(measure.tonic, measure.type)[measure.index];
    if (shape.frets[string] === null) return;
    const currentGeneration = generation;
    if (!await audioReady || currentGeneration !== generation) return;
    nextAudioTime = Math.max(audio.currentTime + .01, nextAudioTime);
    pluck(tuning[string] + shape.frets[string], nextAudioTime, .2);
    pulseNeck(container, string, (nextAudioTime - audio.currentTime) * 1000);
    nextAudioTime += .018;
  }
  function position(event) {
    const svg = container.querySelector("svg");
    const matrix = svg?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  }
  function movePick(point) {
    const inside = point && point.x >= 34 && point.x <= 272 && point.y >= 62 && point.y <= 372;
    const pick = container.querySelector(".neck-pick");
    pick?.setAttribute("visibility", inside ? "visible" : "hidden");
    if (inside) pick?.setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
    container.classList.toggle("is-picking", Boolean(inside));
  }
  function hitString(string) {
    if (string === lastString) return;
    lastString = string;
    void playString(string, ready);
  }
  container.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || pointer !== undefined || !canPlay()) return;
    const point = position(event);
    if (!point || point.x < 34 || point.x > 272 || point.y < 62 || point.y > 372) return;
    pointer = event.pointerId;
    previous = point;
    lastString = undefined;
    direction = 0;
    nextAudioTime = 0;
    ready = unlockAudio();
    container.setPointerCapture(pointer);
    movePick(point);
    const string = Math.round((point.x - 60) / 37);
    if (string >= 0 && string < 6 && Math.abs(point.x - (60 + string * 37)) <= 18.5) hitString(string);
  });
  container.addEventListener("pointermove", (event) => {
    if (pointer === undefined && event.pointerType === "touch") return;
    if (!canPlay()) return reset();
    if (pointer !== undefined && event.pointerId !== pointer) return;
    const point = position(event);
    movePick(point);
    if (pointer === undefined || !point) return;
    const nextDirection = Math.sign(point.x - previous.x);
    if (direction && nextDirection && direction !== nextDirection) lastString = undefined;
    if (nextDirection) direction = nextDirection;
    for (const string of crossedNeckStrings(previous, point)) hitString(string);
    previous = point;
  });
  function release(event) {
    if (event.pointerId !== pointer) return;
    if (container.hasPointerCapture(pointer)) container.releasePointerCapture(pointer);
    pointer = undefined;
    previous = undefined;
    movePick(null);
  }
  container.addEventListener("pointerup", release);
  container.addEventListener("lostpointercapture", release);
  container.addEventListener("pointercancel", () => reset());
  container.addEventListener("pointerleave", () => { if (pointer === undefined) movePick(null); });
  container.addEventListener("keydown", (event) => {
    const hit = event.target.closest("[data-pluck]");
    if (!hit || !container.contains(hit) || !["Enter", " "].includes(event.key) || event.repeat || !canPlay()) return;
    event.preventDefault();
    nextAudioTime = 0;
    void playString(Number(hit.dataset.pluck), unlockAudio());
  });
}
$("chord-search").addEventListener("submit", (event) => {
  event.preventDefault();
  const chord = parseChordName($("chord-input").value);
  if (!chord) {
    setInputStatus("chord", tr("请输入图鉴支持的单个和弦名，例如 C、C#m7 或 Bbmaj7。", "Enter one supported chord name, such as C, C#m7, or Bbmaj7."), true);
    return;
  }
  chooseChord(chord.tonic, chord.type, 0, chord.note);
  setInputStatus("chord", tr("已找到 " + selectedChordLabel() + " 的 " + shapeList().length + " 套指法。", "Found " + shapeList().length + " voicings for " + selectedChordLabel() + "."));
});
$("chord-input").addEventListener("input", () => setInputStatus("chord", ""));
$("chord-root").addEventListener("change", (event) => chooseChord(Number(event.target.value), quality));
$("quality").addEventListener("change", (event) => chooseChord(chordRoot, event.target.value));
$("play-chord").addEventListener("click", async () => {
  const shape = activeShape();
  if (await unlockAudio()) {
    strum(shape, audio.currentTime + .02, .12);
    animateStrum($("chord-neck"), shape, 20);
  }
});
$("show-chord").addEventListener("click", () => setMode("chord"));
$("add-chord").addEventListener("click", () => addMeasure(chordRoot, quality, shapeIndex, chordNote));

const presets = {
  canon: "15634145",
  dooWop: "1645",
  pop: "1564",
  jazz: "2m7 5(7) 1maj7",
  blues: "1(7) 1(7) 1(7) 1(7) 4(7) 4(7) 1(7) 1(7) 5(7) 4(7) 1(7) 5(7)",
  open: "Em Am",
  gMajor: "G D Em C",
  power: "E5 G5 A5 G5"
};
const storageKey = "voltage-guitar-practice-v2";
const measureLabel = ({ tonic, type, note }) => chordLabel(tonic, type, note);
let practiceKey = 0;
let practiceMode = "major";
let relativeSource = "";
let progression = parseProgression(presets.open, practiceKey, practiceMode).measures;

function isValidMeasure(measure) {
  if (!measure || typeof measure !== "object") return false;
  const { tonic, type, index } = measure;
  return Number.isInteger(tonic) && tonic >= 0 && tonic < 12 && Object.hasOwn(qualities, type)
    && Number.isInteger(index) && index >= 0 && index < chordVoicings(tonic, type).length;
}

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  const measures = Array.isArray(saved) ? saved : saved?.measures;
  if (Array.isArray(measures)) progression = measures.filter(isValidMeasure).slice(0, MAX_MEASURES).map((measure) => {
    const note = parseNoteRoot(measure.note);
    return { ...measure, note: note?.tonic === measure.tonic ? note.note : undefined };
  });
  if (Number.isInteger(saved?.key) && saved.key >= 0 && saved.key < 12) practiceKey = saved.key;
  if (Object.hasOwn(keyHarmony, saved?.mode)) practiceMode = saved.mode;
  if (typeof saved?.relative === "string" && saved.relative.length <= 320) {
    const result = parseProgression(saved.relative, practiceKey, practiceMode);
    if (result.relative) {
      relativeSource = saved.relative;
      progression = result.measures;
    }
  }
} catch {
  // The editor is still usable when local storage is unavailable.
}

function shapeFor(measure) {
  return chordVoicings(measure.tonic, measure.type)[measure.index];
}

function saveProgression() {
  const state = { measures: progression, key: practiceKey, mode: practiceMode, relative: relativeSource };
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Keep the current session. */ }
}

function setInputStatus(group, message, error = false) {
  const status = $(group + "-status");
  const input = $(group + "-input");
  status.textContent = message;
  status.classList.toggle("error", error);
  if (error) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function setProgressionStatus(message, error = false) {
  setInputStatus("progression", message, error);
}

function changeProgression(source = "") {
  relativeSource = source;
  stopMetronome();
  renderProgression();
  setProgressionStatus("");
  saveProgression();
}

function applyProgression(input) {
  try {
    const { measures, relative } = parseProgression(input, practiceKey, practiceMode);
    progression = measures;
    changeProgression(relative ? input.trim() : "");
    const key = roots[practiceKey] + " " + scales[practiceMode].label;
    const keyEn = roots[practiceKey] + " " + scales[practiceMode].labelEn;
    setProgressionStatus(relative ? tr(key + " · 已应用 " + measures.length + " 小节，换调时自动移调。", keyEn + " · Applied " + measures.length + " bars. The progression transposes when you change key.")
      : tr("已应用 " + measures.length + " 小节，保留你输入的和弦。", "Applied " + measures.length + " bars, keeping your entered chords."));
  } catch (error) {
    setProgressionStatus(error.message, true);
  }
}

function addMeasure(tonic, type, index = 0, note) {
  if (progression.length >= MAX_MEASURES) return toast(tr("最多可以排 " + MAX_MEASURES + " 小节。", "A progression can contain up to " + MAX_MEASURES + " bars."));
  const measure = { tonic, type, index, note };
  progression.push(measure);
  changeProgression();
  toast(tr("已加入 " + measureLabel(measure) + " · 第 " + progression.length + " 小节", "Added " + measureLabel(measure) + " · Bar " + progression.length));
}

function measureButton(text, title, action, disabled = false) {
  const button = document.createElement("button");
  button.className = "small-button";
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", title);
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function moveMeasure(index, distance) {
  const target = index + distance;
  [progression[target], progression[index]] = [progression[index], progression[target]];
  changeProgression();
  const row = $("progression").children[target];
  const sameDirection = row.querySelectorAll(".measure-actions button")[distance < 0 ? 0 : 1];
  if (!sameDirection.disabled) sameDirection.focus();
  else row.querySelector(".measure-title button").focus();
}

function renderProgression() {
  renderPracticeNeck(progression[0]);
  const container = $("progression");
  container.replaceChildren(...progression.map((measure, index) => {
    const chord = measureLabel(measure);
    const card = document.createElement("div");
    card.className = "measure";
    const title = document.createElement("div");
    title.className = "measure-title";
    const number = document.createElement("small");
    number.textContent = String(index + 1).padStart(2, "0");
    const sound = measureButton(chord, tr("试听第 " + (index + 1) + " 小节 " + chord, "Play bar " + (index + 1) + ": " + chord), async () => {
      if (!await unlockAudio() || running) return;
      previewMeasure = measure;
      renderPracticeNeck(measure);
      strum(shapeFor(measure), audio.currentTime + .02, .12);
      animateStrum($("practice-neck"), shapeFor(measure), 20);
    });
    const voicing = shapeFor(measure);
    sound.title = tr(voicing.label, voicing.labelEn);
    title.append(number, sound);
    const controls = document.createElement("div");
    controls.className = "measure-actions";
    controls.append(
      measureButton("←", tr("第 " + (index + 1) + " 小节左移", "Move bar " + (index + 1) + " left"), () => moveMeasure(index, -1), index === 0),
      measureButton("→", tr("第 " + (index + 1) + " 小节右移", "Move bar " + (index + 1) + " right"), () => moveMeasure(index, 1), index === progression.length - 1),
      measureButton("×", tr("删除第 " + (index + 1) + " 小节", "Delete bar " + (index + 1)), () => {
        progression.splice(index, 1);
        changeProgression();
        const next = container.children[Math.min(index, progression.length - 1)];
        (next?.querySelector(".measure-title button") ?? $("practice-root")).focus();
      })
    );
    card.append(title, controls);
    return card;
  }));
  if (!progression.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = tr("还没有和弦。可以直接练节拍，也可以在下方加一个和弦。", "No chords yet. Practice the beat on its own, or add a chord below.");
    container.append(empty);
  }
}
$("progression-form").addEventListener("submit", (event) => {
  event.preventDefault();
  applyProgression($("progression-input").value);
});
$("progression-input").addEventListener("input", () => setProgressionStatus(""));
function updatePracticeKey() {
  practiceKey = Number($("practice-key").value);
  practiceMode = $("practice-mode").value;
  if (relativeSource) applyProgression(relativeSource);
  else saveProgression();
}
$("practice-key").addEventListener("change", updatePracticeKey);
$("practice-mode").addEventListener("change", updatePracticeKey);
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
  const input = presets[button.dataset.preset];
  if (/^[1-7]/.test(input)) {
    practiceMode = "major";
    $("practice-mode").value = practiceMode;
  }
  $("progression-input").value = input;
  applyProgression(input);
}));
$("add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  addMeasure(Number($("practice-root").value), $("practice-quality").value);
});

let running = false;
let beatTimer;
let beatNumber = 0;
let nextTime = 0;
let practiceBus;
let playbackIntent = 0;
let previewMeasure;
let pickingTimer;

function renderPracticeNeck(measure) {
  previewMeasure = measure;
  $("practice-neck-label").textContent = measure ? measureLabel(measure) : tr("自由节拍", "Free rhythm");
  renderNeck($("practice-neck"), measure);
  const pattern = measure && $("playback-style").value === "arpeggio" ? pickingPattern(shapeFor(measure), Number($("meter").value)) : [];
  $("picking-steps").replaceChildren(...pattern.map((string, index) => {
    const step = document.createElement("span");
    step.innerHTML = '<b>' + (6 - string) + '</b><small>' + (index % 2 ? "&" : Math.floor(index / 2) + 1) + '</small>';
    return step;
  }));
  $("picking-hint").textContent = pattern.length ? tr("上排数字是弦号，下排是拍点；第一下从最低音开始。", "Top numbers are strings; bottom numbers are beats. Start on the lowest note.")
    : tr("每小节第一拍，从最低发声弦向细弦扫下。", "On beat one of each bar, strum down from the lowest sounding string toward string 1.");
}
function renderBeats() {
  $("beats").replaceChildren(...Array.from({ length: Number($("meter").value) }, (_, index) => {
    const label = document.createElement("span");
    label.textContent = index + 1;
    return label;
  }));
}
function clickBeat(accent, start) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = accent ? 1120 : 760;
  gain.gain.setValueAtTime(.13, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + .065);
  oscillator.connect(gain).connect(practiceBus);
  oscillator.start(start);
  oscillator.stop(start + .07);
}
function tick() {
  if (!running) return;
  const meter = Number($("meter").value);
  const beat = beatNumber % meter;
  const measureIndex = progression.length ? Math.floor(beatNumber / meter) % progression.length : -1;
  const measure = progression[measureIndex];
  if (beat === 0 && measure) renderPracticeNeck(measure);
  nextTime = Math.max(nextTime, audio.currentTime + .015);
  clickBeat(beat === 0, nextTime);
  if (measure) {
    const shape = shapeFor(measure);
    const delay = (nextTime - audio.currentTime) * 1000;
    if ($("playback-style").value === "arpeggio") {
      const pattern = pickingPattern(shape, meter);
      const halfBeat = 30 / Number($("tempo").value);
      for (let half = 0; half < 2; half++) {
        const step = beat * 2 + half, string = pattern[step];
        if ($("practice-demo").checked) pluck(tuning[string] + shape.frets[string], nextTime + half * halfBeat, .16, practiceBus);
        pulseNeck($("practice-neck"), string, delay + half * halfBeat * 1000);
      }
      clearTimeout(pickingTimer);
      $("picking-steps").querySelectorAll("span").forEach((element, index) => element.classList.toggle("active", index === beat * 2));
      pickingTimer = setTimeout(() => {
        $("picking-steps").querySelectorAll("span").forEach((element, index) => element.classList.toggle("active", index === beat * 2 + 1));
      }, delay + halfBeat * 1000);
    } else if (beat === 0) {
      if ($("practice-demo").checked) strum(shape, nextTime, .08, practiceBus);
      animateStrum($("practice-neck"), shape, delay);
    }
  }
  [...$("beats").children].forEach((item, index) => item.classList.toggle("active", index === beat));
  $("progression").querySelectorAll(".measure").forEach((item, index) => item.classList.toggle("active", index === measureIndex));
  $("current-chord").textContent = measure ? tr("第 " + (measureIndex + 1) + " 小节 · " + measureLabel(measure), "Bar " + (measureIndex + 1) + " · " + measureLabel(measure)) : tr("自由节拍", "Free rhythm");
  beatNumber++;
  nextTime += 60 / Number($("tempo").value);
  beatTimer = setTimeout(tick, Math.max(0, (nextTime - audio.currentTime - .025) * 1000));
}
function stopMetronome() {
  playbackIntent++;
  running = false;
  clearTimeout(beatTimer);
  clearTimeout(pickingTimer);
  clearNeckAnimation($("practice-neck"));
  if (practiceBus) {
    practiceBus.disconnect();
    practiceBus = null;
  }
  $("metronome-button").textContent = tr("▶ 开始练习", "▶ Start practice");
  $("current-chord").textContent = tr("准备就绪", "Ready");
  $("practice").querySelectorAll(".active").forEach((item) => item.classList.remove("active"));
}
$("metronome-button").addEventListener("click", async () => {
  if (running) return stopMetronome();
  const intent = ++playbackIntent;
  if (!await unlockAudio() || intent !== playbackIntent) return;
  beatNumber = 0;
  nextTime = audio.currentTime + .02;
  practiceBus = audio.createGain();
  practiceBus.connect(audio.destination);
  running = true;
  $("metronome-button").textContent = tr("■ 停止练习", "■ Stop practice");
  tick();
});
$("meter").addEventListener("change", () => { stopMetronome(); renderBeats(); renderPracticeNeck(previewMeasure); });
$("playback-style").addEventListener("change", () => { stopMetronome(); renderPracticeNeck(previewMeasure); });
function changeTempo(value) {
  $("tempo").value = value;
  $("tempo-value").value = $("tempo").value;
}
$("tempo").addEventListener("input", (event) => changeTempo(event.target.value));
$("tempo-down").addEventListener("click", () => changeTempo(Number($("tempo").value) - 5));
$("tempo-up").addEventListener("click", () => changeTempo(Number($("tempo").value) + 5));
document.addEventListener("visibilitychange", () => { if (document.hidden) { stopMetronome(); stopScalePlayback(); } });

function updateNavigation() {
  const active = location.hash || "#lab";
  document.querySelectorAll("nav a").forEach((link) => {
    if (link.hash === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", updateNavigation);
bindNeckPlucking($("chord-neck"), () => ({ tonic: chordRoot, type: quality, index: shapeIndex, note: chordNote }));
bindNeckPlucking($("practice-neck"), () => previewMeasure);
options($("scale"), Object.entries(scales).map(([type, value]) => [type, tr(value.label, value.labelEn)]), scaleType);
options($("key-root"), rootOptions, 0);
options($("chord-root"), rootOptions, chordRoot);
options($("practice-root"), rootOptions, 4);
options($("practice-key"), rootOptions, practiceKey);
$("practice-mode").value = practiceMode;
$("progression-input").value = relativeSource;
options($("quality"), qualityOptions, quality);
options($("board-quality"), qualityOptions, quality);
options($("practice-quality"), qualityOptions, "minor");
setMode(mode);
renderKey();
renderChords();
renderProgression();
renderBeats();
updateNavigation();
