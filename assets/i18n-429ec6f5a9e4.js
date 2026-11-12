"use strict";

(() => {
  const storageKey = "voltage-guitar-language";
  const staticPairs = new Map(Object.entries(window.STATIC_TRANSLATIONS || {}));
  const staticReverse = new Map([...staticPairs].map(([zh, en]) => [en, zh]));
  const dynamicPairs = new Map(), dynamicReverse = new Map();
  const textRecords = new WeakMap(), attributeRecords = new WeakMap();
  const attributes = ["aria-label", "aria-valuetext", "title", "placeholder", "alt", "content"];
  let language = "zh";
  try {
    const requested = new URL(location.href).searchParams.get("lang");
    language = ["zh", "en"].includes(requested) ? requested : localStorage.getItem(storageKey) === "en" ? "en" : "zh";
    localStorage.setItem(storageKey, language);
  } catch { /* Language switching also works when storage is unavailable. */ }

  function remember(zh, en) {
    zh = zh.trim(); en = en.trim();
    if (zh === en) return;
    if (dynamicPairs.has(zh)) dynamicReverse.delete(dynamicPairs.get(zh));
    dynamicPairs.set(zh, en);
    dynamicReverse.set(en, zh);
    // Live tuner readings contain continuously changing numbers.
    // Existing DOM records retain both languages even after a pair is evicted.
    if (dynamicPairs.size > 4096) {
      const oldest = dynamicPairs.keys().next().value;
      dynamicReverse.delete(dynamicPairs.get(oldest));
      dynamicPairs.delete(oldest);
    }
  }

  function pairFor(value) {
    const leading = value.match(/^\s*/)[0], trailing = value.match(/\s*$/)[0];
    const core = value.trim();
    if (!core) return { zh: value, en: value };
    const zh = dynamicReverse.get(core) ?? staticReverse.get(core) ?? core;
    const en = dynamicPairs.get(zh) ?? staticPairs.get(zh) ?? zh;
    return { zh: leading + zh + trailing, en: leading + en + trailing };
  }

  function tr(zh, en) {
    zh = String(zh); en = String(en);
    remember(zh, en);
    return language === "en" ? en : zh;
  }
  tr.text = (value) => pairFor(String(value))[language];
  tr.language = () => language;
  window.tr = tr;

  function localizeText(node) {
    if (!node.parentElement || node.parentElement.closest("script,style,textarea,code,pre,[data-no-i18n]")) return;
    const value = node.nodeValue;
    let record = textRecords.get(node);
    if (!record || record.last !== value) record = pairFor(value);
    const translated = record[language];
    record.last = translated;
    textRecords.set(node, record);
    if (value !== translated) node.nodeValue = translated;
  }

  function localizeAttributes(element) {
    if (element.closest("[data-no-i18n]") || ["SCRIPT", "STYLE"].includes(element.tagName)) return;
    let records = attributeRecords.get(element);
    if (!records) { records = {}; attributeRecords.set(element, records); }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue;
      const value = element.getAttribute(name);
      let record = records[name];
      if (!record || record.last !== value) record = pairFor(value);
      record.last = record[language];
      records[name] = record;
      if (value !== record.last) element.setAttribute(name, record.last);
    }
  }

  function localizeTree(root) {
    if (root.nodeType === Node.TEXT_NODE) { localizeText(root); return; }
    if (root.nodeType === Node.ELEMENT_NODE) localizeAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) localizeText(node);
      else localizeAttributes(node);
    }
  }

  function updateLanguageControls() {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
  }

  function setLanguage(next) {
    if (!["zh", "en"].includes(next)) return;
    language = next;
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the session choice. */ }
    try {
      const url = new URL(location.href);
      url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
    } catch { /* Local file previews may restrict history updates. */ }
    updateLanguageControls();
    localizeTree(document.documentElement);
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
  }
  window.I18n = {
    setLanguage,
    get language() { return language; },
    refresh: () => localizeTree(document.documentElement),
    addTranslations(pairs) {
      for (const [zh, en] of Object.entries(pairs)) { staticPairs.set(zh, en); staticReverse.set(en, zh); }
    }
  };

  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
  updateLanguageControls();
  localizeTree(document.documentElement);
  new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === "characterData") localizeText(change.target);
      else if (change.type === "attributes") localizeAttributes(change.target);
      else for (const node of change.addedNodes) localizeTree(node);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
})();
