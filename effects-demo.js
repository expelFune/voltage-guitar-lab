"use strict";

(() => {
  const panel = document.getElementById("effects-listen");
  if (!panel) return;
  const el = id => document.getElementById(id);
  const presets = {
    overdrive: ["过载", "Overdrive", "过载：听音头增加的颗粒，以及尾音的饱和感。", "Overdrive: listen for grit in the attack and saturation in the sustain."],
    distortion: ["失真", "Distortion", "失真：听更密的谐波和更紧实、持续的声音。", "Distortion: listen for denser harmonics and a more compressed, sustained sound."],
    fuzz: ["法兹", "Fuzz", "法兹：听粗粝、毛茸茸的边缘，与过载的质感作比较。", "Fuzz: listen for coarse, fuzzy edges and compare their texture with overdrive."],
    chorus: ["合唱", "Chorus", "合唱：听轻微的音高摆动，像多一把吉他一起弹。", "Chorus: listen for gentle pitch movement, like a second guitar playing along."],
    delay: ["延迟", "Delay", "延迟：听每个音后面间隔出现的回声，特别留意停顿处。", "Delay: listen for spaced echoes after each note, especially in the gaps."],
    reverb: ["混响", "Reverb", "混响：听围绕音符的空间感，以及停弹后慢慢散开的尾音。", "Reverb: listen for space around the notes and the tail fading after the playing stops."]
  };
  let selected = "overdrive", side = "effect", active = false, preparing = false;
  let request = 0, engine, enginePromise, status = "ready";
  try {
    const saved = localStorage.getItem("voltage-effects-volume");
    if (saved !== null && Number.isFinite(Number(saved)) && Number(saved) >= 0 && Number(saved) <= 100) el("effects-volume").value = saved;
  } catch { /* Volume also works without storage. */ }
  const effect = () => side === "clean" ? "clean" : selected;
  const volume = () => Number(el("effects-volume").value) / 100;

  function render() {
    const preset = presets[selected];
    panel.classList.toggle("is-playing", active && !preparing);
    panel.classList.toggle("is-dry", side === "clean");
    panel.setAttribute("aria-busy", String(preparing));
    panel.querySelectorAll("[data-effect-preset]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.effectPreset === selected)));
    panel.querySelectorAll("[data-effect-side]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.effectSide === side)));
    el("effects-wet-label").textContent = tr("效果 · " + preset[0], "Effect · " + preset[1]);
    el("effects-listen-hint").textContent = tr(preset[2], preset[3]);
    el("effects-volume-value").value = el("effects-volume").value + "%";
    el("effects-play").textContent = active ? tr("■ 停止试听", "■ Stop demo") : tr("▶ 开始试听", "▶ Play demo");
    el("effects-live").lastElementChild.textContent = preparing ? tr("准备音色…", "Preparing sounds…") : active ? (side === "clean" ? tr("A · 原声", "A · Dry") : tr("B · 效果", "B · Effect")) : tr("准备试听", "Ready to listen");
    let message;
    if (preparing) message = tr("正在准备音色，可以随时停止。", "Preparing sounds. You can stop at any time.");
    else if (active) message = side === "clean" ? tr("正在试听 · A 清音原声", "Playing · A: dry clean") : tr("正在试听 · B " + preset[0], "Playing · B: " + preset[1]);
    else if (status === "error") message = tr("暂时无法播放，请再点一次试听，或检查浏览器声音设置。", "Playback is unavailable. Try again or check your browser's sound settings.");
    else if (status === "ended") message = tr("本段已结束。可以换一个效果再听。", "The phrase has ended. Choose another effect to compare.");
    else if (status === "stopped") message = tr("试听已停止。", "Demo stopped.");
    else message = tr("点播放，再切换 A / B 对比。", "Press play, then switch A / B to compare.");
    el("effects-demo-status").textContent = message;
  }

  function stop() {
    ++request;
    active = false;
    preparing = false;
    status = "stopped";
    engine?.stop();
    render();
  }

  async function start() {
    const token = ++request;
    active = true;
    preparing = true;
    status = "ready";
    render();
    try {
      // Unlock from the click before waiting for synthesized audio buffers.
      enginePromise ||= window.GuitarEffectsAudio.create().then(value => { engine = value; return value; }).catch(error => { enginePromise = undefined; throw error; });
      await enginePromise;
      if (token !== request) return;
      if (typeof window.stopMetronome === "function") window.stopMetronome();
      if (typeof window.stopScalePlayback === "function") window.stopScalePlayback();
      document.dispatchEvent(new CustomEvent("guitar-effects-play"));
      await engine.play({
        phrase: el("effects-phrase").value,
        effect: effect(),
        volume: volume(),
        onEnded() {
          if (token !== request || !active) return;
          if (el("effects-repeat").checked && !document.hidden) { void start(); return; }
          active = false;
          preparing = false;
          status = "ended";
          render();
        }
      });
      if (token !== request) return;
      // Controls can change while the first buffers are being prepared.
      engine.setEffect(effect());
      engine.setVolume(volume());
      preparing = false;
      render();
    } catch {
      if (token !== request) return;
      engine?.stop();
      active = false;
      preparing = false;
      status = "error";
      render();
    }
  }

  panel.querySelectorAll("[data-effect-preset]").forEach(button => button.addEventListener("click", () => {
    selected = button.dataset.effectPreset;
    side = "effect";
    engine?.setEffect(effect());
    render();
  }));
  panel.querySelectorAll("[data-effect-side]").forEach(button => button.addEventListener("click", () => {
    side = button.dataset.effectSide;
    engine?.setEffect(effect());
    if (!active) void start();
    else render();
  }));
  el("effects-play").addEventListener("click", () => { if (active) stop(); else void start(); });
  el("effects-phrase").addEventListener("change", () => { if (active) void start(); });
  el("effects-volume").addEventListener("input", () => {
    engine?.setVolume(volume());
    el("effects-volume-value").value = el("effects-volume").value + "%";
    try { localStorage.setItem("voltage-effects-volume", el("effects-volume").value); } catch {}
  });
  el("effects").addEventListener("toggle", () => { if (!el("effects").open && active) stop(); });
  document.addEventListener("languagechange", render);
  document.addEventListener("visibilitychange", () => { if (document.hidden && active) stop(); });
  window.addEventListener("pagehide", stop);
  document.addEventListener("guitar-instrument-play", () => { if (active) stop(); });
  render();
})();
