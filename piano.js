"use strict";

function makeEarQuestion(pool, count, random = Math.random) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).sort((a,b) => a-b);
}

function sameEarAnswer(answer, expected) {
  return answer.size === expected.length && expected.every((note) => answer.has(note));
}

(() => {
  const el = (id) => document.getElementById(id);
  const workspace = el("piano-workspace"), board = el("piano-keys");
  const keyCodes = ["KeyA","KeyW","KeyS","KeyE","KeyD","KeyF","KeyT","KeyG","KeyY","KeyH","KeyU","KeyJ","KeyK","KeyO","KeyL","KeyP","Semicolon"];
  const whitePitchClasses = [0,2,4,5,7,9,11];
  const owners = new Map(), held = new Map(), pointers = new Set(), allVoices = new Set(), auditionVoices = new Set();
  let context, master, base = 60, span = matchMedia("(max-width:600px)").matches ? 12 : 24;
  let target = null, guesses = new Set(), revealed = false, answered = 0, correct = 0, auditionEpoch = 0;
  let expanded = false, nativeFullscreen = false, oldOverflow = "", oldSpan, returnFocus;
  const noteName = (midi) => roots[mod(midi)] + (Math.floor(midi / 12) - 1);

  async function ensureAudio() {
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        context = new Audio();
        master = context.createGain();
        master.gain.value = .28;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.ratio.value = 8;
        master.connect(limiter).connect(context.destination);
      }
      if (context.state !== "running") await context.resume();
      return context.state === "running";
    } catch {
      el("piano-note").textContent = "音频暂不可用，请检查浏览器声音设置。";
      return false;
    }
  }

  function voice(midi, when, duration = 7) {
    const envelope = context.createGain(), oscillators = [];
    envelope.gain.setValueAtTime(.001, when);
    envelope.gain.exponentialRampToValueAtTime(1, when + .008);
    envelope.gain.exponentialRampToValueAtTime(.22, when + Math.min(.9, duration * .6));
    envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
    envelope.connect(master);
    let released = false;
    const sound = {
      stop(immediate = false) {
        if (released && !immediate) return;
        released = true;
        const now = context.currentTime, tail = immediate ? .015 : .16;
        envelope.gain.cancelScheduledValues(now);
        envelope.gain.setValueAtTime(Math.max(.0001, envelope.gain.value), now);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + tail);
        for (const oscillator of oscillators) oscillator.stop(now + tail + .01);
      }
    };
    [1,2,3,4].forEach((partial, index) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12) * partial;
      gain.gain.value = [.62,.22,.09,.035][index];
      oscillator.connect(gain).connect(envelope);
      oscillator.start(when);
      oscillator.stop(when + duration + .03);
      oscillators.push(oscillator);
    });
    allVoices.add(sound);
    oscillators[0].onended = () => { allVoices.delete(sound); auditionVoices.delete(sound); };
    return sound;
  }

  function highlight() {
    board.querySelectorAll("[data-piano-midi]").forEach((key) => {
      const midi = Number(key.dataset.pianoMidi);
      key.classList.toggle("pressed", held.has(midi));
      key.classList.toggle("answer-selected", Boolean(target && !revealed && guesses.has(mod(midi))));
    });
    el("piano-note").textContent = held.size ? [...held.keys()].sort((a,b) => a-b).map(noteName).join(" ＋ ") : "点琴键开始弹奏";
  }

  function chooseAnswer(pitch) {
    if (!target || revealed) return;
    if (guesses.has(pitch)) guesses.delete(pitch);
    else guesses.add(pitch);
    el("ear-answers").querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(guesses.has(Number(button.dataset.pitch)))));
    el("ear-status").textContent = "已选择 " + guesses.size + " / " + target.length + " 个音。";
    highlight();
  }

  async function press(owner, midi) {
    if (owners.has(owner)) return;
    owners.set(owner, midi);
    let entry = held.get(midi);
    if (!entry) {
      entry = { owners: new Set(), sound: null };
      held.set(midi, entry);
    }
    entry.owners.add(owner);
    highlight();
    chooseAnswer(mod(midi));
    if (!await ensureAudio() || held.get(midi) !== entry || entry.owners.size === 0) return;
    if (!entry.sound) entry.sound = voice(midi, context.currentTime + .005);
  }

  function release(owner) {
    const midi = owners.get(owner);
    if (midi === undefined) return;
    owners.delete(owner);
    const entry = held.get(midi);
    entry?.owners.delete(owner);
    if (entry && entry.owners.size === 0) {
      entry.sound?.stop();
      held.delete(midi);
    }
    highlight();
  }

  function silence() {
    auditionEpoch++;
    for (const sound of allVoices) sound.stop(true);
    auditionVoices.clear();
    held.clear();
    owners.clear();
    pointers.clear();
    highlight();
  }

  function renderKeyboard() {
    silence();
    const notes = Array.from({ length: span + 1 }, (_, index) => base + index);
    const whiteCount = notes.filter((note) => whitePitchClasses.includes(mod(note))).length;
    let whites = 0;
    board.style.setProperty("--piano-whites", whiteCount);
    board.replaceChildren(...notes.map((midi) => {
      const black = !whitePitchClasses.includes(mod(midi)), key = document.createElement("button"), offset = midi - base;
      key.type = "button";
      key.className = "piano-key " + (black ? "black" : "white");
      key.dataset.pianoMidi = midi;
      const letter = keyCodes[offset] ? keyCodes[offset].replace("Key","").replace("Semicolon",";") : "";
      key.setAttribute("aria-label", noteName(midi) + (letter ? "，电脑按键 " + letter : ""));
      if (black) key.style.left = (whites / whiteCount * 100) + "%";
      else whites++;
      key.innerHTML = '<span>' + noteName(midi) + '</span><small>' + letter + '</small>';
      key.addEventListener("click", (event) => {
        if (event.detail !== 0) return;
        const owner = "accessible-" + midi;
        void press(owner, midi);
        setTimeout(() => release(owner), 260);
      });
      return key;
    }));
    el("piano-span").value = span;
    highlight();
  }

  board.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const key = event.target.closest("[data-piano-midi]");
    if (!key || !board.contains(key)) return;
    event.preventDefault();
    pointers.add(event.pointerId);
    board.setPointerCapture(event.pointerId);
    void press("pointer-" + event.pointerId, Number(key.dataset.pianoMidi));
  });
  board.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const key = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-piano-midi]");
    const owner = "pointer-" + event.pointerId;
    const midi = key && board.contains(key) ? Number(key.dataset.pianoMidi) : undefined;
    if (owners.get(owner) === midi) return;
    release(owner);
    if (midi !== undefined) void press(owner, midi);
  });
  function releasePointer(event) {
    pointers.delete(event.pointerId);
    release("pointer-" + event.pointerId);
    if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  }
  for (const type of ["pointerup","pointercancel","lostpointercapture"]) board.addEventListener(type, releasePointer);

  document.addEventListener("keydown", (event) => {
    if (expanded && event.key === "Escape") { event.preventDefault(); void closeExpanded(); return; }
    if (expanded && event.key === "Tab") {
      const focusable = [...workspace.querySelectorAll("button,select,input,[tabindex]")].filter((node) => !node.disabled && node.getClientRects().length);
      if (focusable.length && ((event.shiftKey && document.activeElement === focusable[0]) || (!event.shiftKey && document.activeElement === focusable.at(-1)))) {
        event.preventDefault();
        (event.shiftKey ? focusable.at(-1) : focusable[0]).focus();
      }
    }
    if (!el("piano-computer").checked || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const index = keyCodes.indexOf(event.code);
    if (index < 0 || index > span) return;
    event.preventDefault();
    void press("keyboard-" + event.code, base + index);
  });
  document.addEventListener("keyup", (event) => release("keyboard-" + event.code));
  el("piano-computer").addEventListener("change", () => {
    for (const owner of [...owners.keys()]) if (owner.startsWith("keyboard-")) release(owner);
  });

  function clearQuestion() {
    target = null;
    guesses.clear();
    revealed = false;
    for (const id of ["ear-submit","ear-reveal","ear-replay"]) el(id).disabled = true;
    el("ear-status").textContent = "设置已更新，点“开始 / 下一题”。";
    renderAnswerButtons();
    silence();
  }
  function pool() { return el("ear-pool").value === "white" ? whitePitchClasses : Array.from({length:12}, (_,i) => i); }
  function renderAnswerButtons() {
    el("ear-answers").replaceChildren(...pool().map((pitch) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.dataset.pitch = pitch;
      button.textContent = roots[pitch];
      button.setAttribute("aria-pressed", String(guesses.has(pitch)));
      button.addEventListener("click", () => chooseAnswer(pitch));
      return button;
    }));
  }

  async function playQuestion() {
    const question = target, epoch = ++auditionEpoch;
    for (const sound of auditionVoices) sound.stop(true);
    auditionVoices.clear();
    if (!question || !await ensureAudio() || epoch !== auditionEpoch) return;
    stopMetronome();
    let start = context.currentTime + .04;
    if (el("ear-give-reference").checked) {
      auditionVoices.add(voice(Number(el("ear-reference").value), start, .65));
      start += 1;
    }
    question.forEach((pitch, index) => {
      const delay = el("ear-order").value === "sequence" ? index * .7 : 0;
      auditionVoices.add(voice(base + pitch, start + delay, .8));
    });
  }
  el("ear-new").addEventListener("click", () => {
    silence();
    target = makeEarQuestion(pool(), Number(el("ear-count").value));
    guesses.clear();
    revealed = false;
    renderAnswerButtons();
    highlight();
    for (const id of ["ear-submit","ear-reveal","ear-replay"]) el(id).disabled = false;
    el("ear-status").textContent = "请听 " + target.length + " 个音，然后选出音名。";
    void playQuestion();
  });
  el("ear-replay").addEventListener("click", () => { void playQuestion(); });
  el("ear-standard").addEventListener("click", async () => {
    const epoch = ++auditionEpoch;
    for (const sound of auditionVoices) sound.stop(true);
    auditionVoices.clear();
    if (await ensureAudio() && epoch === auditionEpoch) {
      stopMetronome();
      auditionVoices.add(voice(Number(el("ear-reference").value), context.currentTime + .02, .75));
    }
  });
  function finish(showOnly) {
    if (!target || revealed) return;
    if (!showOnly && guesses.size !== target.length) {
      el("ear-status").textContent = "这题有 " + target.length + " 个音，请选满后再提交。";
      return;
    }
    const right = sameEarAnswer(guesses, target);
    revealed = true;
    answered++;
    if (!showOnly && right) correct++;
    el("ear-status").textContent = (showOnly ? "答案是 " : right ? "答对了！" : "再听听这些音：") + target.map((pitch) => roots[pitch]).join(" · ");
    el("ear-score").textContent = "已答 " + answered + " 题 · 答对 " + correct + " 题";
    el("ear-submit").disabled = el("ear-reveal").disabled = true;
    highlight();
  }
  el("ear-submit").addEventListener("click", () => finish(false));
  el("ear-reveal").addEventListener("click", () => finish(true));
  for (const id of ["ear-count","ear-pool","ear-order"]) el(id).addEventListener("change", clearQuestion);
  el("ear-give-reference").addEventListener("change", () => { auditionEpoch++; for (const sound of auditionVoices) sound.stop(true); auditionVoices.clear(); });
  el("piano-octave").addEventListener("change", () => { base = Number(el("piano-octave").value); clearQuestion(); renderKeyboard(); });
  el("piano-span").addEventListener("change", () => { span = Number(el("piano-span").value); renderKeyboard(); });

  async function closeExpanded() {
    if (!expanded) return;
    expanded = false;
    silence();
    workspace.classList.remove("expanded");
    workspace.removeAttribute("role");
    workspace.removeAttribute("aria-modal");
    document.body.style.overflow = oldOverflow;
    span = oldSpan;
    renderKeyboard();
    el("piano-expand").textContent = "⛶ 放大 / 横屏";
    el("piano-screen-status").textContent = "";
    try { screen.orientation?.unlock?.(); } catch { /* Orientation may be browser-controlled. */ }
    if (document.fullscreenElement === workspace) await document.exitFullscreen().catch(() => {});
    nativeFullscreen = false;
    returnFocus?.focus();
  }
  el("piano-expand").addEventListener("click", async () => {
    if (expanded) return closeExpanded();
    expanded = true;
    oldSpan = span;
    span = 24;
    returnFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    workspace.classList.add("expanded");
    workspace.setAttribute("role", "dialog");
    workspace.setAttribute("aria-modal", "true");
    renderKeyboard();
    el("piano-expand").textContent = "退出放大";
    el("piano-expand").focus();
    el("piano-screen-status").textContent = "已展开横屏布局，可旋转手机弹奏；电脑按 Esc 退出。";
    if (workspace.requestFullscreen) {
      try {
        await workspace.requestFullscreen();
        nativeFullscreen = true;
        if (!expanded) { if (document.fullscreenElement === workspace) await document.exitFullscreen(); return; }
        try { await screen.orientation?.lock?.("landscape"); } catch { /* CSS provides landscape layout where locking is unavailable. */ }
      } catch { /* The expanded layout remains available without native fullscreen. */ }
    }
  });
  document.addEventListener("fullscreenchange", () => { if (nativeFullscreen && document.fullscreenElement !== workspace) void closeExpanded(); });
  window.addEventListener("blur", silence);
  window.addEventListener("pagehide", silence);
  document.addEventListener("visibilitychange", () => { if (document.hidden) silence(); });
  el("piano-span").value = span;
  renderKeyboard();
  renderAnswerButtons();
})();
