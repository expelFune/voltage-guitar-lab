"use strict";

const fingerColors = ["#f2d9a0", "#54d99b", "#65b8ff", "#ffb451", "#f37ba6"];
const neckAnimations = new WeakMap();
const neckInteractions = new WeakMap();
function crossedNeckStrings(from, to) {
  if (from.x === to.x) return [];
  return Array.from({ length: 6 }, (_, string) => ({ string, x: 60 + string * 37 }))
    .map((hit) => ({ ...hit, progress: (hit.x - from.x) / (to.x - from.x) }))
    .filter((hit) => {
      const y = from.y + hit.progress * (to.y - from.y);
      return hit.progress > 0 && hit.progress <= 1 && y >= 62 && y <= 372;
    })
    .sort((a, b) => a.progress - b.progress)
    .map((hit) => hit.string);
}

function clearNeckAnimation(container) {
  for (const timer of neckAnimations.get(container) || []) clearTimeout(timer);
  neckAnimations.delete(container);
  container.querySelectorAll(".ringing").forEach((element) => element.classList.remove("ringing"));
}

function neckDiagram(shape, tonic, type, note, id) {
  const pressed = shape.frets.filter((fret) => fret > 0);
  const first = Math.max(...pressed) <= 5 ? 1 : Math.min(...pressed);
  const count = Math.min(5, MAX_FRET - first + 1);
  const top = 62, height = 292, row = height / count;
  const x = (string) => 60 + string * 37;
  const y = (fret) => top + (fret - first + .67) * row;
  const info = qualities[type];
  const parts = [
    '<svg viewBox="0 0 310 421" role="group" aria-label="' + tr(chordLabel(tonic, type, note) + ' · ' + shape.label + ' · 指法与拨弦示意', chordLabel(tonic, type, note) + ' · ' + shape.labelEn + ' · Fingering and picking diagram') + '">',
    '<defs><linearGradient id="' + id + '-wood"><stop stop-color="#30221b"/><stop offset=".4" stop-color="#463226"/><stop offset=".7" stop-color="#3c2b21"/><stop offset="1" stop-color="#2a1e18"/></linearGradient></defs>',
    '<path d="M43 61H262L272 370H34Z" fill="#201811" stroke="#786248" stroke-width="1.5"/>',
    '<path d="M47 62H258L267 367H39Z" fill="url(#' + id + '-wood)"/>'
  ];
  for (let grain = 0; grain < 24; grain++) {
    const center = 48 + grain * 9;
    parts.push('<path d="M' + center + ' 66C' + (center - 2) + ' 165 ' + (center + 2) + ' 254 ' + center + ' 365" stroke="' + (grain % 3 ? '#c59c70' : '#100e0c') + '" stroke-width="' + (grain % 3 ? '.45' : '.7') + '" opacity=".16" fill="none"/>');
  }
  for (let i = 0; i <= count; i++) {
    const line = top + i * row;
    const fret = first + i;
    if (i < count) {
      parts.push('<text class="neck-fret-number" x="20" y="' + (line + row * .55) + '">' + fret + '</text>');
      if ([3,5,7,9,12,15,17,19,21,24].includes(fret)) {
        const dots = fret % 12 === 0 ? [123,182] : [152];
        for (const center of dots) parts.push('<circle cx="' + center + '" cy="' + (line + row / 2) + '" r="5" fill="#d3bd96" opacity=".65"/>');
      }
    }
    parts.push('<path d="M40 ' + (line + 2) + 'H266" stroke="#0c0907" stroke-width="4"/>',
      '<path d="M40 ' + line + 'H266" stroke="' + (first === 1 && i === 0 ? "#f5e4ba" : "#cfc6b7") + '" stroke-width="' + (first === 1 && i === 0 ? 7 : 2.5) + '"/>');
  }
  for (let finger = 1; finger <= 4; finger++) {
    const indexes = shape.fingers.flatMap((value, index) => value === finger && shape.frets[index] > 0 ? [index] : []);
    if (indexes.length > 1 && indexes.every((index) => shape.frets[index] === shape.frets[indexes[0]])) {
      parts.push('<path d="M' + x(indexes[0]) + ' ' + y(shape.frets[indexes[0]]) + 'H' + x(indexes.at(-1)) + '" stroke="' + fingerColors[finger] + '" stroke-opacity=".65" stroke-width="19" stroke-linecap="round"/>');
    }
  }
  shape.frets.forEach((fret, string) => {
    const center = x(string), muted = fret === null;
    const interval = muted ? -1 : mod(tuning[string] + fret - tonic);
    const degree = info.intervals.indexOf(interval);
    const pitch = muted ? "—" : spelling(tonic, interval, info.degrees[degree], note);
    const openNote = roots[mod(tuning[string])];
    parts.push('<text class="neck-string-name" x="' + center + '" y="19">' + openNote + '</text>',
      '<text class="neck-open ' + (muted ? 'muted' : '') + '" x="' + center + '" y="45">' + (muted ? "×" : fret === 0 ? "○" : "") + '</text>',
      '<g class="neck-string' + (muted ? ' muted' : '') + '" data-neck-string="' + string + '">',
      '<path class="string-glow" d="M' + center + ' 64V370"/>',
      '<path class="string-core" d="M' + center + ' 64V370" stroke-width="' + (2.8 - string * .34) + '"/>');
    if (fret > 0) {
      const finger = shape.fingers[string];
      parts.push('<circle cx="' + center + '" cy="' + y(fret) + '" r="14" fill="' + fingerColors[finger] + '" stroke="#ffffffaa" stroke-width="1.5"/><text class="neck-finger" x="' + center + '" y="' + (y(fret) + 5) + '">' + finger + '</text>');
    }
    parts.push('</g><text class="neck-pitch" x="' + center + '" y="393">' + pitch + '</text>',
      '<text class="neck-string-number" x="' + center + '" y="413">' + (6 - string) + '</text>');
  });
  // Broad transparent targets keep each string easy to pluck on a phone.
  shape.frets.forEach((fret, string) => {
    if (fret !== null) parts.push('<rect class="neck-hit" data-pluck="' + string + '" x="' + (x(string) - 17) + '" y="62" width="34" height="310" fill="transparent" role="button" tabindex="0" aria-label="' + tr('拨响 ' + (6 - string) + ' 弦，' + (fret === 0 ? '空弦' : fret + ' 品'), 'Pluck string ' + (6 - string) + ', ' + (fret === 0 ? 'Open' : 'Fret ' + fret)) + '"/>');
  });
  parts.push('<g class="neck-pick" aria-hidden="true" visibility="hidden"><path d="M-12-10Q0-17 12-10Q17-4 0 15Q-17-4-12-10Z" fill="#ffe09b" stroke="#fff5d6" stroke-width="1.5"/><path d="M-5-6Q0-10 5-6" fill="none" stroke="#b68745" stroke-width="1.5"/></g></svg>');
  return parts.join("");
}

