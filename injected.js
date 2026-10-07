/* injected.js — runs in the page's MAIN world.
 * Defeats sites that use addEventListener('contextmenu'/'copy'/..., preventDefault)
 * by intercepting addEventListener and neutering blockers.
 */
(function () {
  'use strict';

  const BLOCKED_TYPES = new Set([
    'contextmenu', 'copy', 'cut', 'paste',
    'selectstart', 'select', 'dragstart', 'beforecopy'
  ]);

  // Keep references to native functions before page scripts can tamper with them.
  const NativeEventTarget_add = EventTarget.prototype.addEventListener;
  const NativeEventTarget_remove = EventTarget.prototype.removeEventListener;

  // Wrap handler: ignore preventDefault() for protected events so the
  // browser menu / clipboard action still happens.
  function unblockWrapper(handler) {
    return function (e) {
      if (e && BLOCKED_TYPES.has(e.type)) {
        try {
          // Neutralize preventDefault for this dispatch only.
          e.preventDefault = function () {};
          // Don't let the page kill propagation to our isolated-world listener.
          const origStopProp = e.stopPropagation;
          const origStopImm = e.stopImmediatePropagation;
          e.stopPropagation = function () {};
          e.stopImmediatePropagation = function () {};
          const r = handler.call(this, e);
          e.stopPropagation = origStopProp;
          e.stopImmediatePropagation = origStopImm;
          return r;
        } catch (err) {
          return handler.call(this, e);
        }
      }
      return handler.call(this, e);
    };
  }

  const handlerMap = new WeakMap(); // original -> wrapped

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    try {
      if (typeof type === 'string' && BLOCKED_TYPES.has(type.toLowerCase()) && typeof listener === 'function') {
        let wrapped = handlerMap.get(listener);
        if (!wrapped) {
          wrapped = unblockWrapper(listener);
          handlerMap.set(listener, wrapped);
        }
        // Attach wrapped version — page's preventDefault calls become no-ops.
        return NativeEventTarget_add.call(this, type, wrapped, options);
      }
    } catch {}
    return NativeEventTarget_add.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    try {
      const wrapped = (typeof listener === 'function') ? handlerMap.get(listener) : null;
      if (wrapped) return NativeEventTarget_remove.call(this, type, wrapped, options);
    } catch {}
    return NativeEventTarget_remove.call(this, type, listener, options);
  };

  // Neutralize `oncontextmenu = ...` style property assignments on any element.
  function neutralizeOnProps(obj, prop) {
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: true,
        get() { return null; },
        set(_v) { /* ignore — site cannot lock right-click this way */ }
      });
    } catch {}
  }
  ['oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'onselectstart', 'ondragstart'].forEach(p => {
    try { neutralizeOnProps(Element.prototype, p); } catch {}
    try { neutralizeOnProps(Document.prototype, p); } catch {}
  });
  try { neutralizeOnProps(Window.prototype, 'oncontextmenu'); } catch {}

  // Clear any handlers the page registered before we ran.
  try {
    ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart'].forEach(t => {
      try { window['on' + t] = null; } catch {}
      try { document['on' + t] = null; } catch {}
    });
  } catch {}
})();
