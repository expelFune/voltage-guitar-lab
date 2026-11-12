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
  const workspace = el("piano-workspace"), board = el("piano-keys"), scroll = el("piano-scroll"), overlay = el("piano-overlay");
  const whiteNotes = Array.from({length:85}, (_,i) => 24+i).filter((midi) => [0,2,4,5,7,9,11].includes(mod(midi)));
  const originalPosition = document.createComment("piano-home");
  workspace.parentNode.insertBefore(originalPosition, workspace);
  const keyCodes = ["KeyA","KeyW","KeyS","KeyE","KeyD","KeyF","KeyT","KeyG","KeyY","KeyH","KeyU","KeyJ","KeyK","KeyO","KeyL","KeyP","Semicolon"];
  const whitePitchClasses = [0,2,4,5,7,9,11];
  const owners = new Map(), held = new Map(), pointers = new Set(), allVoices = new Set(), auditionVoices = new Set();
  let context, master, base = 60, span = matchMedia("(max-width:600px)").matches ? 12 : 24;
  let target = null, guesses = new Set(), revealed = false, answered = 0, correct = 0, auditionEpoch = 0;
  let expanded = false, nativeFullscreen = false, oldOverflow = "", oldSpan, returnFocus;
  let keyWidth = 42;
  let savedKeyWidth, savedScroll, scrollFrame, panPointer, panStart, panScroll;
  const useTouchEvents = "ontouchstart" in window || navigator.maxTouchPoints > 0;
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
      key.classList.toggle("answer-selected", Boolean(target && !revealed && guesses.has(answerValue(midi))));
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
    chooseAnswer(answerValue(midi));
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
    const startNotes = Array.from({ length: 7 }, (_, i) => 24 + i * 12);
    el("piano-octave").replaceChildren(...startNotes.map((midi) => {
      const option = document.createElement("option");
      option.value = midi;
      option.textContent = noteName(midi);
      return option;
    }));
    el("piano-octave").value = base;
    const notes = Array.from({ length: 85 }, (_, index) => 24 + index);
    const whiteCount = whiteNotes.length;
    let whites = 0;
    board.style.setProperty("--piano-whites", whiteCount);
    board.style.setProperty("--piano-key-width", keyWidth + "px");
    board.dataset.whites = whiteCount;
    board.style.minWidth = (whiteCount * keyWidth) + "px";
    board.style.width = (whiteCount * keyWidth) + "px";
    board.replaceChildren(...notes.map((midi) => {
      const black = !whitePitchClasses.includes(mod(midi)), key = document.createElement("button"), offset = midi - base;
      key.type = "button";
      key.className = "piano-key " + (black ? "black" : "white");
      key.dataset.pianoMidi = midi;
      key.style.width = ((black ? 62 : 100) / whiteCount) + "%";
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

  function updateScroll() {
    const max = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
    const position = Math.max(0, Math.min(max, scroll.scrollLeft));
    const viewport = scroll.clientWidth || workspace.clientWidth || 600;
    el("piano-range").value = max ? position / max * 1000 : 0;
    const first = whiteNotes[Math.max(0, Math.min(49, Math.floor(position / keyWidth)))];
    const last = whiteNotes[Math.max(0, Math.min(49, Math.floor((position + viewport - 1) / keyWidth)))];
    el("piano-range-label").textContent = noteName(first) + " — " + noteName(last);
    el("piano-range-down").disabled = scroll.scrollLeft < 1;
    el("piano-range-up").disabled = scroll.scrollLeft >= max - 1;
    base = Math.max(24, Math.min(96, Math.floor(first / 12) * 12));
    el("piano-octave").value = base;
    board.querySelectorAll("[data-piano-midi]").forEach((key) => {
      const code = keyCodes[Number(key.dataset.pianoMidi) - base];
      key.querySelector("small").textContent = code ? code.replace("Key","").replace("Semicolon",";") : "";
    });
  }
  scroll.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(updateScroll);
  });
  function setKeyWidth(width) {
    const anchor = scroll.scrollLeft / keyWidth;
    keyWidth = Math.max(8, Math.min(120, width));
    board.style.setProperty("--piano-key-width", keyWidth + "px");
    board.style.minWidth = board.style.width = (whiteNotes.length * keyWidth) + "px";
    scroll.scrollLeft = anchor * keyWidth;
    el("piano-zoom-label").textContent = "键宽 " + Math.round(keyWidth) + "px";
    el("piano-zoom-out").disabled = keyWidth <= 8;
    el("piano-zoom-in").disabled = keyWidth >= 120;
    updateScroll();
  }
  function fitView() { setKeyWidth((scroll.clientWidth || workspace.clientWidth || 600) / (span / 12 * 7 + 1)); }
  function jumpTo(midi) {
    const index = whiteNotes.findIndex((note) => note >= midi);
    scroll.scrollLeft = Math.max(0, index) * keyWidth;
    updateScroll();
  }

  board.addEventListener("pointerdown", (event) => {
    if (useTouchEvents && event.pointerType === "touch") return;
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
  function touchKey(touch) {
    const key = document.elementFromPoint(touch.clientX, touch.clientY)?.closest("[data-piano-midi]");
    return key && board.contains(key) ? Number(key.dataset.pianoMidi) : undefined;
  }
  board.addEventListener("touchstart", (event) => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      const midi = touchKey(touch);
      if (midi !== undefined) void press("touch-" + touch.identifier, midi);
    }
  }, { passive: false });
  board.addEventListener("touchmove", (event) => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      const owner = "touch-" + touch.identifier, midi = touchKey(touch);
      if (owners.get(owner) === midi) continue;
      release(owner);
      if (midi !== undefined) void press(owner, midi);
    }
  }, { passive: false });
  for (const type of ["touchend","touchcancel"]) board.addEventListener(type, (event) => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) release("touch-" + touch.identifier);
  }, { passive: false });

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
    if (index < 0 || base + index > 108) return;
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
  function answerValue(midi) { return el("ear-octave-answer").checked ? midi : mod(midi); }
  function earPool() {
    const length = Number(el("ear-span").value);
    const first = Math.max(24, Math.min(108 - length, Number(el("ear-start").value)));
    el("ear-start").value = first;
    el("ear-range-hint").textContent = "出题音域 " + noteName(first) + " — " + noteName(first + length - 1)
      + (el("ear-octave-answer").checked ? "，答案区分八度。" : "，只判断音名。") + " 多个音不分顺序，可点钢琴或音名作答。";
    return Array.from({length}, (_,i) => first + i).filter((midi) => el("ear-pool").value !== "white" || whitePitchClasses.includes(mod(midi)));
  }
  function renderAnswerButtons() {
    const values = [...new Set(earPool().map(answerValue))];
    el("ear-answers").replaceChildren(...values.map((pitch) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.dataset.pitch = pitch;
      button.textContent = el("ear-octave-answer").checked ? noteName(pitch) : roots[pitch];
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
    question.forEach((midi, index) => {
      const delay = el("ear-order").value === "sequence" ? index * .7 : 0;
      auditionVoices.add(voice(midi, start + delay, .8));
    });
  }
  el("ear-new").addEventListener("click", () => {
    silence();
    const available = earPool(), count = Number(el("ear-count").value);
    target = el("ear-octave-answer").checked ? makeEarQuestion(available, count)
      : makeEarQuestion([...new Set(available.map(modNote => mod(modNote)))], count).map((pitch) => {
        const candidates = available.filter((midi) => mod(midi) === pitch);
        return candidates[Math.floor(Math.random() * candidates.length)];
      });
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
    const right = sameEarAnswer(guesses, target.map(answerValue));
    revealed = true;
    answered++;
    if (!showOnly && right) correct++;
    el("ear-status").textContent = (showOnly ? "答案是 " : right ? "答对了！" : "再听听这些音：") + target.map((midi) => el("ear-octave-answer").checked ? noteName(midi) : roots[mod(midi)]).join(" · ");
    el("ear-score").textContent = "已答 " + answered + " 题 · 答对 " + correct + " 题";
    el("ear-submit").disabled = el("ear-reveal").disabled = true;
    highlight();
  }
  el("ear-submit").addEventListener("click", () => finish(false));
  el("ear-reveal").addEventListener("click", () => finish(true));
  for (const id of ["ear-count","ear-pool","ear-order","ear-start","ear-span","ear-octave-answer"]) el(id).addEventListener("change", clearQuestion);
  el("ear-give-reference").addEventListener("change", () => { auditionEpoch++; for (const sound of auditionVoices) sound.stop(true); auditionVoices.clear(); });
  el("piano-octave").addEventListener("change", () => jumpTo(Number(el("piano-octave").value)));
  el("piano-span").addEventListener("change", () => { span = Number(el("piano-span").value); fitView(); });
  el("piano-range").addEventListener("input", () => {
    scroll.scrollLeft = Number(el("piano-range").value) / 1000 * Math.max(0, scroll.scrollWidth - scroll.clientWidth);
    updateScroll();
  });
  el("piano-range-down").addEventListener("click", () => { scroll.scrollLeft = Math.max(0, scroll.scrollLeft - keyWidth * 7); updateScroll(); });
  el("piano-range-up").addEventListener("click", () => { scroll.scrollLeft = Math.min(scroll.scrollWidth - scroll.clientWidth, scroll.scrollLeft + keyWidth * 7); updateScroll(); });
  const pan = el("piano-pan");
  const panCoordinate = (event) => workspace.classList.contains("landscape-fixed") ? event.clientY : event.clientX;
  pan.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || panPointer !== undefined) return;
    event.preventDefault();
    panPointer = event.pointerId;
    panStart = panCoordinate(event);
    panScroll = scroll.scrollLeft;
    pan.setPointerCapture(panPointer);
  });
  pan.addEventListener("pointermove", (event) => {
    if (event.pointerId !== panPointer) return;
    scroll.scrollLeft = panScroll - (panCoordinate(event) - panStart);
    updateScroll();
  });
  for (const type of ["pointerup","pointercancel","lostpointercapture"]) pan.addEventListener(type, (event) => {
    if (event.pointerId !== panPointer) return;
    panPointer = undefined;
    if (pan.hasPointerCapture(event.pointerId)) pan.releasePointerCapture(event.pointerId);
  });
  function zoom(direction) {
    setKeyWidth(keyWidth + direction * 6);
  }
  el("piano-zoom-out").addEventListener("click", () => zoom(-1));
  el("piano-zoom-in").addEventListener("click", () => zoom(1));
  function updateLandscape() {
    const width = (expanded && overlay.clientWidth) || window.visualViewport?.width || window.innerWidth;
    const height = (expanded && overlay.clientHeight) || window.visualViewport?.height || window.innerHeight;
    workspace.classList.toggle("landscape-fixed", Boolean(expanded && width < height));
    workspace.style.setProperty("--piano-long-side", Math.max(width, height) + "px");
    workspace.style.setProperty("--piano-short-side", Math.min(width, height) + "px");
    updateScroll();
  }

  async function closeExpanded() {
    if (!expanded) return;
    expanded = false;
    silence();
    workspace.classList.remove("expanded");
    workspace.classList.remove("landscape-fixed");
    workspace.removeAttribute("role");
    workspace.removeAttribute("aria-modal");
    document.body.style.overflow = oldOverflow;
    span = oldSpan;
    if (document.fullscreenElement === overlay) await document.exitFullscreen().catch(() => {});
    originalPosition.parentNode.insertBefore(workspace, originalPosition.nextSibling);
    overlay.hidden = true;
    el("piano-span").value = span;
    setKeyWidth(savedKeyWidth);
    scroll.scrollLeft = savedScroll;
    updateLandscape();
    el("piano-expand").textContent = "⛶ 放大 / 横屏";
    el("piano-screen-status").textContent = "";
    try { screen.orientation?.unlock?.(); } catch { /* Orientation may be browser-controlled. */ }
    nativeFullscreen = false;
    returnFocus?.focus();
  }
  el("piano-expand").addEventListener("click", async () => {
    if (expanded) return closeExpanded();
    expanded = true;
    oldSpan = span;
    savedKeyWidth = keyWidth;
    savedScroll = scroll.scrollLeft;
    span = Math.max(24, span);
    returnFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.hidden = false;
    overlay.append(workspace);
    workspace.classList.add("expanded");
    workspace.setAttribute("role", "dialog");
    workspace.setAttribute("aria-modal", "true");
    updateLandscape();
    fitView();
    jumpTo(60);
    el("piano-span").value = span;
    el("piano-expand").textContent = "退出放大";
    el("piano-expand").focus();
    el("piano-screen-status").textContent = "横屏布局已锁定，可横持手机弹奏；电脑按 Esc 退出。";
    if (overlay.requestFullscreen) {
      try {
        await overlay.requestFullscreen();
        nativeFullscreen = true;
        updateLandscape();
        if (!expanded) { if (document.fullscreenElement === overlay) await document.exitFullscreen(); return; }
        try { await screen.orientation?.lock?.("landscape"); } catch { /* Keep the page itself horizontal when device rotation is locked. */ }
        if (!expanded) { try { screen.orientation?.unlock?.(); } catch {} return; }
        updateLandscape();
        fitView();
        jumpTo(60);
      } catch { /* The expanded layout remains available without native fullscreen. */ }
    }
  });
  document.addEventListener("fullscreenchange", () => { if (nativeFullscreen && document.fullscreenElement !== overlay) void closeExpanded(); });
  window.addEventListener("resize", updateLandscape);
  window.visualViewport?.addEventListener("resize", updateLandscape);
  window.addEventListener("blur", silence);
  window.addEventListener("pagehide", silence);
  document.addEventListener("visibilitychange", () => { if (document.hidden) silence(); });
  el("piano-span").value = span;
  renderKeyboard();
  fitView();
  jumpTo(60);
  renderAnswerButtons();
})();
