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
    "照片中的 LP 有两个双线圈拾音器，把钢弦的振动转成电信号。琴身左上方的开关用来切换拾音器；靠琴桥通常更亮，靠琴颈通常更圆润。",
    "The pictured LP has two humbucking pickups, which convert steel-string vibrations into an electrical signal. The switch at the upper left of the body selects the pickups: bridge sounds are usually brighter, neck sounds rounder."
  ],
  [
    "琴桥与尾件",
    "Bridge & tailpiece",
    "照片中靠近下方拾音器的金属横条是固定式琴桥，支撑琴弦；再往琴身底部的横条是尾件，用来固定弦尾。这把琴没有摇把。",
    "The metal bar just below the lower pickup is the fixed bridge, which supports the strings. The next bar toward the bottom of the body is the tailpiece, which anchors their ends. This guitar has no vibrato arm."
  ],
  [
    "音量与音色旋钮",
    "Volume & tone knobs",
    "这把 LP 的琴身右下方有四个旋钮，分别为两个拾音器调节音量与音色。Volume 控制输出大小，Tone 通常用来削减高频。不同琴型的旋钮布局会有差别。",
    "The four knobs at the lower right of this LP control volume and tone for its two pickups. Volume adjusts output level; Tone usually rolls off high frequencies. Control layouts vary between guitar models."
  ],
  [
    "输出插孔",
    "Output jack",
    "这类 LP 的输出插孔在琴身侧面，正面照片里不明显。乐器线的一端插这里，另一端接音箱的 INPUT。被动电吉他不需要电池；主动电路的型号可能需要电池。",
    "On this type of LP, the output jack is on the side of the body and is not clearly visible in this front view. Connect it to the amp’s INPUT with an instrument cable. Passive guitars do not need batteries; active electronics may need one."
  ]
];
document.querySelectorAll("[data-guitar-part]").forEach(button => button.addEventListener("click", () => {
const part=parts[Number(button.dataset.guitarPart)];
document.querySelectorAll("[data-guitar-part]").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.guitarPart===button.dataset.guitarPart)));
document.querySelectorAll("[data-guitar-marker]").forEach(item=>item.classList.toggle("is-active",item.dataset.guitarMarker===button.dataset.guitarPart));
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
  const openLinkedTopic = () => {
    const topic = document.getElementById(location.hash.slice(1));
    if (topic?.matches('details.basics-topic')) topic.open = true;
  };
  openLinkedTopic();
  window.addEventListener('hashchange', openLinkedTopic);
})();
