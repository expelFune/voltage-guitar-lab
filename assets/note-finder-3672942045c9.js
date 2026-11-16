"use strict";
(() => {
  const host = document.getElementById('note-finder');
  if (!host) return;
  const trText = (zh,en) => tr(zh,en);
  const name = midi => roots[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  let target, anchor, found = new Set(), solved = 0, credited = false, revealed = false, last = null, epoch = 0;
  host.className = 'section panel note-finder';
  host.innerHTML = `<div class="panel-heading"><div><div class="kicker">FRETBOARD / FIND THE NOTE</div><h2 id="finder-title"></h2></div><strong id="finder-target"></strong></div><p id="finder-help" class="hint"></p><div class="board-controls"><label><input id="finder-exact" type="checkbox" checked><span id="finder-exact-label"></span></label><label><span id="finder-range-label"></span><select id="finder-range"><option value="12">0–12</option><option value="24">0–24</option></select></label><label><input id="finder-labels" type="checkbox"><span id="finder-labels-label"></span></label></div><div class="actions"><button id="finder-new" class="primary" type="button"></button><button id="finder-listen" class="secondary" type="button"></button><button id="finder-reveal" class="secondary" type="button"></button></div><p id="finder-reference" class="finder-reference"></p><div class="board-scroll" tabindex="0"><div id="finder-board" class="fretboard"></div></div><p id="finder-status" role="status"></p><p id="finder-score" class="hint"></p>`;
  const el = id => document.getElementById('finder-' + id);
  const key = (string,fret) => string + ':' + fret;
  const matches = midi => el('exact').checked ? midi === target : midi % 12 === target % 12;
  function cells() {
    const all=[];
    tuning.forEach((open,string)=>{for(let fret=0;fret<=Number(el('range').value);fret++)all.push({string,fret,midi:open+fret,key:key(string,fret)});});
    return all;
  }
  const answers = () => cells().filter(c=>c.key!==anchor.key && matches(c.midi));
  function position(c) {return trText((6-c.string)+' 弦 · '+c.fret+' 品','String '+(6-c.string)+' · Fret '+c.fret);}
  const positionIn = (c,en) => en ? 'String '+(6-c.string)+' · Fret '+c.fret : (6-c.string)+' 弦 · '+c.fret+' 品';
  async function listen(midi) {const request=epoch;if(await unlockAudio() && request===epoch) pluck(midi,audio.currentTime+.01,.18);}
  function newQuestion() {
    ++epoch;
    const all=cells(), candidates=all.filter(c=>all.some(other=>other.key!==c.key && other.midi===c.midi));
    const choices=candidates.filter(c=>c.midi!==target);
    anchor=(choices.length?choices:candidates)[Math.floor(Math.random()*(choices.length||candidates.length))];
    target=anchor.midi;found=new Set();credited=false;revealed=false;last=null;render();el('board').parentElement.scrollLeft=Math.max(0,(anchor.fret-2)*56);
  }
  function guess(c) {
    if(c.key===anchor.key){last={kind:'anchor'};renderText();void listen(c.midi);return;}
    if(matches(c.midi)) {
      found.add(c.key);last={kind:'correct',cell:c};
      if(!credited&&!revealed){solved++;credited=true;}
    } else last={kind:'wrong',cell:c};
    render();void listen(c.midi);
  }
  function renderText() {
    el('title').textContent=trText('指板找音：同一个音，还能在哪弹？','Find the note: where else can you play it?');
    el('help').textContent=trText('根据给出的音和参考位置，在下面指板找到另一个位置。默认隐藏音名，横滑可浏览高把位。','Use the target note and reference position to find another position below. Note labels are hidden by default; swipe to explore higher frets.');
    el('exact-label').textContent=trText('匹配相同八度','Match the octave');el('range-label').textContent=trText('品位范围','Fret range');el('labels-label').textContent=trText('显示音名提示','Show note hints');
    el('new').textContent=trText('下一题','Next note');el('listen').textContent=trText('▷ 听目标音','▷ Hear target');el('reveal').textContent=trText('显示所有答案','Reveal all answers');
    el('target').textContent=el('exact').checked?name(target):roots[target%12];
    el('reference').textContent=trText('参考位置：'+name(target)+' · '+positionIn(anchor,false)+' · 紫色是已知位置，请找其他位置。','Reference: '+name(target)+' · '+positionIn(anchor,true)+' · Purple marks the reference; find another position.');
    el('score').textContent=trText('已完成 '+solved+' 题 · 本题找到 '+found.size+' / '+answers().length+' 个位置','Completed '+solved+' · Found '+found.size+' / '+answers().length+' positions');
    let text=trText('点目标音试听，再到指板上作答。','Hear the target, then choose a position on the fretboard.');
    if(revealed)text=trText('绿色标出所有答案；紫色是参考位置。','Green marks every answer; purple marks the reference.');
    else if(last?.kind==='anchor')text=trText('这是给出的参考位置，试试另一根弦。','That is the reference position. Try another string.');
    else if(last?.kind==='correct')text=trText('答对了！'+name(last.cell.midi)+' · '+positionIn(last.cell,false),'Correct! '+name(last.cell.midi)+' · '+positionIn(last.cell,true));
    else if(last?.kind==='wrong')text=trText('再试试，这里是 '+name(last.cell.midi)+' · '+positionIn(last.cell,false),'Try again. This is '+name(last.cell.midi)+' · '+positionIn(last.cell,true));
    el('status').textContent=text;
    el('board').parentElement.setAttribute('aria-label',trText('找音指板，可横向滚动','Note-finding fretboard; scroll horizontally'));
  }
  function render() {
    renderText();const board=el('board'), max=Number(el('range').value), scroll=board.parentElement.scrollLeft;
    board.style.setProperty('--fret-count',max+1);board.style.setProperty('--fret-width','56px');board.replaceChildren();
    board.append(document.createElement('span'));
    for(let fret=0;fret<=max;fret++){const n=document.createElement('span');n.className='fret-number';n.textContent=fret;board.append(n);}
    for(let string=5;string>=0;string--){const label=document.createElement('span');label.className='string-label';label.textContent=(6-string)+roots[tuning[string]%12];board.append(label);
      for(let fret=0;fret<=max;fret++){const c={string,fret,midi:tuning[string]+fret,key:key(string,fret)}, button=document.createElement('button');button.type='button';button.className='fret finder-cell';button.dataset.midi=c.midi;button.dataset.position=c.key;
        const reference=c.key===anchor.key, correct=found.has(c.key)||(revealed&&!reference&&matches(c.midi));
        button.classList.toggle('finder-anchor',reference);button.classList.toggle('finder-correct',correct);button.classList.toggle('finder-wrong',last?.kind==='wrong'&&last.cell.key===c.key);
        button.setAttribute('aria-label',position(c)+(reference?' · '+trText('参考位置','Reference'):''));const badge=document.createElement('span');badge.textContent=reference?name(c.midi):(el('labels').checked||correct)?name(c.midi):'·';button.append(badge);button.addEventListener('click',()=>guess(c));board.append(button);
      }
    }board.parentElement.scrollLeft=scroll;
  }
  el('new').addEventListener('click',newQuestion);el('listen').addEventListener('click',()=>void listen(target));
  el('reveal').addEventListener('click',()=>{revealed=true;render();});
  el('range').addEventListener('change',newQuestion);el('exact').addEventListener('change',()=>{found.clear();last=null;revealed=false;render();});el('labels').addEventListener('change',render);
  document.addEventListener('languagechange',render);newQuestion();
})();
