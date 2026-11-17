"use strict";
(() => {
  const host = document.getElementById("note-finder");
  if (!host) return;
  const note = midi => roots[mod(midi)];
  const ordinaryName = midi => note(midi) + (Math.floor(midi / 12) - 1);
  const choose = list => list[Math.floor(Math.random() * list.length)];
  const naturalPitches = [0, 2, 4, 5, 7, 9, 11];
  const scaleTypes = ["major", "minor", "majorPent", "minorPent"];
  let target, anchor, found = new Set(), solved = 0, credited = false, revealed = false, last = null;
  let orderedBase = null, orderedCount = 0, foundTones = new Set();
  let questionEpoch = 0, soundEpoch = 0, bus, soundTimer, demoPlaying = false, preparing = false, announcing = false;

  host.className = "section panel note-finder";
  host.innerHTML = `<div class="panel-heading"><div><div class="kicker">FRETBOARD / FIND THE NOTE</div><h2 id="finder-title"></h2></div><strong id="finder-target"></strong></div>
    <div class="board-controls"><label><span id="finder-mode-label"></span><select id="finder-mode"><option value="same"></option><option value="names"></option><option value="near"></option><option value="scale"></option></select></label><label><span id="finder-note-label"></span><select id="finder-note"><option value="auto"></option>${roots.map((name,index)=>`<option value="${index}">${name}</option>`).join("")}</select></label><label id="finder-exact-control"><input id="finder-exact" type="checkbox" checked><span id="finder-exact-label"></span></label><label><span id="finder-range-label"></span><select id="finder-range"><option value="12">0–12</option><option value="24">0–24</option></select></label><label><input id="finder-labels" type="checkbox"><span id="finder-labels-label"></span></label></div>
    <div class="board-controls finder-scale-controls" id="finder-scale-controls" hidden><label><span id="finder-scale-type-label"></span><select id="finder-scale-type">${scaleTypes.map(type=>`<option value="${type}"></option>`).join("")}</select></label><label><span id="finder-scale-goal-label"></span><select id="finder-scale-goal"><option value="ordered"></option><option value="tones"></option><option value="positions"></option></select></label></div>
    <p id="finder-help" class="hint"></p><div class="actions"><button id="finder-new" class="primary" type="button"></button><button id="finder-listen" class="secondary" type="button"></button><button id="finder-reveal" class="secondary" type="button"></button><button id="finder-retry" class="secondary" type="button" hidden></button></div>
    <p id="finder-reference" class="finder-reference"></p><div id="finder-scale-progress" class="finder-scale-progress" hidden></div><div class="board-scroll" tabindex="0"><div id="finder-board" class="fretboard"></div></div><p id="finder-status" role="status"></p><p id="finder-score" class="hint"></p><details class="finder-tip"><summary id="finder-tip-title"></summary><p id="finder-tip-text"></p><a href="#chord-theory" id="finder-theory-link"></a></details>`;

  const el = id => document.getElementById("finder-" + id);
  const mode = () => el("mode").value;
  const isScale = () => mode() === "scale";
  const goal = () => el("scale-goal").value;
  const tonic = () => mod(target);
  const scale = () => scales[el("scale-type").value];
  const scaleIndex = midi => scale().intervals.indexOf(mod(midi - tonic()));
  const scaleSteps = () => [...scale().intervals, 12];
  const key = (string, fret) => string + ":" + fret;
  const positionIn = (cell, english) => english ? "String " + (6 - cell.string) + " · Fret " + cell.fret : (6 - cell.string) + " 弦 · " + cell.fret + " 品";
  const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  function cells() {
    const all = [];
    tuning.forEach((open,string) => { for (let fret = 0; fret <= Number(el("range").value); fret++) all.push({ string, fret, midi: open + fret, key: key(string,fret) }); });
    return all;
  }
  const inArea = cell => mode() !== "near" || (Math.abs(cell.string - anchor.string) <= 1 && Math.abs(cell.fret - anchor.fret) <= 3);
  const isAnchor = cell => ["same", "near"].includes(mode()) && cell.key === anchor.key;
  function matches(cell) {
    if (isScale()) return scaleIndex(cell.midi) >= 0;
    return inArea(cell) && !isAnchor(cell) && (mode() === "same" && el("exact").checked ? cell.midi === target : mod(cell.midi) === mod(target));
  }
  const answers = () => cells().filter(matches);
  function scaleNote(index) { return spelling(tonic(), scale().intervals[index], scale().degrees[index], roots[tonic()]); }
  function pitchName(midi) {
    if (!isScale() || scaleIndex(midi) < 0) return ordinaryName(midi);
    const text = scaleNote(scaleIndex(midi));
    let octave = Math.floor(midi / 12) - 1;
    const letter = "CDEFGAB".indexOf(text[0]);
    const accidental = [...text.slice(1)].reduce((sum, character) => sum + (character === "♯" ? 1 : character === "♭" ? -1 : 0), 0);
    const expected = 12 * (octave + 1) + naturalPitches[letter] + accidental;
    octave += (midi - expected) / 12;
    return text + octave;
  }
  function scaleName(english) { return roots[tonic()] + " " + (english ? scale().labelEn : scale().label); }
  function progress() {
    if (goal() === "ordered") return { value: orderedCount, total: scaleSteps().length };
    if (goal() === "tones") return { value: foundTones.size, total: scale().intervals.length };
    return { value: found.size, total: answers().length };
  }
  const complete = () => { const state = progress(); return state.value === state.total; };

  function stopAudio() {
    soundEpoch++;
    clearTimeout(soundTimer);
    demoPlaying = false;
    preparing = false;
    if (bus) {
      const old = bus; bus = null;
      const now = audio.currentTime;
      old.gain.cancelScheduledValues(now);
      old.gain.setTargetAtTime(0, now, .008);
      setTimeout(() => old.disconnect(), 40);
    }
  }
  async function playNotes(notes, demo) {
    stopAudio();
    const request = soundEpoch, question = questionEpoch;
    if (demo) { demoPlaying = true; preparing = true; renderText(); }
    let unlocked;
    announcing = true;
    try {
      document.dispatchEvent(new CustomEvent("guitar-effects-play"));
      unlocked = unlockAudio();
    } finally { announcing = false; }
    const ready = await unlocked;
    if (request !== soundEpoch || question !== questionEpoch || document.hidden) return;
    if (!ready) {
      stopAudio();
      if (demo) { last = { kind: "audio" }; renderText(); }
      return;
    }
    bus = audio.createGain(); bus.gain.value = .9; bus.connect(audio.destination);
    const start = audio.currentTime + .02;
    notes.forEach((midi,index) => pluck(midi, start + index * .34, .16, bus));
    preparing = false;
    if (demo) renderText();
    soundTimer = setTimeout(() => { if (request !== soundEpoch) return; stopAudio(); if (demo) renderText(); }, (notes.length - 1) * 340 + 950);
  }
  function listenTarget() {
    if (demoPlaying) { stopAudio(); last = { kind: "stopped" }; renderText(); return; }
    if (!isScale()) { void playNotes([target], true); return; }
    const base = orderedBase === null ? 48 + tonic() : orderedBase;
    void playNotes(scaleSteps().map(interval => base + interval), true);
  }
  function clearQuestion() {
    stopAudio(); questionEpoch++;
    found.clear(); foundTones.clear(); orderedBase = null; orderedCount = 0;
    credited = false; revealed = false; last = null;
  }
  function newQuestion() {
    const previous = target;
    clearQuestion();
    const all = cells(), requested = el("note").value === "auto" ? null : Number(el("note").value);
    if (isScale()) {
      const choices = Array.from({length:12},(_,index)=>index).filter(pitch => pitch !== mod(previous));
      target = 48 + (requested === null ? choose(choices) : requested); anchor = null;
    } else if (mode() === "names") {
      const pitches = requested === null ? naturalPitches.filter(pitch => pitch !== mod(previous)) : [requested];
      target = choose(all.filter(cell => pitches.includes(mod(cell.midi)))).midi; anchor = null;
    } else if (mode() === "near") {
      const neighbors = reference => all.filter(cell => cell.key !== reference.key && Math.abs(cell.string-reference.string) <= 1 && Math.abs(cell.fret-reference.fret) <= 3 && mod(cell.midi) !== mod(reference.midi) && (requested === null ? naturalPitches.includes(mod(cell.midi)) : mod(cell.midi) === requested));
      anchor = choose(all.filter(reference => neighbors(reference).length)); target = choose(neighbors(anchor)).midi;
    } else {
      const candidates = all.filter(cell => (requested === null || mod(cell.midi) === requested) && all.some(other => other.key !== cell.key && other.midi === cell.midi));
      const different = candidates.filter(cell => cell.midi !== previous);
      anchor = choose(different.length ? different : candidates); target = anchor.midi;
    }
    render(); el("board").parentElement.scrollLeft = anchor ? Math.max(0, (anchor.fret - 2) * 56) : 0;
  }
  function retry() { clearQuestion(); render(); }
  function guessScale(cell) {
    if (complete()) { last = { kind: "completed" }; return; }
    if (goal() === "ordered") {
      if (orderedBase === null) {
        if (mod(cell.midi) !== tonic()) { last = { kind: "root", cell }; return; }
        const available = new Set(cells().map(item => item.midi));
        if (!scaleSteps().every(interval => available.has(cell.midi + interval))) { last = { kind: "high-root", cell }; return; }
        orderedBase = cell.midi;
      }
      const expected = orderedBase + scaleSteps()[orderedCount];
      if (cell.midi !== expected) { last = { kind: "order", cell }; return; }
      orderedCount++; found.add(cell.key); foundTones.add(mod(cell.midi)); last = { kind: "correct", cell };
    } else if (!matches(cell)) last = { kind: "wrong", cell };
    else {
      const duplicate = goal() === "tones" ? foundTones.has(mod(cell.midi)) : found.has(cell.key);
      found.add(cell.key); foundTones.add(mod(cell.midi)); last = { kind: duplicate ? "duplicate" : "correct", cell };
    }
    if (complete() && !credited && !revealed) { solved++; credited = true; }
  }
  function guess(cell) {
    stopAudio();
    if (isScale()) guessScale(cell);
    else if (isAnchor(cell)) last = { kind: "anchor" };
    else if (!inArea(cell)) last = { kind: "outside" };
    else if (matches(cell)) { found.add(cell.key); last = { kind: "correct", cell }; if (!credited && !revealed) { solved++; credited = true; } }
    else last = { kind: "wrong", cell };
    render(); void playNotes([cell.midi], false);
  }
  function renderProgress() {
    const box = el("scale-progress"); box.hidden = !isScale();
    if (!isScale()) return;
    const state = progress(), info = scale(), ordered = goal() === "ordered", all = answers();
    box.dataset.goal = goal(); box.dataset.complete = String(complete()); box.dataset.found = state.value; box.dataset.total = state.total;
    box.dataset.baseMidi = orderedBase === null ? "" : orderedBase;
    const intervals = ordered ? scaleSteps() : info.intervals;
    const degrees = info.formula.trim().split(/\s+/);
    box.innerHTML = intervals.map((interval,index) => {
      const pitch = mod(tonic() + interval), matching = all.filter(cell => mod(cell.midi) === pitch);
      const count = matching.filter(cell => found.has(cell.key)).length;
      const done = ordered ? index < orderedCount : goal() === "tones" ? foundTones.has(pitch) : count === matching.length;
      const next = ordered && index === orderedCount;
      const degree = index === info.intervals.length ? "1′" : degrees[index];
      const text = done || count > 0 || el("labels").checked || revealed || index === 0 ? (interval === 12 ? roots[tonic()] : scaleNote(index)) : "?";
      let detail = done ? tr("已找到", "Found") : next ? tr("下一音级", "Next degree") : tr("待找", "To find");
      if (goal() === "positions") detail = tr(count + " / " + matching.length + " 个位置", count + " / " + matching.length + " positions");
      return `<div class="finder-progress-note" data-degree="${degree}" data-interval="${interval}" data-found="${done}" data-next="${next}"${next?' aria-current="step"':''}><small>${escape(tr("音级 " + degree, "Degree " + degree))}</small><strong>${escape(text)}</strong><span>${escape(detail)}</span></div>`;
    }).join("");
  }
  function scaleHelp() {
    if (goal() === "ordered") return tr("先选一个能向上弹完一组八度的主音位置，再按音级顺序弹到高八度主音。每一步必须匹配准确音高，可以换弦；弹错不推进。", "Choose a tonic with room for an ascending octave, then play the degrees up to the tonic an octave higher. Match the exact pitch at each step, on any string; mistakes do not advance.");
    if (goal() === "tones") return tr("在任意八度找齐这套音阶的每一种组成音名。同一个音换位置或换八度不会重复增加音名进度。", "Find every different note name in this scale, in any octave. A note in another position or octave does not add another distinct note name.");
    return tr("找齐当前品位范围内，这套音阶的全部位置。每个位置只记一次；显示答案不会替你完成进度。", "Find every position belonging to this scale within the selected fret range. Each position counts once; revealing answers does not complete the progress.");
  }
  function scaleStatus() {
    if (complete()) return credited ? tr("完整音阶挑战已完成！可以换一个主音或音阶再练。", "Complete scale challenge solved! Try another tonic or scale.") : tr("本题已练完；因为查看过答案，本题不计完成题数。", "The exercise is finished. Because answers were revealed, it does not count as a solved question.");
    if (revealed) return tr("绿色标出本题全部音阶位置。你仍可继续练习；查看答案后的本题不计完成题数。", "Green marks all scale positions. You can keep practicing; this revealed question does not count toward solved questions.");
    if (last?.kind === "high-root") return tr("这个主音位置太高，在当前范围弹不完上行一个八度。请换一个低些的主音位置。", "This tonic is too high to finish an ascending octave in the current range. Choose a lower tonic position.");
    if (last?.kind === "root") return tr("先找主音 " + roots[tonic()] + " 作为起点，再依次往上弹。", "Start on the tonic " + roots[tonic()] + ", then work upward in order.");
    if (last?.kind === "order") {
      const expected = orderedBase + scaleSteps()[orderedCount];
      const show = el("labels").checked;
      return show ? tr("这里是 " + pitchName(last.cell.midi) + "；下一步要找 " + pitchName(expected) + "，音高与八度都要一致。", "This is " + pitchName(last.cell.midi) + "; next find " + pitchName(expected) + ", matching pitch and octave.") : tr("这里是 " + pitchName(last.cell.midi) + "，还不是下一音级。按下方标出的顺序继续；可打开音名提示。", "This is " + pitchName(last.cell.midi) + ", not the next degree. Follow the highlighted sequence; note hints are available.");
    }
    if (last?.kind === "duplicate") return tr("这个音已经记过，不会重复加进度。继续找还缺的音或位置。", "This has already been counted. Continue finding the missing notes or positions.");
    if (last?.kind === "wrong") return tr("这里是 " + pitchName(last.cell.midi) + "，不属于本题音阶。再试试。", "This is " + pitchName(last.cell.midi) + ", outside this scale. Try again.");
    if (last?.kind === "correct") return tr("答对了！" + pitchName(last.cell.midi) + " · " + positionIn(last.cell,false) + "。继续找剩余部分。", "Correct! " + pitchName(last.cell.midi) + " · " + positionIn(last.cell,true) + ". Continue with the remaining notes.");
    return tr("本题：" + scaleName(false) + "。先从主音开始理解这套音阶，完成全部进度才算答完。", "Challenge: " + scaleName(true) + ". Use the tonic to work out the scale; finish all progress to solve the question.");
  }
  function renderText() {
    const current = mode(), scaleMode = isScale();
    el("title").textContent = tr("指板找音", "Find notes on the fretboard"); el("mode-label").textContent = tr("玩法", "Exercise");
    const modeLabels = [["同音换位置","Same pitch, new position"],["按音名找音","Find a named note"],["附近找音","Find nearby notes"],["找完整音阶","Find a complete scale"]];
    [...el("mode").options].forEach((option,index)=>option.textContent=tr(...modeLabels[index]));
    el("note-label").textContent = scaleMode ? tr("主音", "Tonic") : tr("目标音名", "Target note"); el("note").options[0].textContent = tr("随机", "Random");
    el("scale-controls").hidden = !scaleMode; el("retry").hidden = !scaleMode; el("exact-control").hidden = current !== "same";
    el("scale-type-label").textContent = tr("音阶", "Scale"); el("scale-goal-label").textContent = tr("目标", "Goal");
    [...el("scale-type").options].forEach(option => { const info = scales[option.value]; option.textContent = tr(info.label,info.labelEn); });
    const goals = [["按顺序弹一个八度","Play an ascending octave"],["找齐组成音名","Find every note name"],["找全范围内的位置","Find every position"]]; [...el("scale-goal").options].forEach((option,index)=>option.textContent=tr(...goals[index]));
    el("help").textContent = scaleMode ? scaleHelp() : current === "names" ? tr("只给音名，例如 C。请在任意八度找出它；绿色记录已经找到的位置。", "Given a note name such as C, find it in any octave. Green marks positions you have found.") : current === "near" ? tr("紫色是参考音。请在参考弦及相邻弦、参考品左右 3 品的亮框范围内，找到指定音名；任意八度均可。", "Purple is the reference. Find the target note in any octave within the outlined area: the reference string and adjacent strings, up to 3 frets either side.") : tr("根据给出的参考位置，找到同一个音的其他位置。取消匹配八度时，同音名也算正确。", "Find another position for the reference note. Turn off octave matching to accept the same note name in any octave.");
    el("exact-label").textContent = tr("匹配相同八度", "Match the octave"); el("range-label").textContent = tr("品位范围", "Fret range"); el("labels-label").textContent = tr("显示音名提示", "Show note hints");
    el("new").textContent = scaleMode ? tr("下一题", "Next challenge") : tr("下一题", "Next note"); el("retry").textContent = tr("重做本题", "Retry this challenge"); el("listen").textContent = demoPlaying ? tr("■ 停止试听", "■ Stop demo") : scaleMode ? tr("▷ 听完整音阶", "▷ Hear the complete scale") : tr("▷ 听目标音", "▷ Hear target"); el("reveal").textContent = tr("显示所有答案", "Reveal all answers");
    el("target").textContent = current === "same" && el("exact").checked ? ordinaryName(target) : note(target);
    el("reference").textContent = scaleMode ? tr("本题音阶：" + scaleName(false) + " · " + scale().formula, "Scale: " + scaleName(true) + " · " + scale().formula) : current === "names" ? tr("本题没有参考位置，试着自己回忆音名分布。", "No reference position this time. Recall where the note appears.") : tr("参考音 " + ordinaryName(anchor.midi) + " · " + positionIn(anchor,false) + " → 找 " + (current === "same" && el("exact").checked ? ordinaryName(target) : note(target)), "Reference " + ordinaryName(anchor.midi) + " · " + positionIn(anchor,true) + " → Find " + (current === "same" && el("exact").checked ? ordinaryName(target) : note(target)));
    if (scaleMode) {
      const state = progress(), unitZh = goal() === "ordered" ? "个音（含高八度主音）" : goal() === "tones" ? "种音名" : "个位置", unitEn = goal() === "ordered" ? "notes, including the octave tonic" : goal() === "tones" ? "different note names" : "positions";
      el("score").textContent = tr("已完成 " + solved + " 题 · 本题进度 " + state.value + " / " + state.total + " " + unitZh, "Completed " + solved + " · Progress " + state.value + " / " + state.total + " " + unitEn);
    } else el("score").textContent = tr("已完成 " + solved + " 题 · 本题找到 " + found.size + " / " + answers().length + " 个位置", "Completed " + solved + " · Found " + found.size + " / " + answers().length + " positions");
    let text = scaleMode ? scaleStatus() : tr("可先试听目标音，再到指板上作答。", "Hear the target if you like, then choose a position.");
    if (!scaleMode) {
      if (revealed) text = tr("绿色标出本题全部答案。", "Green marks every answer to this question.");
      else if (last?.kind === "anchor") text = tr("这是参考位置，请找其他位置。", "That is the reference. Find another position.");
      else if (last?.kind === "outside") text = tr("这个位置在本题范围外，请在亮框内找音。", "That position is outside this question. Search inside the outlined area.");
      else if (last?.cell) {
        const cell=last.cell, correct=last.kind==="correct", zh=(correct?"答对了！":"再试试，这里是 ")+ordinaryName(cell.midi)+" · "+positionIn(cell,false), en=(correct?"Correct! ":"Try again. This is ")+ordinaryName(cell.midi)+" · "+positionIn(cell,true);
        if(correct&&current==="near"){const delta=cell.midi-anchor.midi;text=tr(zh+" 相对参考音"+(delta>=0?"上行":"下行")+Math.abs(delta)+"个半音。",en+" "+(delta>=0?"Up ":"Down ")+Math.abs(delta)+" semitones from the reference.");}else text=tr(zh,en);
      }
    }
    if (demoPlaying) text = preparing ? tr("正在准备试听，可以再点一次停止。", "Preparing audio. Press again to stop.") : scaleMode ? tr("正在试听 " + scaleName(false) + " 的完整上行音阶。", "Playing the complete ascending " + scaleName(true) + " scale.") : tr("正在试听目标音。", "Playing the target note.");
    else if (last?.kind === "audio") text=tr("此浏览器暂时无法播放示范音。", "Audio playback is unavailable in this browser.");
    else if (last?.kind === "stopped") text=tr("试听已停止。", "Demo stopped.");
    el("status").textContent = text;
    el("tip-title").textContent = tr("找音小提示：每一品代表什么？", "Finding notes: what does one fret mean?");
    el("tip-text").textContent = tr("同一根弦往琴桥方向移动 1 品，升高 1 个半音；2 品是全音，12 品是八度。自然音中 E–F、B–C 相隔半音，其余相邻自然音相隔全音。例如 A→B 上行 2 个半音，A→C 上行 3 个半音。", "On one string, move 1 fret toward the bridge to rise a semitone, 2 frets for a whole tone, and 12 for an octave. E–F and B–C are semitones; other neighboring natural notes are whole tones. A→B rises 2 semitones; A→C rises 3.");
    el("theory-link").textContent = scaleMode ? tr("到乐理区看看主音和自然大调 →", "Explore tonics and the major scale →") : tr("到和弦区看看音程与八度 →", "Explore intervals and octaves in the chord section →"); el("theory-link").href = scaleMode ? "#key-theory" : "#chord-theory";
    el("board").parentElement.setAttribute("aria-label", tr("找音指板，可横向滚动", "Note-finding fretboard; scroll horizontally")); renderProgress();
  }
  function render() {
    renderText();
    const board=el("board"), max=Number(el("range").value), scroll=board.parentElement.scrollLeft, focused=board.contains(document.activeElement)?document.activeElement.dataset.position:null;
    board.style.setProperty("--fret-count",max+1); board.style.setProperty("--fret-width","56px"); board.style.minWidth=(31+(max+1)*56)+"px"; board.replaceChildren(); board.append(document.createElement("span"));
    for(let fret=0;fret<=max;fret++){const number=document.createElement("span");number.className="fret-number";number.textContent=fret;board.append(number);}
    for(let string=5;string>=0;string--){
      const label=document.createElement("span");label.className="string-label";label.textContent=(6-string)+note(tuning[string]);board.append(label);
      for(let fret=0;fret<=max;fret++){
        const cell={string,fret,midi:tuning[string]+fret,key:key(string,fret)},button=document.createElement("button"); button.type="button";button.className="fret finder-cell";button.dataset.midi=cell.midi;button.dataset.position=cell.key;button.dataset.string=6-string;button.dataset.fret=fret;button.style.setProperty("--gauge",(1+(5-string)*.21)+"px");
        const reference=isAnchor(cell),correct=found.has(cell.key)||(revealed&&matches(cell)),wrong=last?.cell?.key===cell.key&&["wrong","order","root","high-root"].includes(last.kind);
        button.classList.toggle("finder-anchor",reference);button.classList.toggle("finder-correct",correct);button.classList.toggle("finder-wrong",wrong);button.classList.toggle("finder-near",mode()==="near"&&inArea(cell));button.classList.toggle("finder-outside",mode()==="near"&&!inArea(cell));
        const shown=reference||el("labels").checked||correct||wrong,shownPitch=shown?pitchName(cell.midi):"";
        const suffixZh=reference?" · 参考位置":correct?(found.has(cell.key)?" · 已找到":" · 答案"):"",suffixEn=reference?" · Reference":correct?(found.has(cell.key)?" · Found":" · Answer"):"";
        button.setAttribute("aria-label",tr(positionIn(cell,false)+(shown?" · "+shownPitch:"")+suffixZh,positionIn(cell,true)+(shown?" · "+shownPitch:"")+suffixEn));
        const badge=document.createElement("span");badge.textContent=shown?shownPitch:"·";button.append(badge);button.addEventListener("click",()=>guess(cell));board.append(button);
      }
    }
    board.parentElement.scrollLeft=scroll;if(focused)board.querySelector('[data-position="'+focused+'"]')?.focus({preventScroll:true});
  }
  el("new").addEventListener("click",newQuestion);el("listen").addEventListener("click",listenTarget);
  el("reveal").addEventListener("click",()=>{stopAudio();revealed=true;render();});el("retry").addEventListener("click",retry);
  for(const id of ["mode","note"])el(id).addEventListener("change",newQuestion);
  el("range").addEventListener("change",()=>{if(isScale())retry();else newQuestion();});
  for(const id of ["scale-type","scale-goal"])el(id).addEventListener("change",retry);
  el("exact").addEventListener("change",()=>{stopAudio();found.clear();last=null;revealed=false;render();});el("labels").addEventListener("change",render);
  document.addEventListener("languagechange",render);
  const externalAudio=()=>{if(announcing)return;const wasDemo=demoPlaying;stopAudio();if(wasDemo)renderText();};
  document.addEventListener("guitar-instrument-play",externalAudio);document.addEventListener("guitar-effects-play",externalAudio);
  document.addEventListener("visibilitychange",()=>{if(document.hidden){const wasDemo=demoPlaying;stopAudio();if(wasDemo)renderText();}});window.addEventListener("pagehide",stopAudio);
  try{if(new URL(location.href).searchParams.get("finder")==="scale")el("mode").value="scale";}catch{}
  newQuestion();
})();