function renderNeck(container, measure) {
  neckInteractions.get(container)?.();
  clearNeckAnimation(container);
  container.innerHTML = measure ? neckDiagram(chordVoicings(measure.tonic, measure.type)[measure.index], measure.tonic, measure.type, measure.note, container.id)
    : '<p class="hint neck-empty">' + tr('添加和弦后，这里会显示当前小节的指法。', 'Add a chord to see the fingering for the current bar here.') + '</p>';
}

function pulseNeck(container, string, delay = 0) {
  const timers = neckAnimations.get(container) || new Set();
  neckAnimations.set(container, timers);
  const timer = setTimeout(() => {
    timers.delete(timer);
    const line = container.querySelector('[data-neck-string="' + string + '"]');
    if (!line) return;
    line.classList.remove("ringing");
    void line.getBoundingClientRect();
    line.classList.add("ringing");
  }, delay);
  timers.add(timer);
}

function animateStrum(container, shape, delay = 0) {
  shape.frets.forEach((fret, string) => {
    if (fret !== null) pulseNeck(container, string, delay + string * 28);
  });
}

function pickingPattern(shape, beats) {
  const sounding = shape.frets.flatMap((fret, index) => fret === null ? [] : [index]);
  const preferred = [sounding[0], 3, 4, 3, 5, 3, 4, 3];
  return Array.from({ length: beats * 2 }, (_, index) => {
    const string = preferred[index % preferred.length];
    return sounding.includes(string) ? string : sounding.reduce((best, current) =>
      Math.abs(current - string) < Math.abs(best - string) ? current : best);
  });
}
