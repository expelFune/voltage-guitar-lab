"use strict";

// YIN cumulative mean normalized difference, with sub-sample interpolation.
function estimateTunerPitch(buffer, sampleRate, minimumRms = .0006) {
  const stride = Math.max(1, Math.round(sampleRate / 24000));
  const rate = sampleRate / stride;
  const size = Math.min(4096, Math.floor(buffer.length / stride));
  const samples = new Float32Array(size);
  const offset = buffer.length - size * stride;
  let mean = 0, energy = 0;
  for (let i = 0; i < size; i++) {
    let sum = 0;
    for (let j = 0; j < stride; j++) sum += buffer[offset + i * stride + j];
    samples[i] = sum / stride;
    mean += samples[i];
  }
  mean /= size;
  for (let i = 0; i < size; i++) {
    samples[i] -= mean;
    energy += samples[i] * samples[i];
  }
  if (Math.sqrt(energy / size) < minimumRms) return null;
  const minLag = Math.max(2, Math.floor(rate / 2100));
  const maxLag = Math.min(Math.floor(rate / 30), Math.floor(size / 2) - 1);
  const windowSize = size - maxLag;
  const differences = new Float32Array(maxLag + 1);
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let difference = 0;
    for (let i = 0; i < windowSize; i++) {
      const delta = samples[i] - samples[i + lag];
      difference += delta * delta;
    }
    cumulative += difference;
    differences[lag] = cumulative ? difference * lag / cumulative : 1;
  }
  let candidate = -1;
  for (let lag = minLag; lag < maxLag; lag++) {
    if (differences[lag] >= .15) continue;
    while (lag + 1 <= maxLag && differences[lag + 1] < differences[lag]) lag++;
    candidate = lag;
    break;
  }
  if (candidate < 0) return null;
  const a = differences[candidate - 1], b = differences[candidate], c = differences[candidate + 1];
  const denominator = 2 * (2 * b - a - c);
  const shift = Number.isFinite(denominator) && denominator !== 0 ? (c - a) / denominator : 0;
  const frequency = rate / (candidate + Math.max(-1, Math.min(1, shift)));
  return frequency >= 30 && frequency <= 2100 ? frequency : null;
}

function tunerNoteName(midi) {
  return roots[mod(midi)] + (Math.floor(midi / 12) - 1);
}

