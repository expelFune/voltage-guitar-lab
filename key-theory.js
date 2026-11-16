"use strict";

(() => {
  const host = document.getElementById("key-theory");
  if (!host) return;
  const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const t = (zh, en) => escape(tr(zh, en));
  const paragraph = (zh, en) => `<p>${t(zh, en)}</p>`;
  const steps = [2, 2, 1, 2, 2, 2, 1];
  const keys = {
    C: { root: 0, zh: "C 大调", en: "C major", notes: ["C", "D", "E", "F", "G", "A", "B", "C"], midi: [48, 50, 52, 53, 55, 57, 59, 60] },
    D: { root: 2, zh: "D 大调", en: "D major", notes: ["D", "E", "F♯", "G", "A", "B", "C♯", "D"], midi: [50, 52, 54, 55, 57, 59, 61, 62] }
  };
  let selected = "C";
  function card(number, zh, en, subZh, subEn, content, id) {
    return `<details class="basics-topic key-theory-topic" id="${id}"><summary><span class="basics-number">${number}</span><span><strong>${t(zh, en)}</strong><small>${t(subZh, subEn)}</small></span></summary><div class="basics-body">${content}</div></details>`;
  }

  const keyCard = card("05", "C 调、D 调：调到底是什么？", "C and D: what does a key mean?", "先找到音乐的“家”，再认识调式。", "Find the music’s home, then its mode.",
    paragraph("听一段音乐时，有些音或和弦会让人感觉稳定、像回到了家。这个中心音叫主音；旋律和和声围绕它组织起来，就形成了调性的感觉。主音不一定是歌曲的第一个音。", "A note or chord can feel stable, as though the music has come home. The central note is the tonic; melody and harmony organized around it create a sense of key. The tonic need not be the first note of a song.") +
    `<div class="basics-facts key-theory-comparison"><div class="basics-fact"><h3>${t("C 大调", "C major")}</h3>${paragraph("以 C 为主音，采用大调的音阶和和声关系。", "C is the tonic, with major-scale and harmonic relationships.")}</div><div class="basics-fact"><h3>${t("D 大调", "D major")}</h3>${paragraph("以 D 为主音，保留同样的大调关系，整体移高一个全音。", "D is the tonic. The same major relationships move up a whole tone.")}</div></div>` +
    paragraph("日常说“C 调”时，常常省略了调式；完整地说，还要分 C 大调、C 小调等。这里先比较 C 大调与 D 大调。偶尔出现调外音，也不一定已经换了调，还要听整段音乐的归属。", "People sometimes shorten a key name to “C,” but a full description also distinguishes C major, C minor, and so on. Here we compare C major and D major. An occasional outside note does not necessarily change the key; listen to the wider context.") +
    `<div class="basics-tip">${t("C 大调是一种调性，C 大三和弦是一组音 C–E–G；一首 C 大调的歌可以使用很多和弦。调性也不同于调弦：保持 E A D G B E 标准调弦，同样能弹 C 大调、D 大调。", "C major is a key; a C major chord is the group C–E–G. Music in C major can use many chords. A key is also different from tuning: standard E A D G B E tuning can play both C major and D major.")}</div>`,
    "key-meaning-card"
  );

  const majorCard = card("06", "自然大调：同一套距离，换一个主音", "The major scale: one pattern, different tonics", "全、全、半、全、全、全、半。", "Whole, whole, half, whole, whole, whole, half.",
    paragraph("自然大调就是常见的大调音阶。它有 7 个不同音级，再回到高一个八度的主音；相邻音级按固定的全音、半音距离排列。", "The natural major scale is the familiar major scale. It has seven different scale degrees, then returns to the tonic an octave higher, with a fixed pattern of whole and half steps.") +
    `<div class="basics-tip">${t("从主音向上：全–全–半–全–全–全–半，也就是 2–2–1–2–2–2–1 个半音。换主音时，这套距离保持不变。", "Upward from the tonic: whole–whole–half–whole–whole–whole–half, or 2–2–1–2–2–2–1 semitones. The distances stay the same when the tonic changes.")}</div>` +
    `<div class="actions key-scale-controls" role="group" aria-label="${t("选择大调例子", "Choose a major-key example")}"><button type="button" class="secondary" data-major-key="C" aria-pressed="true">${t("C 大调", "C major")}</button><button type="button" class="secondary" data-major-key="D" aria-pressed="false">${t("D 大调", "D major")}</button></div><div class="key-scale-keyboard" id="key-scale-keyboard"></div><p class="hint" id="key-scale-legend"></p><div class="key-scale-scroll" tabindex="0" aria-label="${t("大调音阶音级与步距，可横向滚动", "Major scale degrees and steps; scroll horizontally")}"><ol class="key-scale-sequence" id="key-scale-sequence"></ol></div><p id="key-scale-explanation"></p><div class="basics-tip" id="key-scale-degrees"></div><div class="actions"><button type="button" class="primary" id="key-scale-play" aria-pressed="false"></button><button type="button" class="secondary" id="key-scale-board"></button></div><p class="key-theory-status" id="key-scale-status" role="status">${t("选择 C 或 D，比较主音、黑键与音级，再听一遍。", "Choose C or D, compare the tonic, black keys, and degrees, then listen.")}</p>` +
    paragraph("“自然大调”并不表示只能弹白键。C 大调刚好全用白键；D 大调需要 F♯、C♯，才能保留这套距离。音名要按字母顺序排列，每个字母各用一次，所以这里写 F♯、C♯，而不是 G♭、D♭。", "“Natural major” does not mean white keys only. C major happens to use white keys; D major needs F♯ and C♯ to keep the same spacing. Each letter appears once in alphabetical order, so these notes are spelled F♯ and C♯, rather than G♭ and D♭.") +
    `<div class="basics-tip">${t("音阶音级按调的主音来数：在 C 大调中，C 是 1；在 D 大调中，D 是 1。和弦公式里的 1 则是那一个和弦的根音，两种“1”未必是同一个音。", "Scale degrees count from the key’s tonic: C is 1 in C major, while D is 1 in D major. In a chord formula, 1 means that chord’s root; it need not be the same note as the key’s tonic.")}</div>`,
    "major-scale-card"
  );

  host.className = "theory-panel key-theory-panel";
  host.innerHTML = `<div class="key-theory-heading"><h3>${t("从音程走到调性", "From intervals to keys")}</h3>${paragraph("把半音与全音排成固定图案，就能理解 C 大调为什么不同于 D 大调。", "Arrange whole and half steps in a pattern to understand C major and D major.")}</div><div class="basics-topics">${keyCard}${majorCard}</div><p class="basics-references"><span>${t("资料参考：", "Further reading: ")}</span><a href="https://learningmusic.ableton.com/advanced-topics/building-major-scales.html" target="_blank" rel="noopener noreferrer">${t("Ableton · 构造大调音阶", "Ableton · Building major scales")}</a> · <a href="https://open-musictheory.github.io/docs/fundamentals/scales/" target="_blank" rel="noopener noreferrer">${t("Open Music Theory · 音阶与音级", "Open Music Theory · Scales and scale degrees")}</a></p>`;

  const button = document.getElementById("key-scale-play"), status = document.getElementById("key-scale-status");
  let generation = 0, bus, timer, playing = false, ownAnnouncement = false;
  function renderSelection() {
    const key = keys[selected], first = key.midi[0], last = key.midi.at(-1);
    host.querySelectorAll("[data-major-key]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.majorKey === selected)));
    const white = [[48,"C3"],[50,"D3"],[52,"E3"],[53,"F3"],[55,"G3"],[57,"A3"],[59,"B3"],[60,"C4"],[62,"D4"]];
    const black = [[49,1,"C♯3"],[51,2,"D♯3"],[54,4,"F♯3"],[56,5,"G♯3"],[58,6,"A♯3"],[61,8,"C♯4"]];
    const fill = (midi,isBlack) => midi===first||midi===last ? "#d8fb7c" : key.midi.includes(midi) ? (isBlack ? "#ffd17b" : "#bca9fb") : (isBlack ? "#2a2432" : "#e7e2ee");
    const whites = white.map(([midi,name],i)=>`<g data-key-scale-midi="${midi}"><rect x="${i*70+1}" y="10" width="68" height="168" rx="5" fill="${fill(midi,false)}" stroke="#a79bb3"/><text x="${i*70+35}" y="149" text-anchor="middle" font-size="22" font-weight="700" fill="#292132">${name.replace(/\d/,"")}</text><text x="${i*70+35}" y="170" text-anchor="middle" font-size="13" fill="#514759">${name}</text></g>`).join("");
    const blacks = black.map(([midi,boundary,name])=>`<g data-key-scale-midi="${midi}"><rect x="${boundary*70-21}" y="10" width="42" height="105" rx="4" fill="${fill(midi,true)}" stroke="#66596f"/><text x="${boundary*70}" y="97" text-anchor="middle" font-size="16" fill="${key.midi.includes(midi)?'#292132':'#f6f4fb'}">${name.replace(/\d/,"")}</text></g>`).join("");
    document.getElementById("key-scale-keyboard").innerHTML=`<svg viewBox="0 0 630 188" role="img" aria-label="${t(key.zh+"钢琴示意，主音为"+selected+"，标出音阶中的琴键。",key.en+" piano diagram: "+selected+" is the tonic, with the scale’s keys highlighted.")}" xmlns="http://www.w3.org/2000/svg">${whites}${blacks}</svg>`;
    document.getElementById("key-scale-legend").textContent=tr("本图标出本次上行的 8 个音：绿色主音，紫色其他白键，金色升音。","The 8 notes played upward: green tonic, purple other white keys, gold raised notes.");
    document.getElementById("key-scale-sequence").innerHTML=key.notes.map((name,index)=>`<li${name.includes("♯")?' class="key-scale-accidental"':''}><small>${t(index===7?"音级 1′":"音级 "+(index+1),index===7?"Degree 1′":"Degree "+(index+1))}</small><strong>${name}</strong><span>${index<7?t(steps[index]===1?"半 · 1 半音":"全 · 2 半音",steps[index]===1?"Half · 1 semitone":"Whole · 2 semitones"):t("高八度主音","Tonic, octave up")}${index<7?' →':''}</span></li>`).join("");
    document.getElementById("key-scale-explanation").textContent=selected==="C"?tr("C 大调：C D E F G A B C。E→F、B→C 各相隔 1 个半音，其余相邻音级都相隔全音；因此不用升降号。","C major: C D E F G A B C. E→F and B→C are the two half-step positions; the other neighboring degrees are whole steps. No sharps or flats are needed."):tr("D 大调：D E F♯ G A B C♯ D。E→F 只有半音，要改成 E→F♯ 的全音；B→C 也只有半音，要升成 C♯。这样 F♯→G、C♯→D 正好成为第 3–4、7–1 音级间的半音。","D major: D E F♯ G A B C♯ D. E→F is only a half step, so use F♯ to make a whole step. B→C is also only a half step, so raise C to C♯. F♯→G and C♯→D then give the required half steps between degrees 3–4 and 7–1.");
    document.getElementById("key-scale-degrees").textContent=selected==="C"?tr("在 C 大调里：1=C、2=D、3=E、4=F、5=G、6=A、7=B。字母是音名，数字是在这个调里的位置。","In C major: 1=C, 2=D, 3=E, 4=F, 5=G, 6=A, 7=B. Letters name notes; numbers give their positions in this key."):tr("在 D 大调里：1=D、2=E、3=F♯、4=G、5=A、6=B、7=C♯。例如同一个 A，在 C 大调是 6，在 D 大调是 5。","In D major: 1=D, 2=E, 3=F♯, 4=G, 5=A, 6=B, 7=C♯. The same A is degree 6 in C major and degree 5 in D major.");
    button.textContent=playing?tr("■ 停止试听","■ Stop demo"):tr("▷ 听 "+key.zh+"音阶","▷ Hear the "+key.en+" scale");
    button.setAttribute("aria-pressed",String(playing));
    document.getElementById("key-scale-board").textContent=tr("在指板上看 "+key.zh,"See "+key.en+" on the fretboard");
  }

  function stop(showStatus=false) {
    generation++;
    clearTimeout(timer);
    if(bus){const old=bus;bus=undefined;old.gain.cancelScheduledValues(audio.currentTime);old.gain.setTargetAtTime(0,audio.currentTime,.008);setTimeout(()=>old.disconnect(),40);}
    playing=false;
    renderSelection();
    if(showStatus)status.textContent=tr("试听已停止。","Demo stopped.");
  }
  async function playScale() {
    if(playing){stop(true);return;}
    stop();
    const request=generation,key=keys[selected];
    playing=true;renderSelection();
    status.textContent=tr("正在准备试听，可以再点一次停止。","Preparing audio. Press again to stop.");
    if(typeof window.stopMetronome==="function")window.stopMetronome();
    if(typeof window.stopScalePlayback==="function")window.stopScalePlayback();
    let ready;
    ownAnnouncement=true;
    try{document.dispatchEvent(new CustomEvent("guitar-effects-play"));ready=unlockAudio();}finally{ownAnnouncement=false;}
    const unlocked=await ready;
    if(request!==generation||document.hidden)return;
    if(!unlocked){stop();status.textContent=tr("此浏览器暂时无法播放示范音。","Audio playback is unavailable in this browser.");return;}
    bus=audio.createGain();bus.gain.value=.85;bus.connect(audio.destination);
    const start=audio.currentTime+.02;
    key.midi.forEach((midi,index)=>pluck(midi,start+index*.36,.15,bus));
    status.textContent=tr("正在试听："+key.zh+"，从主音到高八度主音。","Playing "+key.en+", from the tonic to the tonic an octave higher.");
    timer=setTimeout(()=>{if(request!==generation)return;stop();status.textContent=tr("音阶试听结束，换一个调比较同样的步距。","Scale finished. Switch keys to compare the same spacing.");},3500);
  }
  host.querySelectorAll("[data-major-key]").forEach(item=>item.addEventListener("click",()=>{stop();selected=item.dataset.majorKey;renderSelection();status.textContent=tr("已选择 "+keys[selected].zh+"。可以试听或在指板上查看。","Selected "+keys[selected].en+". Listen or view it on the fretboard.");}));
  button.addEventListener("click",()=>{void playScale();});
  document.getElementById("key-scale-board").addEventListener("click",()=>{
    stop();
    document.querySelector('[data-mode="scale"]')?.click();
    const root=document.getElementById("root"),scale=document.getElementById("scale");
    if(root&&scale){scale.value="major";scale.dispatchEvent(new Event("change",{bubbles:true}));root.value=String(keys[selected].root);root.dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("lab")?.scrollIntoView({block:"start"});}
  });
  host.querySelectorAll("details").forEach(details=>details.addEventListener("toggle",()=>{if(!details.open&&playing&&details.contains(button))stop(true);}));
  document.addEventListener("languagechange",renderSelection);
  document.addEventListener("guitar-instrument-play",()=>{if(!ownAnnouncement&&playing)stop(true);});
  document.addEventListener("guitar-effects-play",()=>{if(!ownAnnouncement&&playing)stop(true);});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)stop(true);});
  window.addEventListener("pagehide",()=>stop());
  renderSelection();
})();
