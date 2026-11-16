"use strict";
(() => {
const parts = [
  [
    "琴头与弦钮",
    "Headstock & tuners",
    "弦钮用来调节琴弦张力，从而调音。粗弦是第 6 弦，细弦是第 1 弦；先记住标准调弦 E A D G B E。",
    "Tuners change string tension to tune the guitar. The thickest string is 6 and the thinnest is 1. Standard tuning, thick to thin, is E A D G B E."
  ],
  [
    "琴颈与品丝",
    "Neck & frets",
    "手指按在两根金属品丝之间，靠近目标品丝的琴头一侧。往琴桥移动一品，音高升一个半音。",
    "Fret between the metal fret wires, close to the target fret on its headstock side. Moving one fret toward the bridge raises the pitch by one semitone."
  ],
  [
    "拾音器与切换",
    "Pickups & selector",
    "拾音器把钢弦的振动转成电信号。切换开关选择拾音器；靠琴桥通常更亮，靠琴颈通常更圆润。",
    "Pickups convert steel-string vibrations into an electrical signal. The selector chooses the pickup: bridge positions usually sound brighter, neck positions rounder."
  ],
  [
    "琴桥",
    "Bridge",
    "琴桥固定并支撑琴弦的一端。有些琴桥带摇把；初学先保持原来的设定，调好音再弹。",
    "The bridge anchors and supports one end of the strings. Some bridges have a vibrato arm. Start with the existing setup, tune up, and play."
  ],
  [
    "音量与音色旋钮",
    "Volume & tone knobs",
    "琴上的 Volume 控制输出大小，Tone 通常用来削减高频。先用较亮、清楚的声音，便于听清每根弦。",
    "The guitar’s Volume controls output level; Tone usually rolls off high frequencies. Start with a clear, bright sound so you can hear each string."
  ],
  [
    "输出插孔",
    "Output jack",
    "乐器线的一端插这里，另一端接音箱的 INPUT。被动电吉他即使不装电池也能发声；主动电路的型号可能需要电池。",
    "Plug one end of an instrument cable here and the other into the amp’s INPUT. Passive guitars do not need batteries; models with active electronics may need one."
  ]
];
document.querySelectorAll("[data-guitar-part]").forEach(button => button.addEventListener("click", () => {
const part=parts[Number(button.dataset.guitarPart)];
document.querySelectorAll("[data-guitar-part]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
document.getElementById("basics-part-title").textContent=tr(part[0],part[1]);
document.getElementById("basics-part-text").textContent=tr(part[2],part[3]);
}));
const header=document.querySelector(".site-header");
const updateHeader=()=>document.documentElement.style.setProperty("--site-header-height",header.offsetHeight+"px");
updateHeader();
if(typeof ResizeObserver!=="undefined")new ResizeObserver(updateHeader).observe(header);
})();

(() => {
  const buttons = document.querySelectorAll('[data-effects-route]');
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('.basics-route').forEach(panel => {
      panel.hidden = panel.id !== 'effects-route-' + button.dataset.effectsRoute;
    });
  }));
  const openEffects = () => {
    if (location.hash === '#effects') document.getElementById('effects').open = true;
  };
  openEffects();
  window.addEventListener('hashchange', openEffects);
})();