function parseTunerTargets(text) {
  const tokens = text.normalize("NFKC").trim().split(/[\s,、]+/);
  if (tokens.length !== 6) throw new Error(tr("请按 6 → 1 弦填入六个音，例如 D2 A2 D3 G3 B3 E4。", "Enter six notes from string 6 to string 1, for example D2 A2 D3 G3 B3 E4."));
  return tokens.map((token) => {
    const match = /^([A-Ga-g][#♯b♭]?)([1-6])$/.exec(token);
    if (!match) throw new Error(tr("识别不了「" + token + "」，请带上八度，例如 F#3 或 Bb2。", "Cannot read \"" + token + "\". Include an octave, for example F#3 or Bb2."));
    const letter = match[1][0].toUpperCase();
    const accidental = match[1].slice(1);
    const offset = ["#", "♯"].includes(accidental) ? 1 : accidental ? -1 : 0;
    const midi = 12 * (Number(match[2]) + 1) + natural[letters.indexOf(letter)] + offset;
    if (midi < 24 || midi > 95) throw new Error(tr("目标音请设在 C1 到 B6 之间。", "Target notes must be between C1 and B6."));
    return midi;
  });
}

(() => {
  const el = (id) => document.getElementById(id);
  const presets = [
    ["standard", "标准调弦", [40,45,50,55,59,64], "Standard tuning"],
    ["dropD", "Drop D", [38,45,50,55,59,64], "Drop D"],
    ["dropC", "Drop C", [36,43,48,53,57,62], "Drop C"],
    ["halfDown", "降半音", [39,44,49,54,58,63], "Half step down"],
    ["wholeDown", "全音降调", [38,43,48,53,57,62], "Whole step down"],
    ["dadgad", "DADGAD", [38,45,50,55,57,62], "DADGAD"],
    ["openG", "Open G", [38,43,50,55,59,62], "Open G"],
    ["openD", "Open D", [38,45,50,54,57,62], "Open D"]
  ];
  let targets = [...presets[0][2]], locked = null, matched = null;
  let context, stream, source, analyser, frame, pending = false, active = false, request = 0;
  let reference = 440, lastFrequency = null, history = [], lastSignal = 0, lastFrame = 0;
  const thresholds = { high: .0006, standard: .002, low: .006 };

  function setInputLevel(value) {
    const level = Math.max(0, Math.min(100, value));
    el("tuner-input-fill").style.width = level.toFixed(1) + "%";
    el("tuner-level-value").textContent = Math.round(level) + "%";
    el("tuner-input-level").setAttribute("aria-valuenow", String(Math.round(level)));
  }

  function targetText() {
    return el("tuner-mode").value === "chromatic" ? tr("自动识别最近的半音", "Automatically identify the nearest semitone")
      : locked === null ? tr("自动匹配最近的空弦目标", "Automatically match the nearest open-string target")
      : tr("锁定 " + (6 - locked) + " 弦 · " + tunerNoteName(targets[locked]), "Locked to string " + (6 - locked) + " · " + tunerNoteName(targets[locked]));
  }
  function highlightStrings() {
    [...el("tuner-strings").children].forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === locked));
      button.classList.toggle("matched", index === matched);
    });
    el("tuner-auto").setAttribute("aria-pressed", String(locked === null));
  }
  function renderStrings() {
    el("tuner-strings").replaceChildren(...targets.map((midi, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.innerHTML = "<small>" + tr((6 - index) + " 弦", "String " + (6 - index)) + "</small><b>" + tunerNoteName(midi) + "</b>";
      button.addEventListener("click", () => {
        locked = index;
        renderReading(lastFrequency);
      });
      return button;
    }));
    highlightStrings();
  }
  function renderReading(frequency) {
    lastFrequency = frequency;
    el("tuner-display").classList.remove("in-tune");
    el("tuner-needle").hidden = !frequency;
    if (!frequency) {
      matched = null;
      el("tuner-note").textContent = "—";
      el("tuner-frequency").textContent = tr("等待单音", "Waiting for a single note");
      el("tuner-target").textContent = targetText();
      el("tuner-direction").textContent = tr("等待拨弦", "Pluck a string");
      el("tuner-meter").setAttribute("aria-valuenow", "0");
      el("tuner-meter").setAttribute("aria-valuetext", tr("等待单音", "Waiting for a single note"));
      highlightStrings();
      return;
    }
    const midi = 69 + 12 * Math.log2(frequency / reference);
    const nearest = Math.round(midi);
    let target = nearest;
    if (el("tuner-mode").value === "guitar") {
      matched = locked ?? targets.reduce((best, note, index) =>
        Math.abs(note - midi) < Math.abs(targets[best] - midi) ? index : best, 0);
      target = targets[matched];
      el("tuner-target").textContent = tr((locked === null ? "自动 · " : "锁定 · ") + (6 - matched) + " 弦目标 " + tunerNoteName(target),
        (locked === null ? "Auto · " : "Locked · ") + "String " + (6 - matched) + " target " + tunerNoteName(target));
    } else {
      matched = null;
      el("tuner-target").textContent = tr("最近音 " + tunerNoteName(nearest) + " · A4 = " + reference + " Hz", "Nearest note " + tunerNoteName(nearest) + " · A4 = " + reference + " Hz");
    }
    const cents = 100 * (midi - target), inTune = Math.abs(cents) <= 5;
    const targetFrequency = reference * Math.pow(2, (target - 69) / 12);
    el("tuner-note").textContent = tunerNoteName(nearest);
    el("tuner-frequency").textContent = tr(frequency.toFixed(1) + " Hz · 目标 " + targetFrequency.toFixed(1) + " Hz", frequency.toFixed(1) + " Hz · Target " + targetFrequency.toFixed(1) + " Hz");
    el("tuner-direction").textContent = inTune ? tr("✓ 已调准", "✓ In tune")
      : tr((cents < 0 ? "← 偏低，调高 " : "偏高，调低 → ") + Math.abs(cents).toFixed(0) + " ¢", (cents < 0 ? "← Flat: tune up " : "Sharp: tune down → ") + Math.abs(cents).toFixed(0) + " ¢");
    el("tuner-display").classList.toggle("in-tune", inTune);
    el("tuner-needle").style.left = (50 + Math.max(-50, Math.min(50, cents)) * .9) + "%";
    el("tuner-meter").setAttribute("aria-valuenow", String(Math.round(Math.max(-50, Math.min(50, cents)))));
    el("tuner-meter").setAttribute("aria-valuetext", tr((cents < 0 ? "偏低 " : "偏高 ") + Math.abs(cents).toFixed(0) + " 音分", Math.abs(cents).toFixed(0) + (cents < 0 ? " cents flat" : " cents sharp")));
    highlightStrings();
  }
  function resetReading() {
    history = [];
    renderReading(null);
  }
  function stop(message = tr("麦克风已关闭。", "Microphone off.")) {
    request++;
    pending = active = false;
    cancelAnimationFrame(frame);
    source?.disconnect();
    source = analyser = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (context) void context.close().catch(() => {});
    context = null;
    el("tuner-start").textContent = tr("开启麦克风", "Enable microphone");
    el("tuner-status").textContent = message;
    setInputLevel(0);
    el("tuner-signal").textContent = tr("等待麦克风", "Waiting for microphone");
    resetReading();
  }
  async function start() {
    if (active || pending) return stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      el("tuner-status").textContent = tr("此浏览器无法使用麦克风，请从 HTTPS 网站打开调音器。", "Microphone access is unavailable. Open the tuner on the HTTPS website.");
      return;
    }
    const intent = ++request;
    pending = true;
    el("tuner-start").textContent = tr("取消开启", "Cancel microphone request");
    el("tuner-status").textContent = tr("请在浏览器提示中允许麦克风…", "Allow microphone access in the browser prompt…");
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      const localContext = new Audio();
      context = localContext;
      await localContext.resume();
      if (intent !== request) return;
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false
      });
      if (intent !== request) {
        localStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = localStream;
      stopMetronome();
      analyser = localContext.createAnalyser();
      analyser.fftSize = Math.max(2048, Math.min(32768, Math.pow(2, Math.ceil(Math.log2(localContext.sampleRate * .085)))));
      source = localContext.createMediaStreamSource(localStream);
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      active = true;
      pending = false;
      el("tuner-start").textContent = tr("停止麦克风", "Stop microphone");
      el("tuner-status").textContent = tr("正在听，请轻拨一根弦。", "Listening. Gently pluck one string.");
      localStream.getTracks().forEach((track) => track.addEventListener("ended", () => {
        if (stream === localStream) stop(tr("麦克风连接已结束，可重新开启。", "The microphone disconnected. You can enable it again."));
      }));
      lastFrame = 0;
      lastSignal = performance.now();
      function listen(time) {
        if (!active || intent !== request) return;
        if (time - lastFrame >= 50) {
          lastFrame = time;
          analyser.getFloatTimeDomainData(buffer);
          let energy = 0;
          for (let i = 0; i < buffer.length; i++) energy += buffer[i] * buffer[i];
          const rms = Math.sqrt(energy / buffer.length);
          const threshold = thresholds[el("tuner-sensitivity").value] ?? thresholds.high;
          setInputLevel((20 * Math.log10(Math.max(rms, 1e-8)) + 72) / 72 * 100);
          const frequency = estimateTunerPitch(buffer, localContext.sampleRate, threshold);
          el("tuner-signal").textContent = rms < threshold ? tr("输入较轻，可再靠近一点麦克风", "Quiet input. Move closer to the microphone.")
            : frequency ? tr("已捕捉到单音", "Single note detected") : tr("有声音，等待清晰的单音", "Sound detected. Waiting for a clear single note.");
          if (frequency) {
            if (history.length && Math.abs(12 * Math.log2(frequency / history.at(-1))) > .8) history = [];
            history.push(frequency);
            if (history.length > 3) history.shift();
            const ordered = [...history].sort((a,b) => a-b);
            renderReading(ordered[Math.floor(ordered.length / 2)]);
            lastSignal = time;
          } else if (time - lastSignal > 700) resetReading();
        }
        frame = requestAnimationFrame(listen);
      }
      frame = requestAnimationFrame(listen);
    } catch (error) {
      if (intent !== request) return;
      const messages = {
        NotAllowedError: tr("麦克风未获允许。请在浏览器的网站权限中允许麦克风后重试。", "Microphone permission denied. Allow the microphone in this site's browser permissions and try again."),
        NotFoundError: tr("没有找到麦克风，请连接麦克风后重试。", "No microphone found. Connect a microphone and try again."),
        NotReadableError: tr("暂时无法读取麦克风，请检查设备是否可用。", "Cannot read the microphone. Check that the device is available.")
      };
      stop(messages[error.name] || tr("麦克风开启失败，请检查浏览器权限和音频设备。", "Could not start the microphone. Check browser permissions and your audio device."));
    }
  }
  for (const [id, label, notes, english] of presets) {
    const pitches = notes.map(tunerNoteName).join(" ");
    el("tuner-preset").append(new Option(tr(label + " · " + pitches, english + " · " + pitches), id));
  }
  el("tuner-preset").append(new Option(tr("自定义六弦目标", "Custom six-string targets"), "custom"));
  el("tuner-preset").value = "standard";
  el("tuner-preset").addEventListener("change", () => {
    const id = el("tuner-preset").value;
    el("tuner-custom").hidden = id !== "custom";
    if (id !== "custom") targets = [...presets.find((preset) => preset[0] === id)[2]];
    locked = null;
    resetReading();
    renderStrings();
  });
  el("tuner-custom").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      targets = parseTunerTargets(el("tuner-notes").value);
      locked = null;
      resetReading();
      renderStrings();
      el("tuner-notes").removeAttribute("aria-invalid");
      el("tuner-custom-status").textContent = tr("已应用六弦目标。", "Six-string targets applied.");
      el("tuner-custom-status").classList.remove("error");
    } catch (error) {
      el("tuner-notes").setAttribute("aria-invalid", "true");
      el("tuner-custom-status").textContent = error.message;
      el("tuner-custom-status").classList.add("error");
    }
  });
  el("tuner-mode").addEventListener("change", () => {
    el("tuner-guitar").hidden = el("tuner-mode").value !== "guitar";
    resetReading();
  });
  el("tuner-auto").addEventListener("click", () => { locked = null; renderReading(lastFrequency); });
  el("tuner-reference").addEventListener("change", () => {
    const value = Number(el("tuner-reference").value);
    reference = Number.isFinite(value) && value >= 430 && value <= 450 ? value : 440;
    el("tuner-reference").value = reference;
    history = [];
    renderReading(lastFrequency);
  });
  el("tuner-start").addEventListener("click", start);
  el("tuner-sensitivity").addEventListener("change", resetReading);
  document.addEventListener("visibilitychange", () => { if (document.hidden && (active || pending)) stop(tr("已暂停收音，回到页面后可重新开启。", "Microphone paused. Enable it again when you return to this page.")); });
  window.addEventListener("pagehide", () => { if (active || pending) stop(); });
  renderStrings();
})();
