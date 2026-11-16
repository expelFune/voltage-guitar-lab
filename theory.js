"use strict";

(() => {
  const host = document.getElementById("chord-theory");
  if (!host) return;
  const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const t = (zh, en) => escape(tr(zh, en));
  const paragraph = (zh, en) => `<p>${t(zh, en)}</p>`;
  const demos = new Map();
  function listen(id, zh, en, notes, together = false) {
    demos.set(id, { zh, en, notes, together });
    return `<button type="button" class="secondary theory-listen" data-theory-demo="${id}" aria-pressed="false">${t(zh, en)}</button>`;
  }
  const flow = items => `<div class="basics-flow theory-flow">${items.map(item => `<span><b>${item[0]}</b><br><small>${t(item[1], item[2])}</small></span>`).join('<i aria-hidden="true">→</i>')}</div>`;
  function card(number, zh, en, subZh, subEn, content) {
    return `<details class="basics-topic theory-topic"><summary><span class="basics-number">${number}</span><span><strong>${t(zh, en)}</strong><small>${t(subZh, subEn)}</small></span></summary><div class="basics-body">${content}</div></details>`;
  }

  const intervals = card("01", "半音、全音和音程是什么？", "What are semitones, tones, and intervals?", "先把指板上的距离听出来。", "Hear the distances on the fretboard.",
    paragraph("音程是两个音之间的高低距离。它们可以先后响，也可以同时响。", "An interval is the distance in pitch between two notes. You can hear them one after the other or together.") +
    flow([["C3", "5 弦 3 品", "String 5, fret 3"], ["C♯3", "5 弦 4 品", "String 5, fret 4"], ["D3", "5 弦 5 品", "String 5, fret 5"]]) +
    paragraph("同一根弦向琴桥方向移动 1 品，升高 1 个半音；移动 2 品，升高 1 个全音。上图每个箭头是 1 个半音。E→F、B→C 也只相隔半音。", "Move one fret toward the bridge on the same string to rise one semitone (half step); two frets make one tone (whole step). Each arrow above is a semitone. E–F and B–C are also a semitone apart.") +
    `<div class="actions">${listen("semitone", "▷ 半音 C–C♯", "▷ Semitone C–C♯", [48, 49])}${listen("tone", "▷ 全音 C–D", "▷ Whole tone C–D", [48, 50])}</div>` +
    `<div class="basics-tip">${t("音程名还要数音名字母：C–D 是二度，C–E 是三度；再结合实际半音距离，区分大、小、纯等性质。例如 C–E 是大三度（4 半音），C–E♭ 是小三度（3 半音）。", "Interval names also count note letters: C–D is a second and C–E a third. The semitone distance then helps identify major, minor, or perfect quality. C–E is a major third (4 semitones); C–E♭ is a minor third (3).")}</div>`
  );

  const octave = card("02", "什么是八度？同名就是同一个音吗？", "What is an octave? Are matching names the same pitch?", "C3 和 C4 都是 C，但音高不同。", "C3 and C4 are both C, at different pitches.",
    flow([["C3", "5 弦 3 品", "String 5, fret 3"], ["+12", "升高 12 个半音", "12 semitones higher"], ["C4", "5 弦 15 品", "String 5, fret 15"]]) +
    paragraph("升高一个八度，就是升高 12 个半音，频率变成原来的 2 倍。同一根弦相差 12 品的两个音，正好相差一个八度。", "An octave up spans 12 semitones and doubles the frequency. Two notes 12 frets apart on the same string are an octave apart.") +
    paragraph("“八度”的八，来自把起点和终点都算进 C D E F G A B C 这 8 个音名位置，不是 8 个半音或 8 品。C3、C4 音名相同；两个位置若都弹 C4，才是相同音高。", "The name counts eight note-letter positions, including both ends: C D E F G A B C. It does not mean eight semitones or eight frets. C3 and C4 share a note name; two positions that both play C4 share the same pitch.") +
    `<div class="actions">${listen("octave", "▷ 听 C3 → C4，再一起响", "▷ Hear C3 → C4, then together", [48, 60])}</div>` +
    `<div class="basics-tip">${t("找音练习中，“找 C”可以接受不同八度的 C；“找相同音高”则要连 C 后面的八度数字也一致。", "In note finding, “find C” can accept C in any octave. “Find the same pitch” also requires the octave number after C to match.")}</div>`
  );

  const openStrings = [
    [6, "E2", 40, 5, "A2", 45],
    [5, "A2", 45, 4, "D3", 50],
    [4, "D3", 50, 3, "G3", 55],
    [3, "G3", 55, 2, "B3", 59],
    [2, "B3", 59, 1, "E4", 64]
  ];
  const strings = card("03", "吉他相邻两根弦，差几度？", "How far apart are neighboring guitar strings?", "标准调弦：从粗到细，E A D G B E。", "Standard tuning, thick to thin: E A D G B E.",
    paragraph("第 6 弦最粗、音最低，第 1 弦最细、音最高。标准空弦依次是 E2、A2、D3、G3、B3、E4；下面都从较低的音向较高的音计算。", "String 6 is the thickest and lowest; string 1 is the thinnest and highest. Their open pitches are E2, A2, D3, G3, B3, E4. Each interval below is measured upward.") +
    `<div class="theory-string-rows">${openStrings.map(([lowString, lowName, lowMidi, highString, highName, highMidi], index) => {
      const third = index === 3;
      return `<div class="theory-string-row${third ? ' theory-string-exception' : ''}"><strong>${lowString} / ${lowName} → ${highString} / ${highName}</strong><span>${third ? t("大三度 · 4 半音", "Major third · 4 semitones") : t("纯四度 · 5 半音", "Perfect fourth · 5 semitones")}</span>${listen("strings-" + index, "▷ 听 " + lowName + "–" + highName, "▷ Hear " + lowName + "–" + highName, [lowMidi, highMidi])}</div>`;
    }).join("")}</div>` +
    `<div class="basics-tip">${t("记住唯一的例外：3 弦 G → 2 弦 B 是大三度，其余相邻空弦都是纯四度。同一品上的相邻弦也保持这个关系；指型跨过 G、B 两弦时，常需要补偿这一品的差距。改变调弦后，要重新计算。", "Remember the exception: string 3 G → string 2 B is a major third; the other neighboring open strings are perfect fourths. This also holds at matching frets. Shapes crossing G and B often need a one-fret adjustment. Recalculate after changing the tuning.")}</div>`
  );

  const chord = card("04", "和弦是什么？1、3、5 又是什么？", "What is a chord, and what do 1, 3, 5 mean?", "先认根音、三音、五音，再看指法。", "Know the root, third, and fifth before the fingering.",
    paragraph("常见和弦通常组合至少 3 种不同的音。最基本的三和弦由根音、三音、五音构成，可以同时弹响，也可以把组成音分解弹奏。", "Common chords usually combine at least three different notes. A basic triad contains a root, third, and fifth; play them together or as an arpeggio.") +
    `<div class="basics-facts theory-chord-examples"><div class="basics-fact"><h3>${t("C 大三和弦", "C major triad")}</h3><p><b>C · E · G</b></p><p>1 · 3 · 5</p>${paragraph("从根音 C 起：0、4、7 个半音。", "From root C: 0, 4, 7 semitones.")}${listen("major-triad", "▷ 听 C 大三和弦", "▷ Hear C major", [48, 52, 55], true)}</div><div class="basics-fact"><h3>${t("Cm 小三和弦", "Cm minor triad")}</h3><p><b>C · E♭ · G</b></p><p>1 · ♭3 · 5</p>${paragraph("把 E 降低半音：距 C 为 0、3、7 半音。", "Lower E by a semitone: 0, 3, 7 semitones from C.")}${listen("minor-triad", "▷ 听 Cm 小三和弦", "▷ Hear C minor", [48, 51, 55], true)}</div></div>` +
    `<div class="basics-tip">${t("这里的 1、3、5 是以根音的大调为参照的音级，不是第几品、也不是第几根弦；♭3 表示把三音降低半音。", "Here 1, 3, and 5 are degrees referenced to the root’s major scale, not fret or string numbers. ♭3 lowers the third by a semitone.")}</div>` +
    paragraph("扫响 5、6 根弦时，可以在不同八度重复和弦组成音。改变排列是不同的配音；让三音或五音成为最低音，就是转位。常说的 C5 强力和弦只用 C、G 两种音名，省略三音，所以不区分大、小三和弦。", "Strumming five or six strings can repeat chord tones in different octaves. Rearranging them changes the voicing; placing the third or fifth lowest creates an inversion. A C5 power chord uses C and G without a third, so it does not specify major or minor.")
  );

  host.className = "theory-panel";
  host.innerHTML = `<div class="theory-heading"><h3>${t("看和弦之前，先懂一点乐理", "A little theory before the chord shapes")}</h3>${paragraph("点开需要的解释，边看边听；不必先背完才能弹。", "Open an explanation and listen along. You can play while learning the ideas.")}</div><div class="basics-topics">${intervals}${octave}${strings}${chord}</div><div class="theory-player"><span id="theory-status" role="status">${t("点击卡片中的试听按钮，听听音之间的关系。", "Use the listening buttons in the cards to hear the relationships.")}</span></div><p class="basics-references"><span>${t("资料参考：", "Further reading: ")}</span><a href="https://musictheory.pugetsound.edu/mt21c/IntervalsIntroduction.html" target="_blank" rel="noopener noreferrer">${t("Puget Sound · 音程", "Puget Sound · Intervals")}</a> · <a href="https://musictheory.pugetsound.edu/mt21c/TriadsIntroduction.html" target="_blank" rel="noopener noreferrer">${t("Puget Sound · 三和弦", "Puget Sound · Triads")}</a> · <a href="https://www.fender.com/articles/setup/standard-tuning-how-eadgbe-came-to-be" target="_blank" rel="noopener noreferrer">${t("Fender · 标准调弦", "Fender · Standard tuning")}</a></p>`;

  const status = document.getElementById("theory-status");
  let generation = 0, bus, activeButton, endTimer, ownAnnouncement = false;
  function stop(showStatus = false) {
    generation++;
    clearTimeout(endTimer);
    if (bus) {
      const old = bus;
      bus = undefined;
      const time = audio.currentTime;
      old.gain.cancelScheduledValues(time);
      old.gain.setTargetAtTime(0, time, .008);
      setTimeout(() => old.disconnect(), 40);
    }
    activeButton?.setAttribute("aria-pressed", "false");
    activeButton = undefined;
    if (showStatus) status.textContent = tr("试听已停止。", "Demo stopped.");
  }
  async function play(button) {
    if (activeButton === button) { stop(true); return; }
    stop();
    const current = generation, demo = demos.get(button.dataset.theoryDemo);
    activeButton = button;
    button.setAttribute("aria-pressed", "true");
    status.textContent = tr("正在准备试听，可以再点一次停止。", "Preparing audio. Press the button again to stop.");
    if (typeof window.stopMetronome === "function") window.stopMetronome();
    if (typeof window.stopScalePlayback === "function") window.stopScalePlayback();
    let ready;
    ownAnnouncement = true;
    try {
      // The existing notification also releases held piano/ear-training voices.
      document.dispatchEvent(new CustomEvent("guitar-effects-play"));
      ready = unlockAudio();
    } finally { ownAnnouncement = false; }
    const unlocked = await ready;
    if (current !== generation || document.hidden) return;
    if (!unlocked) {
      stop();
      status.textContent = tr("此浏览器暂时无法播放示范音。", "Audio playback is unavailable in this browser.");
      return;
    }
    bus = audio.createGain();
    bus.gain.value = .85;
    bus.connect(audio.destination);
    const start = audio.currentTime + .02;
    if (demo.together) demo.notes.forEach((note, index) => pluck(note, start + index * .025, .13, bus));
    else {
      demo.notes.forEach((note, index) => pluck(note, start + index * .57, .14, bus));
      demo.notes.forEach(note => pluck(note, start + 1.28, .11, bus));
    }
    status.textContent = tr("正在试听：" + demo.zh.replace(/^▷\s*/, ""), "Playing: " + demo.en.replace(/^▷\s*/, ""));
    endTimer = setTimeout(() => {
      if (current !== generation) return;
      stop();
      status.textContent = tr("试听结束，可以换一组比较。", "Demo finished. Try another comparison.");
    }, demo.together ? 1050 : 2250);
  }
  host.querySelectorAll("[data-theory-demo]").forEach(button => button.addEventListener("click", () => { void play(button); }));
  host.querySelectorAll("details").forEach(details => details.addEventListener("toggle", () => {
    if (!details.open && activeButton && details.contains(activeButton)) stop(true);
  }));
  document.addEventListener("guitar-instrument-play", () => { if (!ownAnnouncement) stop(Boolean(activeButton)); });
  document.addEventListener("guitar-effects-play", () => { if (!ownAnnouncement) stop(Boolean(activeButton)); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(Boolean(activeButton)); });
  window.addEventListener("pagehide", () => stop());
})();
