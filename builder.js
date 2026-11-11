"use strict";

function identifyDegreeChord(text, tonic) {
  const compact = text.normalize("NFKC").replace(/[\s,、-]+/g, "");
  const tokens = [...compact.matchAll(/((?:[#♯]{1,2}|[b♭]{1,2})?)([1-7])/g)];
  if (!compact || tokens.map((token) => token[0]).join("") !== compact) {
    throw new Error("请输入音级 1–7，可加升降号，例如 135、1 b3 5、1 3 5 b7。");
  }
  const notes = tokens.map((token) => {
    const degree = Number(token[2]);
    const alteration = /^[#♯]/.test(token[1]) ? token[1].length : -token[1].length;
    const interval = major.intervals[degree - 1] + alteration;
    return { pitch: mod(tonic + interval), name: spelling(tonic, interval, degree) };
  }).filter((note, index, all) => all.findIndex((entry) => entry.pitch === note.pitch) === index);
  if (notes.length < 2) throw new Error("至少输入两个不同的音级，例如 15 或 135。");
  const matches = notes.flatMap((root) => Object.entries(qualities).filter(([, info]) =>
    info.intervals.length === notes.length && info.intervals.every((interval) =>
      notes.some((note) => note.pitch === mod(root.pitch + interval))))
    .map(([type]) => ({ tonic: root.pitch, type, note: root.name })));
  return { notes, matches };
}

(() => {
  const el = (id) => document.getElementById(id);
  let matches = [];
  options(el("builder-root"), rootOptions, 0);
  function current() { return matches[Number(el("builder-match").value)]; }
  function render() {
    matches = [];
    el("builder-tones").replaceChildren();
    el("builder-match").replaceChildren();
    el("builder-add").disabled = true;
    el("builder-view").hidden = true;
    try {
      const result = identifyDegreeChord(el("builder-input").value, Number(el("builder-root").value));
      matches = result.matches;
      el("builder-tones").replaceChildren(...result.notes.map((note) => {
        const label = document.createElement("span");
        label.textContent = note.name;
        return label;
      }));
      options(el("builder-match"), matches.map((chord, index) => [
        index, chordLabel(chord.tonic, chord.type, chord.note) + " · " + qualities[chord.type].label
      ]), 0);
      el("builder-match").hidden = !matches.length;
      el("builder-input").removeAttribute("aria-invalid");
      el("builder-status").classList.remove("error");
      el("builder-status").textContent = matches.length
        ? matches.length > 1 ? "这组音有多个名称，可选择一个加入练习。" : "已识别和弦，可试听指法或加入练习。"
        : "已显示组成音，这组音尚未匹配图鉴里的和弦。";
      el("builder-add").disabled = !matches.length;
      el("builder-view").hidden = !matches.length;
    } catch (error) {
      el("builder-match").hidden = true;
      el("builder-input").setAttribute("aria-invalid", "true");
      el("builder-status").textContent = error.message;
      el("builder-status").classList.add("error");
    }
  }
  el("builder-form").addEventListener("submit", (event) => { event.preventDefault(); render(); });
  el("builder-root").addEventListener("change", render);
  el("builder-input").addEventListener("input", () => {
    matches = [];
    el("builder-add").disabled = true;
    el("builder-view").hidden = true;
    el("builder-match").hidden = true;
    el("builder-tones").replaceChildren();
    el("builder-status").textContent = "输入后点“识别和弦”。";
    el("builder-input").removeAttribute("aria-invalid");
    el("builder-status").classList.remove("error");
  });
  el("builder-add").addEventListener("click", () => {
    const chord = current();
    if (chord) addMeasure(chord.tonic, chord.type, 0, chord.note);
  });
  el("builder-view").addEventListener("click", (event) => {
    const chord = current();
    if (!chord) return event.preventDefault();
    chooseChord(chord.tonic, chord.type, 0, chord.note);
  });
  render();
})();
