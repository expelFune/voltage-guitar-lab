"use strict";
(() => {
  const host=document.getElementById('note-finder');if(!host)return;
  const note=midi=>roots[((midi%12)+12)%12], name=midi=>note(midi)+(Math.floor(midi/12)-1);
  const choose=list=>list[Math.floor(Math.random()*list.length)], natural=[0,2,4,5,7,9,11];
  let target,anchor,found=new Set(),solved=0,credited=false,revealed=false,last=null,epoch=0;
  host.className='section panel note-finder';
  host.innerHTML=`<div class="panel-heading"><div><div class="kicker">FRETBOARD / FIND THE NOTE</div><h2 id="finder-title"></h2></div><strong id="finder-target"></strong></div><div class="board-controls"><label><span id="finder-mode-label"></span><select id="finder-mode"><option value="same"></option><option value="names"></option><option value="near"></option></select></label><label><span id="finder-note-label"></span><select id="finder-note"><option value="auto"></option>${roots.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label id="finder-exact-control"><input id="finder-exact" type="checkbox" checked><span id="finder-exact-label"></span></label><label><span id="finder-range-label"></span><select id="finder-range"><option value="12">0–12</option><option value="24">0–24</option></select></label><label><input id="finder-labels" type="checkbox"><span id="finder-labels-label"></span></label></div><p id="finder-help" class="hint"></p><div class="actions"><button id="finder-new" class="primary" type="button"></button><button id="finder-listen" class="secondary" type="button"></button><button id="finder-reveal" class="secondary" type="button"></button></div><p id="finder-reference" class="finder-reference"></p><div class="board-scroll" tabindex="0"><div id="finder-board" class="fretboard"></div></div><p id="finder-status" role="status"></p><p id="finder-score" class="hint"></p><details class="finder-tip"><summary id="finder-tip-title"></summary><p id="finder-tip-text"></p><a href="#chord-theory" id="finder-theory-link"></a></details>`;
  const el=id=>document.getElementById('finder-'+id),mode=()=>el('mode').value,key=(string,fret)=>string+':'+fret;
  const positionIn=(c,en)=>en?'String '+(6-c.string)+' · Fret '+c.fret:(6-c.string)+' 弦 · '+c.fret+' 品';
  function cells(){const all=[];tuning.forEach((open,string)=>{for(let fret=0;fret<=Number(el('range').value);fret++)all.push({string,fret,midi:open+fret,key:key(string,fret)});});return all;}
  const inArea=c=>mode()!=='near'||(Math.abs(c.string-anchor.string)<=1&&Math.abs(c.fret-anchor.fret)<=3);
  const isAnchor=c=>mode()!=='names'&&c.key===anchor.key;
  const matches=c=>inArea(c)&&!isAnchor(c)&&(mode()==='same'&&el('exact').checked?c.midi===target:c.midi%12===target%12);
  const answers=()=>cells().filter(matches);
  async function listen(midi){const request=epoch;if(await unlockAudio()&&request===epoch)pluck(midi,audio.currentTime+.01,.18);}
  function newQuestion(){
    ++epoch;const all=cells(),requested=el('note').value==='auto'?null:Number(el('note').value);
    if(mode()==='names'){
      const pitches=requested===null?natural.filter(p=>p!==target%12):[requested];target=choose(all.filter(c=>pitches.includes(c.midi%12))).midi;anchor=null;
    }else if(mode()==='near'){
      const neighbors=a=>all.filter(c=>c.key!==a.key&&Math.abs(c.string-a.string)<=1&&Math.abs(c.fret-a.fret)<=3&&c.midi%12!==a.midi%12&&(requested===null?natural.includes(c.midi%12):c.midi%12===requested));
      anchor=choose(all.filter(a=>neighbors(a).length));target=choose(neighbors(anchor)).midi;
    }else{
      const candidates=all.filter(c=>(requested===null||c.midi%12===requested)&&all.some(other=>other.key!==c.key&&other.midi===c.midi));const different=candidates.filter(c=>c.midi!==target);anchor=choose(different.length?different:candidates);target=anchor.midi;
    }
    found.clear();credited=false;revealed=false;last=null;render();el('board').parentElement.scrollLeft=anchor?Math.max(0,(anchor.fret-2)*56):0;
  }
  function guess(c){
    if(isAnchor(c))last={kind:'anchor'};else if(!inArea(c))last={kind:'outside'};
    else if(matches(c)){found.add(c.key);last={kind:'correct',cell:c};if(!credited&&!revealed){solved++;credited=true;}}else last={kind:'wrong',cell:c};
    render();void listen(c.midi);
  }
  function renderText(){
    const current=mode();el('title').textContent=tr('指板找音','Find notes on the fretboard');el('mode-label').textContent=tr('玩法','Exercise');
    const labels=[['同音换位置','Same pitch, new position'],['按音名找音','Find a named note'],['附近找音','Find nearby notes']];[...el('mode').options].forEach((o,i)=>o.textContent=tr(...labels[i]));
    el('note-label').textContent=tr('目标音名','Target note');el('note').options[0].textContent=tr('随机','Random');
    el('help').textContent=current==='names'?tr('只给音名，例如 C。请在任意八度找出它；绿色记录已经找到的位置。','Given a note name such as C, find it in any octave. Green marks positions you have found.'):current==='near'?tr('紫色是参考音。请在参考弦及相邻弦、参考品左右 3 品的亮框范围内，找到指定音名；任意八度均可。','Purple is the reference. Find the target note in any octave within the outlined area: the reference string and adjacent strings, up to 3 frets either side.'):tr('根据给出的参考位置，找到同一个音的其他位置。取消匹配八度时，同音名也算正确。','Find another position for the reference note. Turn off octave matching to accept the same note name in any octave.');
    el('exact-control').hidden=current!=='same';el('exact-label').textContent=tr('匹配相同八度','Match the octave');el('range-label').textContent=tr('品位范围','Fret range');el('labels-label').textContent=tr('显示音名提示','Show note hints');
    el('new').textContent=tr('下一题','Next note');el('listen').textContent=tr('▷ 听目标音','▷ Hear target');el('reveal').textContent=tr('显示所有答案','Reveal all answers');el('target').textContent=current==='same'&&el('exact').checked?name(target):note(target);
    el('reference').textContent=current==='names'?tr('本题没有参考位置，试着自己回忆音名分布。','No reference position this time. Recall where the note appears.'):tr('参考音 '+name(anchor.midi)+' · '+positionIn(anchor,false)+' → 找 '+(current==='same'&&el('exact').checked?name(target):note(target)),'Reference '+name(anchor.midi)+' · '+positionIn(anchor,true)+' → Find '+(current==='same'&&el('exact').checked?name(target):note(target)));
    el('score').textContent=tr('已完成 '+solved+' 题 · 本题找到 '+found.size+' / '+answers().length+' 个位置','Completed '+solved+' · Found '+found.size+' / '+answers().length+' positions');
    let text=tr('可先试听目标音，再到指板上作答。','Hear the target if you like, then choose a position.');
    if(revealed)text=tr('绿色标出本题全部答案。','Green marks every answer to this question.');else if(last?.kind==='anchor')text=tr('这是参考位置，请找其他位置。','That is the reference. Find another position.');else if(last?.kind==='outside')text=tr('这个位置在本题范围外，请在亮框内找音。','That position is outside this question. Search inside the outlined area.');
    else if(last?.cell){const c=last.cell,correct=last.kind==='correct';const zh=(correct?'答对了！':'再试试，这里是 ')+name(c.midi)+' · '+positionIn(c,false),en=(correct?'Correct! ':'Try again. This is ')+name(c.midi)+' · '+positionIn(c,true);if(correct&&current==='near'){const d=c.midi-anchor.midi;text=tr(zh+' 相对参考音'+(d>=0?'上行':'下行')+Math.abs(d)+'个半音。',en+' '+(d>=0?'Up ':'Down ')+Math.abs(d)+' semitones from the reference.');}else text=tr(zh,en);}
    el('status').textContent=text;
    el('tip-title').textContent=tr('找音小提示：每一品代表什么？','Finding notes: what does one fret mean?');
    el('tip-text').textContent=tr('同一根弦往琴桥方向移动 1 品，升高 1 个半音；2 品是全音，12 品是八度。自然音中 E–F、B–C 相隔半音，其余相邻自然音相隔全音。例如 A→B 上行 2 个半音，A→C 上行 3 个半音。','On one string, move 1 fret toward the bridge to rise a semitone, 2 frets for a whole tone, and 12 for an octave. E–F and B–C are semitones; other neighboring natural notes are whole tones. A→B rises 2 semitones; A→C rises 3.');
    el('theory-link').textContent=tr('到和弦区看看音程与八度 →','Explore intervals and octaves in the chord section →');el('board').parentElement.setAttribute('aria-label',tr('找音指板，可横向滚动','Note-finding fretboard; scroll horizontally'));
  }
  function render(){
    renderText();const board=el('board'),max=Number(el('range').value),scroll=board.parentElement.scrollLeft,focused=board.contains(document.activeElement)?document.activeElement.dataset.position:null;
    board.style.setProperty('--fret-count',max+1);board.style.setProperty('--fret-width','56px');board.style.minWidth=(31+(max+1)*56)+"px";board.replaceChildren();board.append(document.createElement('span'));
    for(let fret=0;fret<=max;fret++){const n=document.createElement('span');n.className='fret-number';n.textContent=fret;board.append(n);}
    for(let string=5;string>=0;string--){const label=document.createElement('span');label.className='string-label';label.textContent=(6-string)+note(tuning[string]);board.append(label);
      for(let fret=0;fret<=max;fret++){const c={string,fret,midi:tuning[string]+fret,key:key(string,fret)},button=document.createElement('button');button.type='button';button.className='fret finder-cell';button.dataset.midi=c.midi;button.dataset.position=c.key;button.dataset.string=6-string;button.dataset.fret=fret;button.style.setProperty("--gauge",(1+(5-string)*.21)+"px");
        const reference=isAnchor(c),correct=found.has(c.key)||(revealed&&matches(c));button.classList.toggle('finder-anchor',reference);button.classList.toggle('finder-correct',correct);button.classList.toggle('finder-wrong',last?.kind==='wrong'&&last.cell.key===c.key);button.classList.toggle('finder-near',mode()==='near'&&inArea(c));button.classList.toggle('finder-outside',mode()==='near'&&!inArea(c));
        button.setAttribute('aria-label',tr(positionIn(c,false)+(reference?' · 参考位置':''),positionIn(c,true)+(reference?' · Reference':'')));const badge=document.createElement('span');badge.textContent=reference?name(c.midi):(el('labels').checked||correct)?name(c.midi):'·';button.append(badge);button.addEventListener('click',()=>guess(c));board.append(button);
      }
    }board.parentElement.scrollLeft=scroll;if(focused)board.querySelector('[data-position="'+focused+'"]')?.focus({preventScroll:true});
  }
  el('new').addEventListener('click',newQuestion);el('listen').addEventListener('click',()=>void listen(target));el('reveal').addEventListener('click',()=>{revealed=true;render();});for(const id of ['mode','note','range'])el(id).addEventListener('change',newQuestion);el('exact').addEventListener('change',()=>{found.clear();last=null;revealed=false;render();});el('labels').addEventListener('change',render);document.addEventListener('languagechange',render);newQuestion();
})();
