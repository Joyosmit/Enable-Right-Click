/* content.js — ISOLATED world. Runs at document_start on all pages.
 * 1. Checks if extension is enabled (chrome.storage, default ON)
 * 2. Injects injected.js into the page's MAIN world to defeat JS-based blockers
 * 3. Cleans inline handlers + CSS that disable selection / right-click
 */

(async () => {
  const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
  if (!enabled) return;

  // ---- 1. Inject MAIN-world script (can intercept page's own listeners) ----
  function injectMainWorld() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('injected.js');
      s.async = false;
      (document.documentElement || document.head || document).appendChild(s);
      s.remove();
    } catch (e) { /* CSP may block — isolated-world fallback below still helps */ }
  }
  injectMainWorld();

  // ---- 2. Kill inline on* handlers (oncontextmenu="return false" etc.) ----
  const BLOCKED_ATTRS = [
    'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'onselectstart',
    'ondragstart', 'onmousedown', 'onmouseup', 'onselect', 'onkeydown', 'onkeyup'
  ];
  function stripInlineHandlers(root = document) {
    try {
      BLOCKED_ATTRS.forEach(attr => {
        if (root[attr] !== undefined && root[attr] !== null) {
          try { root[attr] = null; } catch {}
          try { root.removeAttribute(attr); } catch {}
        }
      });
      const els = root.querySelectorAll
        ? root.querySelectorAll(BLOCKED_ATTRS.map(a => `[${a}]`).join(','))
        : [];
      els.forEach(el => BLOCKED_ATTRS.forEach(a => el.removeAttribute(a)));
    } catch {}
  }

  // ---- 3. Force-enable text selection / pointer events via CSS ----
  const style = document.createElement('style');
  style.id = 'rce-unlock-style';
  style.textContent = `
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
    }
    input, textarea { -webkit-user-select: text !important; user-select: text !important; }
  `;
  function ensureStyle() {
    if (!document.getElementById('rce-unlock-style')) {
      (document.head || document.documentElement).appendChild(style);
    }
  }

  // ---- 4. Re-allow contextmenu/copy/cut/paste in ISOLATED world ----
  // Capture-phase listeners that re-fire a clean event after sites call preventDefault/stopPropagation.
  const PROTECTED = ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart', 'mousedown', 'mouseup', 'select'];
  PROTECTED.forEach(type => {
    document.addEventListener(type, (e) => {
      e.stopImmediatePropagation();
      // Don't preventDefault — we WANT the default menu / clipboard action.
      return true;
    }, { capture: true, passive: true });
  });

  // Unblock inputs commonly locked via readonly/disabled tricks? No — don't touch semantics.
  // Just make sure document-level blocking flags are cleared.
  function unlockDoc() {
    try {
      document.oncontextmenu = null;
      document.onselectstart = null;
      document.ondragstart = null;
      document.oncopy = null;
      document.oncut = null;
      document.onpaste = null;
      document.onmousedown = null;
      document.onmouseup = null;
      if (document.body) {
        document.body.oncontextmenu = null;
        document.body.onselectstart = null;
        document.body.oncopy = null;
        document.body.oncut = null;
        document.body.onpaste = null;
      }
    } catch {}
  }

  stripInlineHandlers(document);
  unlockDoc();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { ensureStyle(); stripInlineHandlers(document); unlockDoc(); });
  } else {
    ensureStyle();
  }
  window.addEventListener('load', () => { ensureStyle(); stripInlineHandlers(document); unlockDoc(); });

  // ---- 5. Watch for sites that re-apply locks dynamically ----
  const obs = new MutationObserver((mutations) => {
    let needsStrip = false;
    for (const m of mutations) {
      if (m.type === 'attributes' && BLOCKED_ATTRS.includes(m.attributeName)) { needsStrip = true; break; }
      if (m.addedNodes && m.addedNodes.length) { needsStrip = true; break; }
    }
    if (needsStrip) stripInlineHandlers(document);
    ensureStyle();
  });
  function startObs() {
    try {
      obs.observe(document.documentElement || document, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: BLOCKED_ATTRS
      });
    } catch {}
  }
  if (document.documentElement) startObs();
  else document.addEventListener('DOMContentLoaded', startObs);

  // ---- 6. React to popup toggle without reload ----
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.enabled && changes.enabled.newValue === false) {
      location.reload();
    }
  });
})();
